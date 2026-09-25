"""Test de esquema SerieOHLC normalizado en Parquet (TASK-011, ADR-004/RF-005).

DoD: "test de esquema". Verifica que las filas normalizadas, una vez
persistidas con ``ParquetSeriesStore``, cumplen el esquema almacenable de
ADR-004: ``time`` como BIGINT (INT64) UTC y precios OHLC como DOUBLE, con
valores idénticos al roundtrip y unicidad por activo (RI-001).
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import duckdb
import pytest

from fxtrad.pipeline import normalize_schema
from fxtrad.storage import ParquetSeriesStore

_SEC = 1786442400  # 2026-08-11 10:00:00 UTC
_OHLC = ("open", "high", "low", "close")


def _rows() -> list[dict[str, object]]:
    """Filas crudas heterogéneas: int, str y datetime (aware y naive)."""
    return [
        {"time": _SEC, "open": 1.09, "high": 1.10, "low": 1.08, "close": 1.09},
        {"time": str(_SEC + 1), "open": "1.10", "high": 1.11, "low": 1.09, "close": 1.10},
        {
            "time": datetime(2026, 8, 11, 10, 0, 2, tzinfo=UTC),
            "open": 1.11,
            "high": 1.12,
            "low": 1.10,
            "close": 1.11,
        },
        {
            "time": datetime(2026, 8, 11, 10, 0, 3),
            "open": 1.12,
            "high": 1.13,
            "low": 1.11,
            "close": 1.12,
        },
    ]


def _parquet_types(path: Path) -> dict[str, str]:
    """Mapa columna→tipo declarado del Parquet, según el ``DESCRIBE`` de DuckDB."""
    connection = duckdb.connect()
    try:
        rows = connection.execute(f"DESCRIBE SELECT * FROM read_parquet('{path}')").fetchall()
    finally:
        connection.close()
    return {row[0]: row[1] for row in rows}


class TestSchema:
    """Las filas normalizadas cumplen el esquema BIGINT/DOUBLE al persistir."""

    def test_normalized_rows_roundtrip_without_value_changes(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        store.write("EURUSD", normalize_schema(_rows()))

        stored = store.read_range("EURUSD", _SEC, _SEC + 3)
        assert [candle.time for candle in stored] == [_SEC, _SEC + 1, _SEC + 2, _SEC + 3]
        assert stored[1].open == 1.10
        assert stored[2].open == 1.11
        assert stored[3].high == 1.13

    def test_stored_time_is_integer_and_ohlc_are_float(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        store.write("EURUSD", normalize_schema(_rows()))

        for candle in store.read_range("EURUSD", _SEC, _SEC + 3):
            assert isinstance(candle.time, int)
            assert all(isinstance(getattr(candle, key), float) for key in _OHLC)

    def test_duckdb_declares_bigint_time_and_double_prices(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", normalize_schema(_rows()))

        types = _parquet_types(tmp_path / "EURUSD.parquet")
        assert types["time"] == "BIGINT"
        assert all(types[key] == "DOUBLE" for key in _OHLC)

    def test_no_duplicate_times_after_normalization(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", normalize_schema(_rows()))

        assert len({candle.time for candle in store.read_range("EURUSD", _SEC, _SEC + 3)}) == 4

    def test_fractional_second_is_rejected_before_persisting(self, tmp_path: Path) -> None:
        rows = [
            *_rows(),
            {"time": _SEC + 3.5, "open": 1.12, "high": 1.13, "low": 1.11, "close": 1.12},
        ]

        with pytest.raises(ValueError, match="fracción de segundo"):
            normalize_schema(rows)
        assert not (tmp_path / "EURUSD.parquet").exists()
