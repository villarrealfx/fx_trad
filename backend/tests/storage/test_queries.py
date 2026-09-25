"""Tests de la capa de consulta parametrizada (TASK-016, RF-005/RNF-002).

DoD: ``SeriesQuery.read`` devuelve el OHLC del activo en el rango con un
dataset de fixture, ordenado ascendentemente por ``time``, y rechaza rangos
invertidos (RNF-002) y timeframes sin serie persistida (contrato TASK-009:
hoy solo la base ``1s``).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.storage import (
    InvalidRangeError,
    InvalidTimeframeError,
    ParquetSeriesStore,
    SeriesQuery,
)

_BASE_TIME = 1786442400  # 2026-08-11T10:00:00Z
_HOUR = 3600

_SERIES = [1.1, 1.2, 1.3, 1.4, 1.5]


def _candle(time: int, price: float) -> Candle:
    """Construye una vela plana (``open=high=low=close``) para la aserción."""
    return Candle(time=time, open=price, high=price, low=price, close=price)


def _build_store(tmp_path: Path, symbol: str = "EURUSD") -> ParquetSeriesStore:
    """Crea un almacén con la serie fixture ``EURUSD`` horaria (TASK-015)."""
    store = ParquetSeriesStore(tmp_path)
    store.write(
        symbol,
        [_candle(_BASE_TIME + i * _HOUR, price) for i, price in enumerate(_SERIES)],
    )
    return store


class TestRead:
    """La consulta devuelve el OHLC del activo en el rango pedido."""

    def test_returns_candles_in_inclusive_range(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)

        candles = SeriesQuery(store).read(
            "EURUSD", start=_BASE_TIME + _HOUR, end=_BASE_TIME + 3 * _HOUR
        )

        assert candles == [
            _candle(_BASE_TIME + _HOUR, 1.2),
            _candle(_BASE_TIME + 2 * _HOUR, 1.3),
            _candle(_BASE_TIME + 3 * _HOUR, 1.4),
        ]

    def test_range_is_sorted_ascending_by_time(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)

        candles = SeriesQuery(store).read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 4 * _HOUR)

        times = [candle.time for candle in candles]
        assert times == sorted(times)

    def test_missing_start_returns_whole_series(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)

        candles = SeriesQuery(store).read("EURUSD", end=_BASE_TIME + 2 * _HOUR)

        assert candles == [
            _candle(_BASE_TIME, 1.1),
            _candle(_BASE_TIME + _HOUR, 1.2),
            _candle(_BASE_TIME + 2 * _HOUR, 1.3),
        ]

    def test_missing_end_returns_whole_series(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)

        candles = SeriesQuery(store).read("EURUSD", start=_BASE_TIME + 3 * _HOUR)

        assert candles == [
            _candle(_BASE_TIME + 3 * _HOUR, 1.4),
            _candle(_BASE_TIME + 4 * _HOUR, 1.5),
        ]

    def test_no_bounds_returns_entire_series(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)

        candles = SeriesQuery(store).read("EURUSD")

        assert len(candles) == 5

    def test_empty_range_returns_empty_list(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)

        candles = SeriesQuery(store).read(
            "EURUSD", start=_BASE_TIME + 10 * _HOUR, end=_BASE_TIME + 12 * _HOUR
        )

        assert candles == []

    def test_unknown_symbol_raises_file_not_found(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)

        with pytest.raises(FileNotFoundError, match="no tiene serie almacenada"):
            SeriesQuery(store).read("XAUUSD")


class TestRangeValidation:
    """Un rango invertido viola RNF-002 y se rechaza explícitamente."""

    def test_start_after_end_raises(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)

        with pytest.raises(InvalidRangeError, match="start"):
            SeriesQuery(store).read("EURUSD", start=_BASE_TIME + 2 * _HOUR, end=_BASE_TIME)


class TestTimeframeContract:
    """El contrato RNF-008/TASK-009: base ``1s`` por defecto y rechazo de no canónicos."""

    def test_default_timeframe_is_one_second(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)

        candles = SeriesQuery(store).read("EURUSD")

        assert SeriesQuery(store).read("EURUSD") == candles

    def test_unsupported_timeframe_raises(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)

        with pytest.raises(InvalidTimeframeError, match="canónico"):
            SeriesQuery(store).read("EURUSD", timeframe="3m")  # type: ignore[arg-type]


class TestHasSeries:
    """``has_series`` reusa el catálogo del almacén (TASK-015)."""

    def test_reports_existing_and_missing_assets(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)
        query = SeriesQuery(store)

        assert query.has_series("EURUSD") is True
        assert query.has_series("XAUUSD") is False


class TestVersion:
    """``version`` delega en el almacén para detectar una base actualizada."""

    def test_version_is_none_without_series(self, tmp_path: Path) -> None:
        assert SeriesQuery(ParquetSeriesStore(tmp_path)).version("EURUSD") is None

    def test_version_follows_the_stored_series(self, tmp_path: Path) -> None:
        store = _build_store(tmp_path)
        before = SeriesQuery(store).version("EURUSD")

        store.merge("EURUSD", [_candle(1_000_000, 9.9)])

        assert SeriesQuery(store).version("EURUSD") != before
