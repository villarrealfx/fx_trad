"""Tests del esquema SerieOHLC en Parquet por activo (TASK-015, RF-005/RI-001).

DoD: se crea un Parquet por activo con ``time`` BIGINT único y la consulta con
DuckDB devuelve el rango. Se usa ``tmp_path`` para aislar cada test.
"""

from __future__ import annotations

import time
from pathlib import Path

import duckdb
import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.storage import DuplicateTimeError, InvalidTimeframeError, ParquetSeriesStore
from fxtrad.storage.series import _INSERT_BATCH_SIZE

_BASE_TIME = 1786442400  # 2026-08-11T10:00:00Z


def _candle(time: int, price: float = 1.0) -> Candle:
    """Construye una vela con precio constante para simplificar aserciones."""
    return Candle(time=time, open=price, high=price, low=price, close=price)


def _series(prices: list[float]) -> list[Candle]:
    """Serie consecutiva por horas con los precios dados."""
    return [_candle(_BASE_TIME + i * 3600, price) for i, price in enumerate(prices)]


class TestWrite:
    """La escritura crea un Parquet por activo con ``time`` BIGINT."""

    def test_write_creates_one_parquet_per_asset(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        store.write("EURUSD", _series([1.1, 1.2]))
        store.write("XAUUSD", _series([2000.0]))

        assert (tmp_path / "EURUSD.parquet").is_file()
        assert (tmp_path / "XAUUSD.parquet").is_file()

    def test_write_returns_number_of_rows(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        written = store.write("EURUSD", _series([1.1, 1.2, 1.3]))

        assert written == 3

    def test_time_column_is_bigint(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series([1.1]))

        with duckdb.connect() as connection:
            (time_type,) = connection.execute(
                "SELECT typeof(time) FROM read_parquet(?) LIMIT 1",
                [str(store.path_for("EURUSD"))],
            ).fetchone()

        assert time_type == "BIGINT"

    def test_write_replaces_existing_series(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series([1.1, 1.2]))

        store.write("EURUSD", _series([1.3]))

        assert store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 7200) == [
            _candle(_BASE_TIME, 1.3)
        ]

    def test_duplicate_times_are_rejected(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        duplicated = [_candle(_BASE_TIME, 1.1), _candle(_BASE_TIME, 1.2)]

        with pytest.raises(DuplicateTimeError, match="duplicados"):
            store.write("EURUSD", duplicated)

        assert store.has_series("EURUSD") is False

    def test_unsafe_symbol_is_rejected(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        with pytest.raises(ValueError, match="inválido"):
            store.write("../evil", _series([1.1]))


class TestReadRange:
    """La consulta DuckDB devuelve el rango solicitado ordenado."""

    def test_read_range_returns_candles_sorted_by_time(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", list(reversed(_series([1.1, 1.2, 1.3]))))

        result = store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 7200)

        assert [candle.time for candle in result] == [
            _BASE_TIME,
            _BASE_TIME + 3600,
            _BASE_TIME + 7200,
        ]
        assert [candle.close for candle in result] == [1.1, 1.2, 1.3]

    def test_read_range_includes_boundaries(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series([1.1, 1.2, 1.3]))

        result = store.read_range("EURUSD", _BASE_TIME + 3600, _BASE_TIME + 7200)

        assert [candle.time for candle in result] == [_BASE_TIME + 3600, _BASE_TIME + 7200]

    def test_read_range_excludes_outside_points(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series([1.1, 1.2, 1.3]))

        result = store.read_range("EURUSD", _BASE_TIME - 1, _BASE_TIME + 3600)

        assert [candle.time for candle in result] == [_BASE_TIME, _BASE_TIME + 3600]

    def test_read_range_without_matches_is_empty(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series([1.1, 1.2]))

        result = store.read_range("EURUSD", _BASE_TIME + 10_000, _BASE_TIME + 20_000)

        assert result == []

    def test_read_range_missing_asset_raises(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        with pytest.raises(FileNotFoundError, match="EURUSD"):
            store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 3600)

    def test_has_series_reflects_stored_state(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        assert store.has_series("EURUSD") is False
        store.write("EURUSD", _series([1.1]))
        assert store.has_series("EURUSD") is True


class TestCoverage:
    """La cobertura refleja el min/max ``time`` de la base 1s (RF-007/CMP-006)."""

    def test_coverage_returns_min_and_max_time(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series([1.1, 1.2, 1.3]))

        assert store.coverage("EURUSD") == (_BASE_TIME, _BASE_TIME + 7200)

    def test_coverage_is_none_without_series(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        assert store.coverage("EURUSD") is None

    def test_coverage_ignores_resampled_timeframes(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series([1.1, 1.2]), timeframe="1h")

        assert store.coverage("EURUSD") is None

    def test_coverage_rejects_unsafe_symbol(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        with pytest.raises(ValueError, match="inválido"):
            store.coverage("../evil")


class TestVersion:
    """El token de versión cambia cuando el Parquet se reescribe (TASK-045)."""

    def test_version_is_none_without_series(self, tmp_path: Path) -> None:
        assert ParquetSeriesStore(tmp_path).version("EURUSD") is None

    def test_version_is_stable_without_changes(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series([1.1, 1.2]))

        first = store.version("EURUSD")
        second = store.version("EURUSD")

        assert first is not None
        assert first == second

    def test_version_changes_after_merge(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series([1.1, 1.2]))
        before = store.version("EURUSD")

        store.merge("EURUSD", [_candle(_BASE_TIME + 7200, 1.3)])

        assert store.version("EURUSD") != before

    def test_version_is_per_timeframe(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _series([1.1, 1.2]))
        base = store.version("EURUSD")

        store.write("EURUSD", _series([1.1, 1.2]), timeframe="1h")

        assert store.version("EURUSD", "1h") not in (None, base)

    def test_version_rejects_unsafe_symbol(self, tmp_path: Path) -> None:
        with pytest.raises(ValueError, match="inválido"):
            ParquetSeriesStore(tmp_path).version("../evil")

    def test_version_rejects_non_canonical_timeframe(self, tmp_path: Path) -> None:
        with pytest.raises(InvalidTimeframeError, match="canónico"):
            ParquetSeriesStore(tmp_path).version("EURUSD", "3m")  # type: ignore[arg-type]


class TestBatchWrite:
    """La escritura por lotes no pierde filas ni duplica (TASK-051, RNF-002)."""

    _BATCH = _INSERT_BATCH_SIZE

    @staticmethod
    def _batch_candles(count: int) -> list[Candle]:
        """Serie de ``count`` velas consecutivas de 1 s desde la base."""
        return [_candle(_BASE_TIME + index) for index in range(count)]

    def test_write_handles_an_exact_batch(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        written = store.write("EURUSD", self._batch_candles(self._BATCH))

        rows = store.read_range("EURUSD", 0, 2**31 - 1)
        assert written == self._BATCH
        assert len(rows) == self._BATCH
        assert [candle.time for candle in rows] == sorted(candle.time for candle in rows)

    def test_write_handles_a_batch_plus_one(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        count = self._BATCH + 1

        store.write("EURUSD", self._batch_candles(count))

        assert len(store.read_range("EURUSD", 0, 2**31 - 1)) == count

    def test_merge_keeps_zero_duplicates_across_batches(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        base = self._batch_candles(self._BATCH)
        store.write("EURUSD", base)
        # Solape total + lote nuevo: el upsert debe dejar 0 duplicados (KPI-4).
        overlap = self._batch_candles(self._BATCH) + [_candle(_BASE_TIME + self._BATCH, 9.9)]

        total = store.merge("EURUSD", overlap)

        rows = store.read_range("EURUSD", 0, 2**31 - 1)
        assert total == self._BATCH + 1
        assert len(rows) == len({candle.time for candle in rows}) == self._BATCH + 1

    def test_write_is_not_row_by_row(self, tmp_path: Path) -> None:
        """20k velas por lotes tardan ~1 s; fila a fila tardarían ~12 s (TASK-051)."""
        store = ParquetSeriesStore(tmp_path)
        candles = self._batch_candles(20_000)

        started = time.perf_counter()
        store.write("EURUSD", candles)
        elapsed = time.perf_counter() - started

        assert elapsed < 10.0
