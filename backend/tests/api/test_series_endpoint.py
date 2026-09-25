"""Tests del endpoint GET /series (TASK-021, TASK-044, RF-008/RX-002/RNF-008).

DoD: devuelve la serie OHLC del rango/timeframe y coincide con la consulta
directa a DuckDB. Se cubre el contrato del endpoint con un stub de
``SeriesQuery``, la coincidencia con una integración real contra
Parquet + DuckDB (fixture marzo 2026), incluyendo pre-resampling (TASK-017), y
el wiring por defecto con la caché in-memory de TASK-044.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from fxtrad.api import create_app
from fxtrad.contracts.ohlc import Candle, Timeframe
from fxtrad.pipeline.persist import build_persister
from fxtrad.pipeline.resample import resample_ohlc
from fxtrad.storage import (
    CachedSeriesQuery,
    InvalidRangeError,
    InvalidTimeframeError,
    ParquetSeriesStore,
    SeriesQuery,
)

_BASE_TIME = 1772409600  # 2026-03-02T00:00:00Z (lunes, fixture marzo 2026)


class _FakeQueue:
    """Stub mínimo de DownloadQueue para construir la aplicación."""

    def enqueue(self, request: object) -> str:
        return "fake-task"


class _FakeSeriesQuery:
    """Stub de SeriesQuery que devuelve velas fijas o reproduce un error."""

    def __init__(self, candles: list[Candle] | None = None, error: Exception | None = None) -> None:
        self._candles = candles or []
        self._error = error
        self.requests: list[tuple[str, Timeframe, int | None, int | None]] = []

    def read(
        self,
        symbol: str,
        timeframe: Timeframe = "1s",
        start: int | None = None,
        end: int | None = None,
    ) -> list[Candle]:
        self.requests.append((symbol, timeframe, start, end))
        if self._error is not None:
            raise self._error
        return self._candles


def _second_candles(start: int, count: int) -> list[Candle]:
    """Serie 1s con OHLC determinista: open=i, high=i+1, low=i, close=i."""
    return [
        Candle(time=start + i, open=float(i), high=float(i + 1), low=float(i), close=float(i))
        for i in range(count)
    ]


def _dump(client: TestClient, **params: object) -> object:
    """Realiza un GET /series con los parámetros dados y devuelve el JSON."""
    response = client.get("/series", params=params)
    assert response.status_code == 200
    return response.json()


class TestSeriesContract:
    """Contrato del endpoint: responde OhlcResponse y delega en SeriesQuery."""

    @pytest.fixture()
    def client(self) -> TestClient:
        query = _FakeSeriesQuery(_second_candles(_BASE_TIME, 3))
        return TestClient(create_app(_FakeQueue(), series_query=query))  # type: ignore[arg-type]

    def test_returns_ohlc_response_with_candles(self, client: TestClient) -> None:
        body = _dump(client, symbol="EURUSD")

        assert body == {
            "symbol": "EURUSD",
            "timeframe": "1s",
            "candles": [
                {"time": _BASE_TIME, "open": 0.0, "high": 1.0, "low": 0.0, "close": 0.0},
                {"time": _BASE_TIME + 1, "open": 1.0, "high": 2.0, "low": 1.0, "close": 1.0},
                {"time": _BASE_TIME + 2, "open": 2.0, "high": 3.0, "low": 2.0, "close": 2.0},
            ],
        }

    def test_delegates_to_series_query(self, client: TestClient) -> None:
        query: _FakeSeriesQuery = client.app.state.series_query
        client.get("/series", params={"symbol": "EURUSD", "start": 10, "end": 20})

        assert query.requests == [("EURUSD", "1s", 10, 20)]

    def test_timeframe_query_param_is_passed(self, client: TestClient) -> None:
        query: _FakeSeriesQuery = client.app.state.series_query
        client.get("/series", params={"symbol": "EURUSD", "timeframe": "1h"})

        assert query.requests == [("EURUSD", "1h", None, None)]

    def test_default_uses_base_timeframe(self, client: TestClient) -> None:
        query: _FakeSeriesQuery = client.app.state.series_query
        client.get("/series", params={"symbol": "EURUSD"})

        assert query.requests == [("EURUSD", "1s", None, None)]


class TestSeriesErrors:
    """Mapeo de errores de la capa de consulta a códigos HTTP."""

    def _client(self, error: Exception) -> TestClient:
        query = _FakeSeriesQuery(error=error)
        return TestClient(create_app(_FakeQueue(), series_query=query))  # type: ignore[arg-type]

    def test_missing_series_returns_404(self) -> None:
        client = self._client(FileNotFoundError("El activo 'EURUSD' no tiene serie almacenada"))
        response = client.get("/series", params={"symbol": "EURUSD"})

        assert response.status_code == 404

    def test_reversed_range_returns_400(self) -> None:
        client = self._client(InvalidRangeError("Rango inválido: start=20 > end=10"))
        response = client.get("/series", params={"symbol": "EURUSD", "start": 20, "end": 10})

        assert response.status_code == 400

    def test_invalid_timeframe_error_is_mapped_to_400(self) -> None:
        """El 400 defensivo protege ante drift del conjunto canónico en storage."""
        client = self._client(InvalidTimeframeError("Timeframe no canónico"))
        response = client.get("/series", params={"symbol": "EURUSD", "timeframe": "1h"})

        assert response.status_code == 400

    def test_unsafe_symbol_returns_400(self) -> None:
        client = self._client(ValueError("Símbolo inválido para almacenamiento: '..//x'"))
        response = client.get("/series", params={"symbol": "..//x"})

        assert response.status_code == 400

    def test_timeframe_param_type_is_validated_by_fastapi(self) -> None:
        client = self._client(FileNotFoundError("no alcanzado"))
        response = client.get("/series", params={"symbol": "EURUSD", "timeframe": "3m"})

        assert response.status_code == 422


class TestSeriesMatchesDirectDuckDB:
    """DoD: la respuesta del endpoint coincide con la consulta directa a DuckDB."""

    def _client(self, tmp_path: Path) -> TestClient:
        store = ParquetSeriesStore(tmp_path)
        base = _second_candles(_BASE_TIME, 3600)
        store.write("EURUSD", base)
        resampled = resample_ohlc(base, "1m")
        store.write("EURUSD", resampled.candles, timeframe="1m")
        query = SeriesQuery(store)
        return TestClient(create_app(_FakeQueue(), series_query=query))

    def test_base_timeframe_matches_direct_query(self, tmp_path: Path) -> None:
        client = self._client(tmp_path)
        store_query: SeriesQuery = client.app.state.series_query
        expected = store_query.read(
            "EURUSD", timeframe="1s", start=_BASE_TIME, end=_BASE_TIME + 3599
        )

        body = _dump(
            client, symbol="EURUSD", timeframe="1s", start=_BASE_TIME, end=_BASE_TIME + 3599
        )

        assert body["candles"] == [c.model_dump(mode="json") for c in expected]

    def test_resampled_timeframe_matches_direct_query(self, tmp_path: Path) -> None:
        client = self._client(tmp_path)
        store_query: SeriesQuery = client.app.state.series_query
        expected = store_query.read("EURUSD", timeframe="1m")

        body = _dump(client, symbol="EURUSD", timeframe="1m")

        assert body["candles"] == [c.model_dump(mode="json") for c in expected]

    def test_range_is_respected_on_api(self, tmp_path: Path) -> None:
        client = self._client(tmp_path)
        store_query: SeriesQuery = client.app.state.series_query
        expected = store_query.read(
            "EURUSD", timeframe="1m", start=_BASE_TIME + 120, end=_BASE_TIME + 239
        )

        body = _dump(
            client, symbol="EURUSD", timeframe="1m", start=_BASE_TIME + 120, end=_BASE_TIME + 239
        )

        assert body["candles"] == [c.model_dump(mode="json") for c in expected]
        assert len(body["candles"]) == 2


class TestDefaultSeriesWiring:
    """TASK-044: el wiring por defecto sirve la segunda carga desde memoria."""

    _COUNT = 300
    _START = _BASE_TIME
    _END = _BASE_TIME + 299

    def _client(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, **env: str) -> TestClient:
        monkeypatch.setenv("FXTRAD_DATA_DIR", str(tmp_path))
        for name, value in env.items():
            monkeypatch.setenv(name, value)
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _second_candles(self._START, self._COUNT))
        return TestClient(create_app(_FakeQueue()))

    def _dump_window(self, client: TestClient) -> object:
        return _dump(client, symbol="EURUSD", timeframe="1s", start=self._START, end=self._END)

    def test_second_call_is_served_from_memory(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = self._client(tmp_path, monkeypatch)
        query: CachedSeriesQuery = client.app.state.series_query

        first = self._dump_window(client)
        second = self._dump_window(client)

        assert second == first
        assert (query.stats.hits, query.stats.misses) == (1, 1)

    def test_incremental_download_is_reflected_in_the_next_response(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """TASK-045: un merge externo invalida la ventana y la respuesta se recarga.

        Las dos peticiones usan la misma ventana (rango sin cota) para que la
        segunda tenga que invalidar la ventana cacheada en lugar de abrir otra.
        """
        client = self._client(tmp_path, monkeypatch)
        query: CachedSeriesQuery = client.app.state.series_query
        first = _dump(client, symbol="EURUSD", timeframe="1s")

        ParquetSeriesStore(tmp_path).merge(
            "EURUSD", _second_candles(self._START + self._COUNT, 1), timeframe="1s"
        )
        second = _dump(client, symbol="EURUSD", timeframe="1s")

        assert len(first["candles"]) == self._COUNT
        assert len(second["candles"]) == self._COUNT + 1
        assert query.stats.invalidations == 1

    def test_window_over_configured_limit_is_served_but_not_cached(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = self._client(tmp_path, monkeypatch, FXTRAD_CACHE_MAX_CANDLES="10")
        query: CachedSeriesQuery = client.app.state.series_query

        first = self._dump_window(client)
        second = self._dump_window(client)

        assert second == first
        assert (query.stats.hits, query.stats.misses) == (0, 2)

    @pytest.mark.parametrize("value", ["", "  ", "no-es-un-entero"])
    def test_invalid_cache_limit_falls_back_to_default(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, value: str
    ) -> None:
        client = self._client(tmp_path, monkeypatch, FXTRAD_CACHE_MAX_CANDLES=value)
        query: CachedSeriesQuery = client.app.state.series_query

        self._dump_window(client)
        self._dump_window(client)

        assert query.stats.hits == 1


class TestDerivedSeriesAfterMerge:
    """TASK-049: tras un merge 1s el timeframe derivado se sirve al día.

    Es la aserción literal de la DoD: lo que devuelve
    ``GET /series?timeframe=1h`` tiene que coincidir con la agregación directa
    de la base 1s, y no con el Parquet que hubiera antes del merge.
    """

    _START = _BASE_TIME
    _COUNT = 300
    _HOUR = 3600

    def _client(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
        monkeypatch.setenv("FXTRAD_DATA_DIR", str(tmp_path))
        return TestClient(create_app(_FakeQueue()))

    def _base(self) -> list[Candle]:
        return _second_candles(self._START, self._COUNT)

    def test_derived_matches_direct_aggregation_after_a_merge(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        persister = build_persister(tmp_path)
        persister.persist(
            "EURUSD",
            self._base(),
            start=self._START,
            end=self._START + self._COUNT - 1,
            status="exito",
        )
        client = self._client(tmp_path, monkeypatch)

        response = client.get(
            "/series", params={"symbol": "EURUSD", "timeframe": "1h", "start": self._START}
        )

        base = ParquetSeriesStore(tmp_path).read_range("EURUSD", 0, 2**31 - 1, "1s")
        expected = resample_ohlc(base, "1h").candles
        assert response.status_code == 200
        served = response.json()["candles"]
        assert [(c["time"], c["open"], c["high"], c["low"], c["close"]) for c in served] == [
            (c.time, c.open, c.high, c.low, c.close) for c in expected
        ]

    def test_incremental_merge_is_visible_in_the_next_1h_response(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        persister = build_persister(tmp_path)
        persister.persist(
            "EURUSD",
            self._base(),
            start=self._START,
            end=self._START + self._COUNT - 1,
            status="exito",
        )
        client = self._client(tmp_path, monkeypatch)
        params = {"symbol": "EURUSD", "timeframe": "1h", "start": self._START}
        first = client.get("/series", params=params)

        # Segunda descarga en otra hora: el bucket nuevo debe servirse ya.
        later = self._START + self._HOUR
        persister.persist(
            "EURUSD", _second_candles(later, 10), start=later, end=later + 9, status="exito"
        )
        second = client.get("/series", params=params)

        assert [c["time"] for c in second.json()["candles"]] == [
            self._START,
            later,
        ]
        assert len(second.json()["candles"]) == len(first.json()["candles"]) + 1

    def test_cached_1h_window_is_invalidated_by_the_merge(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """TASK-045 + TASK-049: la versión del derivado cambia al regenerarse."""
        persister = build_persister(tmp_path)
        persister.persist(
            "EURUSD",
            self._base(),
            start=self._START,
            end=self._START + self._COUNT - 1,
            status="exito",
        )
        client = self._client(tmp_path, monkeypatch)
        query: CachedSeriesQuery = client.app.state.series_query
        params = {"symbol": "EURUSD", "timeframe": "1h", "start": self._START}
        cached = client.get("/series", params=params)

        later = self._START + self._HOUR
        persister.persist(
            "EURUSD", _second_candles(later, 10), start=later, end=later + 9, status="exito"
        )
        refreshed = client.get("/series", params=params)

        assert len(refreshed.json()["candles"]) == len(cached.json()["candles"]) + 1
        assert query.stats.invalidations == 1
        assert query.stats.hits == 0
