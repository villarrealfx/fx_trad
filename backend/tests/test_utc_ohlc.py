"""Verificación de UTC y del contrato OHLC consumible por el chart (TASK-070).

DoD: ``time`` es INT64 UTC y ``open/high/low/close`` son DOUBLE en DuckDB, y el
payload de ``GET /series`` es directamente consumible por el gráfico, sin
transformaciones (RNF-004, RNF-008).
"""

from __future__ import annotations

from pathlib import Path

import duckdb
from fastapi.testclient import TestClient

from fxtrad.api import create_app
from fxtrad.contracts.ohlc import Candle
from fxtrad.storage import ParquetSeriesStore, SeriesQuery

_START = 1772409600  # 2026-03-02T00:00:00Z (lunes)
_CHART_KEYS = {"time", "open", "high", "low", "close"}


class _FakeQueue:
    """Stub mínimo de DownloadQueue para construir la aplicación."""

    def enqueue(self, request: object) -> str:
        return "fake-task"


def _minute_candles(start: int, count: int) -> list[Candle]:
    """Serie 1 m alineada al epoch con OHLC determinista."""
    return [
        Candle(
            time=start + i * 60,
            open=1.0 + i,
            high=1.5 + i,
            low=0.5 + i,
            close=1.2 + i,
        )
        for i in range(count)
    ]


def _client(tmp_path: Path) -> TestClient:
    store = ParquetSeriesStore(tmp_path)
    store.write("EURUSD", _minute_candles(_START, 3))
    return TestClient(create_app(_FakeQueue(), series_query=SeriesQuery(store)))  # type: ignore[arg-type]


class TestDuckDBSchema:
    """La base 1 m se almacena con ``time`` INT64 y precios DOUBLE (RI-101)."""

    def test_column_types(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _minute_candles(_START, 3))
        path = store.path_for("EURUSD", "1m")

        with duckdb.connect() as connection:
            types = connection.execute(
                "SELECT typeof(time), typeof(open), typeof(high), typeof(low), typeof(close) "
                "FROM read_parquet(?) LIMIT 1",
                [str(path)],
            ).fetchone()

        assert types == ("BIGINT", "DOUBLE", "DOUBLE", "DOUBLE", "DOUBLE")


class TestUtcTimestamps:
    """``time`` es el epoch UTC en segundos (RNF-004)."""

    def test_stored_time_matches_utc_epoch(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        source = _minute_candles(_START, 3)

        store.write("EURUSD", source)

        stored = store.read_range("EURUSD", 0, 2**31 - 1)
        assert [candle.time for candle in stored] == [candle.time for candle in source]
        assert all(isinstance(candle.time, int) for candle in stored)


class TestChartContract:
    """El payload de ``GET /series`` es consumible por el gráfico sin transformar."""

    def test_payload_candles_have_chart_keys(self, tmp_path: Path) -> None:
        body = _client(tmp_path).get("/series", params={"symbol": "EURUSD"}).json()

        assert body["timeframe"] == "1m"
        for candle in body["candles"]:
            assert set(candle) == _CHART_KEYS
            assert isinstance(candle["time"], int)
            for field in ("open", "high", "low", "close"):
                assert isinstance(candle[field], float)

    def test_timeframe_literal_matches_payload(self, tmp_path: Path) -> None:
        response = _client(tmp_path).get("/series", params={"symbol": "EURUSD", "timeframe": "1m"})

        assert response.status_code == 200
        assert response.json()["timeframe"] == "1m"
