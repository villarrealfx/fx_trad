"""Tests de la regeneración de Parquets pre-resampling (TASK-049, RF-009).

DoD: dado un activo con 1m/1h pre-resampling y un merge 1m nuevo, los
timeframes cuyo rango intersecta el periodo quedan regenerados y la serie
servida coincide con la agregación directa de la base 1m.

Se usa Parquet y DuckDB reales sobre ``tmp_path``: el valor del test está en
que el bucket recalculado sea el correcto en disco, no en que se llame al
método correcto.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from fxtrad.pipeline.refresh import (
    DERIVED_TIMEFRAMES,
    DerivedSeriesRefresher,
    parse_timeframes,
    timeframes_from_env,
)
from fxtrad.pipeline.resample import resample_ohlc
from fxtrad.storage import ParquetSeriesStore

_DAY = 86_400
_HOUR = 3600
_START = 1_772_409_600  # 2026-03-02T00:00:00Z, ya alineado a día y hora


def _candles(start: int, count: int, *, step: int = 1) -> list:
    """Velas planas de 1 s desde ``start`` (precio derivado del instante)."""
    from fxtrad.contracts.ohlc import Candle

    return [
        Candle(time=start + i * step, open=1.0 + i, high=1.5 + i, low=0.5 + i, close=1.2 + i)
        for i in range(count)
    ]


def _times(store: ParquetSeriesStore, symbol: str, timeframe: str) -> list[int]:
    """Instantes almacenados en el Parquet del timeframe, en orden."""
    return [candle.time for candle in store.read_range(symbol, 0, 2**31 - 1, timeframe)]


def _store(tmp_path: Path) -> ParquetSeriesStore:
    return ParquetSeriesStore(tmp_path)


class TestBucketScope:
    """Solo se rehacen los buckets que el periodo intersecta."""

    def test_refresh_creates_missing_derived_series(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        store.merge("EURUSD", _candles(_START, 4))
        refresher = DerivedSeriesRefresher(store, ("1h",))

        totals = refresher.refresh("EURUSD", _START, _START + 3)

        assert totals == {"1h": 1}
        assert store.has_series("EURUSD", "1h")

    def test_only_intersected_buckets_are_rewritten(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        store.merge("EURUSD", _candles(_START, 4))
        refresher = DerivedSeriesRefresher(store, ("1h",))
        refresher.refresh("EURUSD", _START, _START + 3)

        # Segunda descarga en otra hora: el bucket previo no se toca.
        store.merge("EURUSD", _candles(_START + _HOUR, 2))
        refresher.refresh("EURUSD", _START + _HOUR, _START + _HOUR + 1)

        assert _times(store, "EURUSD", "1h") == [_START, _START + _HOUR]

    def test_bucket_spanning_the_period_edge_is_complete(self, tmp_path: Path) -> None:
        """Bucket a medio llenar: se rehace entero desde la base 1m."""
        store = _store(tmp_path)
        store.merge("EURUSD", _candles(_START + 1800, 4))  # mitad de la hora 00
        refresher = DerivedSeriesRefresher(store, ("1h",))

        refresher.refresh("EURUSD", _START + 1800, _START + 1803)
        # Llega el resto de la hora 00 desde otra descarga.
        store.merge("EURUSD", _candles(_START, 3))
        refresher.refresh("EURUSD", _START, _START + 2)

        hourly = store.read_range("EURUSD", 0, 2**31 - 1, "1h")
        assert len(hourly) == 1
        assert hourly[0].open == pytest.approx(1.0)  # primera vela de la hora
        assert hourly[0].close == pytest.approx(1.2 + 3)  # última vela de la hora

    def test_refresh_never_duplicates_times(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        store.merge("EURUSD", _candles(_START, 5))
        refresher = DerivedSeriesRefresher(store, ("5m",))
        refresher.refresh("EURUSD", _START, _START + 4)
        refresher.refresh("EURUSD", _START, _START + 4)  # idempotente

        times = _times(store, "EURUSD", "5m")
        assert len(times) == len(set(times))

    def test_derived_matches_direct_aggregation_of_the_base(self, tmp_path: Path) -> None:
        """El derivado es exactamente ``resample_ohlc`` sobre la base 1m (RF-009)."""
        store = _store(tmp_path)
        base = _candles(_START, 10)
        store.merge("EURUSD", base)
        DerivedSeriesRefresher(store, ("1h",)).refresh("EURUSD", _START, _START + 9)

        expected = resample_ohlc(base, "1h").candles
        assert store.read_range("EURUSD", 0, 2**31 - 1, "1h") == expected


class TestIncrementalRefresh:
    """TASK-049: la descarga incremental deja los derivados al día."""

    def test_second_download_extends_the_derived_range(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        refresher = DerivedSeriesRefresher(store, ("1h", "5m"))
        store.merge("EURUSD", _candles(_START, 3))
        refresher.refresh("EURUSD", _START, _START + 2)
        assert _times(store, "EURUSD", "1h") == [_START]

        store.merge("EURUSD", _candles(_START + _HOUR, 3))
        refresher.refresh("EURUSD", _START + _HOUR, _START + _HOUR + 2)

        assert _times(store, "EURUSD", "1h") == [_START, _START + _HOUR]
        assert _times(store, "EURUSD", "5m") == [_START, _START + _HOUR]

    def test_day_bucket_spans_the_whole_period(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        store.merge("EURUSD", _candles(_START, 3))
        DerivedSeriesRefresher(store, ("1d",)).refresh("EURUSD", _START, _START + 2)

        store.merge("EURUSD", _candles(_START + 2 * _HOUR, 3))
        DerivedSeriesRefresher(store, ("1d",)).refresh(
            "EURUSD", _START + 2 * _HOUR, _START + 2 * _HOUR
        )

        assert _times(store, "EURUSD", "1d") == [_START]  # mismo día, un solo bucket

    def test_default_timeframes_cover_rf_009(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        store.merge("EURUSD", _candles(_START, 3))
        DerivedSeriesRefresher(store).refresh("EURUSD", _START, _START + 2)

        for timeframe in DERIVED_TIMEFRAMES:
            assert store.has_series("EURUSD", timeframe), timeframe


class TestNoData:
    """Sin velas 1m no se crean Parquets derivados vacíos (RF-007)."""

    def test_missing_base_creates_no_derived_series(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        totals = DerivedSeriesRefresher(store, ("1h",)).refresh("EURUSD", _START, _START + _HOUR)

        assert totals == {}
        assert not store.has_series("EURUSD", "1h")

    def test_range_outside_the_base_is_skipped(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        store.merge("EURUSD", _candles(_START, 3))

        totals = DerivedSeriesRefresher(store, ("1h",)).refresh(
            "EURUSD", _START + 30 * _DAY, _START + 30 * _DAY + _HOUR
        )

        assert totals == {}

    def test_no_timeframes_configured_does_nothing(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        store.merge("EURUSD", _candles(_START, 3))
        assert DerivedSeriesRefresher(store, ()).refresh("EURUSD", _START, _START + 2) == {}

    def test_empty_hour_creates_no_parquet_for_that_bucket(self, tmp_path: Path) -> None:
        """Pedir una hora sin datos no crea un Parquet 1h vacío (RF-007)."""
        store = _store(tmp_path)
        store.merge("EURUSD", _candles(_START, 3))  # solo la hora 0
        empty_hour = _START + 5 * _HOUR

        totals = DerivedSeriesRefresher(store, ("1d", "1h")).refresh(
            "EURUSD", empty_hour, empty_hour + 60
        )

        assert totals == {"1d": 1, "1h": 0}
        assert not store.has_series("EURUSD", "1h")
        assert _times(store, "EURUSD", "1d") == [_START]


class TestInvalidInput:
    """El refrescador no adivina: entradas inválidas fallan de forma explícita."""

    def test_inverted_period_is_rejected(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        with pytest.raises(ValueError, match="Periodo inválido"):
            DerivedSeriesRefresher(store, ("1h",)).refresh("EURUSD", _START + 1, _START)

    def test_unsafe_symbol_is_rejected(self, tmp_path: Path) -> None:
        store = _store(tmp_path)
        with pytest.raises(ValueError, match="inválido"):
            DerivedSeriesRefresher(store, ("1h",)).refresh("../evil", _START, _START + 1)

    def test_non_canonical_timeframe_is_rejected_at_construction(self, tmp_path: Path) -> None:
        with pytest.raises(ValueError, match="no canónico como derivado"):
            DerivedSeriesRefresher(_store(tmp_path), ("2h",))  # type: ignore[arg-type]

    def test_base_timeframe_is_rejected_at_construction(self, tmp_path: Path) -> None:
        with pytest.raises(ValueError, match="no canónico como derivado"):
            DerivedSeriesRefresher(_store(tmp_path), ("1m",))


class TestParseTimeframes:
    """``FXTRAD_DERIVED_TIMEFRAMES`` recorta el conjunto de derivados."""

    def test_empty_value_uses_the_default(self) -> None:
        assert parse_timeframes(None) == DERIVED_TIMEFRAMES
        assert parse_timeframes("  ") == DERIVED_TIMEFRAMES

    def test_selects_the_requested_subset_in_order(self) -> None:
        assert parse_timeframes("1h,5m") == ("1h", "5m")

    def test_removes_duplicates_keeping_the_first(self) -> None:
        assert parse_timeframes("5m,1h,5m") == ("5m", "1h")

    def test_ignores_empty_tokens_between_separators(self) -> None:
        assert parse_timeframes("5m,,1h") == ("5m", "1h")

    def test_value_without_any_valid_timeframe_is_rejected(self) -> None:
        with pytest.raises(ValueError, match="no define ningún timeframe"):
            parse_timeframes(" , ,")

    def test_unknown_timeframe_is_rejected(self) -> None:
        with pytest.raises(ValueError, match="no canónico"):
            parse_timeframes("5m,7m")

    def test_base_timeframe_is_rejected(self) -> None:
        with pytest.raises(ValueError, match="es la base"):
            parse_timeframes("1m")

    def test_reads_the_environment_variable(self, monkeypatch: object) -> None:
        monkeypatch.setenv("FXTRAD_DERIVED_TIMEFRAMES", "15m,1h")  # type: ignore[attr-defined]
        assert timeframes_from_env() == ("15m", "1h")

    def test_environment_falls_back_to_the_default(self, monkeypatch: object) -> None:
        monkeypatch.delenv("FXTRAD_DERIVED_TIMEFRAMES", raising=False)  # type: ignore[attr-defined]
        assert timeframes_from_env() == DERIVED_TIMEFRAMES
