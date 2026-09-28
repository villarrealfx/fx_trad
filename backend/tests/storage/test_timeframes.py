"""Tests del Parquet pre-resampling por timeframe (TASK-017, RF-009/ADR-007).

DoD: los archivos por timeframe quedan persistidos y se consultan sin
recomputar. Se verifica el naming ``{symbol}.{tf}.parquet``, que la consulta
devuelve exactamente lo persistido por el resampling (compuesto desde el
pipeline, sin re-procesar en cada lectura) y que los timeframes no canónicos
se rechazan.
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
_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"]


def _second_candles(start: int, count: int) -> list[Candle]:
    """Serie 1s con OHLC determinista: open=i, high=i+1, low=i, close=i."""
    return [
        Candle(time=start + i, open=float(i), high=float(i + 1), low=float(i), close=float(i))
        for i in range(count)
    ]


def _write_base(store: ParquetSeriesStore, symbol: str = "EURUSD") -> None:
    """Persiste la serie base 1s del activo (TASK-015)."""
    store.write(symbol, _second_candles(_BASE_TIME, 3600))


class TestPrecomputePersistence:
    """Un Parquet por timeframe se persiste junto a la base 1s (ADR-007)."""

    @pytest.mark.parametrize("timeframe", _TIMEFRAMES)
    def test_writes_one_parquet_per_timeframe(self, tmp_path: Path, timeframe: str) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)
        resampled = resample_ohlc(
            store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 3599), timeframe
        )

        written = store.write("EURUSD", resampled.candles, timeframe=timeframe)

        assert (tmp_path / f"EURUSD.{timeframe}.parquet").is_file()
        assert written == resampled.rows_output

    def test_base_one_second_keeps_legacy_filename(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)

        assert (tmp_path / "EURUSD.parquet").is_file()

    def test_has_series_is_timeframe_aware(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)
        resampled = resample_ohlc(store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 3599), "1h")
        store.write("EURUSD", resampled.candles, timeframe="1h")

        assert store.has_series("EURUSD", "1s") is True
        assert store.has_series("EURUSD", "1h") is True
        assert store.has_series("EURUSD", "1m") is False


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

        for timeframe in _TIMEFRAMES:
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

    def test_query_respects_range_bounds_on_timeframe(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        _write_base(store)
        resampled = resample_ohlc(
            store.read_range("EURUSD", _BASE_TIME, _BASE_TIME + 3599), "1m", source="1s"
        )
        store.write("EURUSD", resampled.candles, timeframe="1m")

        result = SeriesQuery(store).read(
            "EURUSD", timeframe="1m", start=_BASE_TIME + 120, end=_BASE_TIME + 239
        )

        assert result == [resampled.candles[2], resampled.candles[3]]


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

        with pytest.raises(FileNotFoundError, match="1m"):
            SeriesQuery(store).read("EURUSD", timeframe="1m")
