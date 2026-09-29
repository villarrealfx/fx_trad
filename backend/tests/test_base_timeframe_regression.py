"""Regresión transversal de la base 1 m (TASK-063, RF-103; ADR-012).

Guard de regresión del cambio de base 1 s → 1 m: verifica que el *naming* es
``{symbol}.1m.parquet``, que ``1s`` se rechaza en storage/query/API, que el
default de la API es la base 1 m y que la persistencia regenera los derivados
desde la base 1 m.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from fxtrad.api import create_app
from fxtrad.contracts.ohlc import Candle
from fxtrad.pipeline.persist import build_persister
from fxtrad.pipeline.resample import resample_ohlc
from fxtrad.storage import InvalidTimeframeError, ParquetSeriesStore, SeriesQuery

_BASE_TIME = 1772409600  # 2026-03-02T00:00:00Z (lunes)


class _FakeQueue:
    """Stub mínimo de DownloadQueue para construir la aplicación."""

    def enqueue(self, request: object) -> str:
        return "fake-task"


def _minute_candles(start: int, count: int) -> list[Candle]:
    """Serie 1 m alineada al epoch: una vela cada 60 s con OHLC determinista."""
    return [
        Candle(
            time=start + i * 60,
            open=float(i),
            high=float(i + 1),
            low=float(i),
            close=float(i),
        )
        for i in range(count)
    ]


def _client(tmp_path: Path) -> TestClient:
    store = ParquetSeriesStore(tmp_path)
    store.write("EURUSD", _minute_candles(_BASE_TIME, 3))
    return TestClient(create_app(_FakeQueue(), series_query=SeriesQuery(store)))  # type: ignore[arg-type]


class TestBaseTimeframeNaming:
    """La base se persiste como ``{symbol}.1m.parquet`` (ADR-012)."""

    def test_base_file_is_one_minute(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        store.write("EURUSD", _minute_candles(_BASE_TIME, 3))

        assert (tmp_path / "EURUSD.1m.parquet").is_file()
        assert not (tmp_path / "EURUSD.parquet").exists()


class TestOneSecondIsRejected:
    """``1s`` ya no es un timeframe válido en ninguna capa (ADR-012)."""

    def test_storage_rejects_one_second(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        with pytest.raises(InvalidTimeframeError, match="canónico"):
            store.write("EURUSD", [], timeframe="1s")

    def test_query_rejects_one_second(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _minute_candles(_BASE_TIME, 3))

        with pytest.raises(InvalidTimeframeError, match="canónico"):
            SeriesQuery(store).read("EURUSD", timeframe="1s")

    def test_api_rejects_one_second(self, tmp_path: Path) -> None:
        # Tras ADR-020, ``1s`` ni siquiera es un Timeframe del contrato: la
        # validación de FastAPI/Pydantic lo rechaza con 422 antes del storage.
        response = _client(tmp_path).get("/series", params={"symbol": "EURUSD", "timeframe": "1s"})

        assert response.status_code == 422


class TestBaseTimeframeDefaults:
    """El default de consulta y API es la base 1 m."""

    def test_query_default_reads_base_one_minute(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _minute_candles(_BASE_TIME, 3))

        candles = SeriesQuery(store).read("EURUSD")

        assert [candle.time for candle in candles] == [
            _BASE_TIME,
            _BASE_TIME + 60,
            _BASE_TIME + 120,
        ]

    def test_api_default_timeframe_is_one_minute(self, tmp_path: Path) -> None:
        body = _client(tmp_path).get("/series", params={"symbol": "EURUSD"}).json()

        assert body["timeframe"] == "1m"
        assert len(body["candles"]) == 3


class TestDerivedRefreshFromBase:
    """La persistencia regenera los derivados desde la base 1 m (RF-009)."""

    def test_derived_one_hour_matches_direct_aggregation(self, tmp_path: Path) -> None:
        persister = build_persister(tmp_path)
        persister.persist(
            "EURUSD",
            _minute_candles(_BASE_TIME, 120),
            start=_BASE_TIME,
            end=_BASE_TIME + 119 * 60,
            status="exito",
        )
        store = ParquetSeriesStore(tmp_path)

        hourly = store.read_range("EURUSD", 0, 2**31 - 1, "1h")
        expected = resample_ohlc(store.read_range("EURUSD", 0, 2**31 - 1, "1m"), "1h").candles

        assert len(hourly) == 2
        assert hourly == expected
