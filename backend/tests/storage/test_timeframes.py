"""Tests del Parquet por timeframe y base 1m (TASK-017/TASK-060, RF-009; ADR-007/012).

DoD: la base 1 m se persiste en ``{symbol}.1m.parquet`` y los derivados en
``{symbol}.{tf}.parquet``, y se consultan sin recomputar. Los timeframes no
canónicos —incluido ``1s``— se rechazan.
"""

from __future__ import annotations

from pathlib import Path

import duckdb
import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.pipeline.resample import resample_ohlc
from fxtrad.storage import (
    InvalidTimeframeError,
    ParquetSeriesStore,
    SeriesQuery,
)

_BASE_TIME = 1772409600  # 2026-03-02T00:00:00Z (lunes, fixture marzo 2026)
_DERIVED = ["5m", "15m", "1h", "4h", "1d"]


def _minute_candles(start: int, count: int) -> list[Candle]:
    """Serie 1 m alineada al epoch: open=i, high=i+1, low=i, close=i."""
    return [
        Candle(time=start + i * 60, open=float(i), high=float(i + 1), low=float(i), close=float(i))
        for i in range(count)
    ]


def _write_base(store: ParquetSeriesStore, symbol: str = "EURUSD") -> None:
    """Persiste una hora de velas 1 m de la base del activo (ADR-012)."""
    store.write(symbol, _minute_candles(_BASE_TIME, 60))


class TestPrecomputePersistence:
    """Un Parquet por timeframe se persiste junto a la base 1m (ADR-007)."""

    @pytest.mark.parametrize("timeframe", _DERIVED)
    def test_writes_one_parquet_per_timeframe(self, tmp_path: Path, timeframe: str) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)
        resampled = resample_ohlc(
            store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 3599), timeframe
        )

        written = store.write("EURUSD", resampled.candles, timeframe=timeframe)

        assert (tmp_path / f"EURUSD.{timeframe}.parquet").is_file()
        assert written == resampled.rows_output

    def test_base_uses_1m_filename(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)

        assert (tmp_path / "EURUSD.1m.parquet").is_file()

    def test_has_series_is_timeframe_aware(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)
        resampled = resample_ohlc(store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 3599), "1h")
        store.write("EURUSD", resampled.candles, timeframe="1h")

        assert store.has_series("EURUSD", "1m") is True
        assert store.has_series("EURUSD", "1h") is True
        assert store.has_series("EURUSD", "5m") is False

    def test_rejects_1s_timeframe(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)

        with pytest.raises(InvalidTimeframeError, match="canónico"):
            store.write("EURUSD", [], timeframe="1s")


class TestQueryWithoutRecompute:
    """La consulta de un timeframe sirve lo persistido, sin recomputar."""

    def test_query_returns_persisted_resampled_candles(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)
        resampled = resample_ohlc(store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 3599), "1h")
        store.write("EURUSD", resampled.candles, timeframe="1h")

        result = SeriesQuery(store).read("EURUSD", timeframe="1h")

        assert result == resampled.candles

    def test_each_timeframe_matches_its_persisted_file(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)
        base = store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 3599)

        for timeframe in _DERIVED:
            resampled = resample_ohlc(base, timeframe)
            store.write("EURUSD", resampled.candles, timeframe=timeframe)

            query = SeriesQuery(store)
            with duckdb.connect() as connection:
                (rows,) = connection.execute(
                    "SELECT count(*) FROM read_parquet(?)",
                    [str(store.path_for("EURUSD", timeframe))],
                ).fetchone()

            assert query.read("EURUSD", timeframe=timeframe) == resampled.candles
            assert rows == resampled.rows_output

    def test_query_respects_range_bounds_on_base(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)

        result = SeriesQuery(store).read(
            "EURUSD", timeframe="1m", start=_BASE_TIME + 120, end=_BASE_TIME + 239
        )

        assert [candle.time for candle in result] == [_BASE_TIME + 120, _BASE_TIME + 180]
        assert [candle.open for candle in result] == [2.0, 3.0]


class TestTimeframeValidation:
    """Los timeframes no canónicos y sin archivo se rechazan explícitamente."""

    def test_non_canonical_timeframe_is_rejected(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)

        with pytest.raises(InvalidTimeframeError, match="canónico"):
            ParquetSeriesStore(tmp_path).write("EURUSD", [], timeframe="3m")

    def test_query_missing_timeframe_raises_file_not_found(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)

        with pytest.raises(FileNotFoundError, match="1h"):
            SeriesQuery(store).read("EURUSD", timeframe="1h")
