"""Tests del endpoint GET /series (TASK-021, RF-008/RX-002/RNF-008).

DoD: devuelve la serie OHLC del rango/timeframe y coincide con la consulta
directa a DuckDB. Se cubre el contrato del endpoint con un stub de
``SeriesQuery`` y la coincidencia con una integración real contra
Parquet + DuckDB (fixture marzo 2026), incluyendo pre-resampling (TASK-017).
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from fxtrad.api import create_app
from fxtrad.contracts.ohlc import Candle, Timeframe
from fxtrad.pipeline.resample import resample_ohlc
from fxtrad.storage import (
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
