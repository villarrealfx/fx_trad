"""Tests del upsert incremental por merge sobre ``time`` (TASK-019, RF-006).

DoD: un periodo nuevo sobre una base existente no duplica ``time`` ni borra
filas; KPI-4 = 0 filas duplicadas por descarga. Se usa ``tmp_path`` para
aislar cada test.
"""

from __future__ import annotations

from pathlib import Path

import duckdb
import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.storage import (
    DuplicateTimeError,
    InvalidTimeframeError,
    ParquetSeriesStore,
)

_BASE_TIME = 1786442400  # 2026-08-11T10:00:00Z
_HOUR = 3600


def _candle(time: int, price: float = 1.0) -> Candle:
    """Vela con precio constante para simplificar aserciones."""
    return Candle(time=time, open=price, high=price, low=price, close=price)


def _series(start: int, hours: int) -> list[Candle]:
    """Velas horarias consecutivas desde ``start``."""
    return [_candle(start + i * _HOUR, 1.0 + i * 0.01) for i in range(hours)]


class TestMergeFirstWrite:
    """Sin serie previa, merge equivale a write (primer periodo)."""

    def test_merge_creates_series_when_missing(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        total = store.merge("EURUSD", _series(_BASE_TIME, 3))

        assert total == 3
        assert store.has_series("EURUSD") is True
        assert (tmp_path / "EURUSD.parquet").is_file()
        assert not (tmp_path / "EURUSD.parquet.tmp").exists()

    def test_merge_returns_incoming_count_on_first_write(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        assert store.merge("EURUSD", _series(_BASE_TIME, 5)) == 5

    def test_merge_first_write_is_serializable_range(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.merge("EURUSD", _series(_BASE_TIME, 3))

        result = store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 2 * _HOUR)

        assert len(result) == 3
        assert result[0].time == _BASE_TIME


class TestMergeIncremental:
    """Periodos disyuntos se acumulan sin duplicar ni borrar (RF-006/KPI-4)."""

    def test_disjoint_periods_accumulate_without_duplicates(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series(_BASE_TIME, 5))

        total = store.merge("EURUSD", _series(_BASE_TIME + 5 * _HOUR, 2))

        assert total == 7
        result = store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 6 * _HOUR)
        assert [candle.time for candle in result] == [_BASE_TIME + i * _HOUR for i in range(7)]

    def test_no_duplicate_rows_in_parquet(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series(_BASE_TIME, 4))
        store.merge("EURUSD", _series(_BASE_TIME + 4 * _HOUR, 4))

        with duckdb.connect() as connection:
            (total,) = connection.execute(
                "SELECT COUNT(*) FROM read_parquet(?)",
                [str(tmp_path / "EURUSD.parquet")],
            ).fetchone()
            (distinct,) = connection.execute(
                "SELECT COUNT(DISTINCT time) FROM read_parquet(?)",
                [str(tmp_path / "EURUSD.parquet")],
            ).fetchone()

        assert total == distinct == 8

    def test_shared_boundary_hour_is_kept_once(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series(_BASE_TIME, 4))
        second = _series(_BASE_TIME + 3 * _HOUR, 4)

        total = store.merge("EURUSD", second)

        assert total == 7  # la hora 3 del primer lote == hora 0 del segundo

    def test_existing_rows_are_never_deleted(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series(_BASE_TIME, 5))

        store.merge("EURUSD", _series(_BASE_TIME + 5 * _HOUR, 1))
        store.merge("EURUSD", _series(_BASE_TIME + 6 * _HOUR, 1))

        result = store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 6 * _HOUR)

        assert len(result) == 7
        assert result[0].time == _BASE_TIME
        assert result[-1].time == _BASE_TIME + 6 * _HOUR

    def test_collision_gives_precedence_to_incoming(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", [_candle(_BASE_TIME, 1.0)])

        total = store.merge("EURUSD", [_candle(_BASE_TIME, 9.9)])

        assert total == 1
        (saved,) = store.read_range("EURUSD", _BASE_TIME, _BASE_TIME)
        assert saved.close == 9.9


class TestMergeValidation:
    """Reutiliza las guardas del almacén (RI-001)."""

    def test_rejects_duplicate_times_within_incoming(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series(_BASE_TIME, 1))

        with pytest.raises(DuplicateTimeError, match="duplicados"):
            store.merge("EURUSD", [_candle(_BASE_TIME, 1.1), _candle(_BASE_TIME, 1.2)])

    def test_rejects_unsafe_symbol(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        with pytest.raises(ValueError, match="inválido"):
            store.merge("../evil", _series(_BASE_TIME, 1))

    def test_rejects_non_canonical_timeframe(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        with pytest.raises(InvalidTimeframeError, match="no canónico"):
            store.merge("EURUSD", _series(_BASE_TIME, 1), timeframe="3m")


class TestMergeTimeframes:
    """Merge sobre Parquet pre-resampling (TASK-017, ADR-007)."""

    def test_merges_same_preresampled_timeframe(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series(_BASE_TIME, 2), timeframe="1m")

        total = store.merge("EURUSD", _series(_BASE_TIME + 2 * _HOUR, 2), timeframe="1m")

        assert total == 4
        series = store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 3 * _HOUR, timeframe="1m")
        assert len(series) == 4
        assert (tmp_path / "EURUSD.1m.parquet").is_file()
