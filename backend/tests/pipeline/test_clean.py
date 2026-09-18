"""Tests de la limpieza e imputación de velas (TASK-010, RF-003).

Valida la política PA-3 "Eliminar + FF acotado" (G_MAX=60 s) sobre las
piezas: passthrough de velas válidas, eliminación de OHLC no finitos,
forward-fill de huecos intra-sesión y no-fill de huecos grandes.
"""

from __future__ import annotations

import pytest

from fxtrad.pipeline import RawCandle, clean_candles

_SEC = 1772409600  # 2026-03-02 00:00:00 UTC (lunes)


def _row(time: int, open: float, high: float, low: float, close: float) -> RawCandle:
    return RawCandle(time=time, open=open, high=high, low=low, close=close)


class TestCleanPassThrough:
    """Las filas válidas pasan sin modificación ni imputación."""

    def test_ordered_valid_rows_are_preserved(self) -> None:
        rows = [
            _row(_SEC, 1.09, 1.10, 1.08, 1.09),
            _row(_SEC + 1, 1.09, 1.09, 1.08, 1.085),
        ]
        result = clean_candles(rows)
        assert [c.time for c in result.candles] == [_SEC, _SEC + 1]
        assert result.rows_dropped == 0
        assert result.rows_filled == 0

    def test_single_row_is_kept_without_fill(self) -> None:
        result = clean_candles([_row(_SEC, 1.09, 1.10, 1.08, 1.09)])
        assert len(result.candles) == 1
        assert result.rows_filled == 0

    def test_empty_input_yields_empty_result(self) -> None:
        result = clean_candles([])
        assert result.candles == []
        assert result.rows_dropped == 0
        assert result.rows_filled == 0

    def test_from_row_coerces_types_from_raw_record(self) -> None:
        row: dict[str, float | int] = {
            "time": _SEC,
            "open": 1.09,
            "high": 1.10,
            "low": 1.08,
            "close": 1.09,
        }
        raw = RawCandle.from_row(row)
        assert raw == _row(_SEC, 1.09, 1.10, 1.08, 1.09)
        assert isinstance(raw.time, int)

    def test_unordered_input_is_sorted(self) -> None:
        rows = [
            _row(_SEC + 2, 1.09, 1.10, 1.08, 1.09),
            _row(_SEC, 1.09, 1.10, 1.08, 1.09),
            _row(_SEC + 1, 1.09, 1.10, 1.08, 1.09),
        ]
        result = clean_candles(rows)
        assert [c.time for c in result.candles] == [_SEC, _SEC + 1, _SEC + 2]

    def test_duplicate_timestamps_are_dropped(self) -> None:
        rows = [_row(_SEC, 1.09, 1.10, 1.08, 1.09), _row(_SEC, 1.11, 1.12, 1.07, 1.10)]
        result = clean_candles(rows)
        assert [c.time for c in result.candles] == [_SEC]
        assert result.rows_dropped == 1


class TestRemoveNonFinitePrices:
    """PA-3: las filas con NaN o inf se eliminan, nunca se inventa precio."""

    @pytest.mark.parametrize("field", ["open", "high", "low", "close"])
    def test_nan_field_drops_the_row(self, field: str) -> None:
        values: dict[str, float] = {"open": 1.09, "high": 1.10, "low": 1.08, "close": 1.09}
        values[field] = float("nan")
        rows = [_row(_SEC, 1.09, 1.10, 1.08, 1.09), RawCandle(time=_SEC + 1, **values)]
        result = clean_candles(rows)
        assert [c.time for c in result.candles] == [_SEC]
        assert result.rows_dropped == 1

    def test_positive_infinity_drops_the_row(self) -> None:
        result = clean_candles([_row(_SEC, 1.09, float("inf"), 1.08, 1.09)])
        assert result.candles == []
        assert result.rows_dropped == 1

    def test_negative_infinity_drops_the_row(self) -> None:
        result = clean_candles([_row(_SEC, 1.09, 1.10, float("-inf"), 1.09)])
        assert result.candles == []
        assert result.rows_dropped == 1

    def test_negative_price_is_dropped(self) -> None:
        # Los precios deben ser no negativos (contrato OHLC): una vela fuera
        # de rango se elimina con el mismo criterio que un NaN.
        rows = [
            _row(_SEC, 1.09, 1.10, -1.0, 1.09),
            _row(_SEC + 1, 1.09, 1.10, 1.08, 1.09),
        ]
        result = clean_candles(rows)
        assert [c.time for c in result.candles] == [_SEC + 1]
        assert result.rows_dropped == 1


class TestForwardFillBoundedGaps:
    """PA-3: huecos intra-sesión ≤ 60 s se rellenan con vela plana al último close."""

    def test_gap_within_limit_fills_every_missing_second(self) -> None:
        rows = [_row(_SEC, 1.09, 1.10, 1.08, 1.09), _row(_SEC + 3, 1.09, 1.10, 1.08, 1.095)]
        result = clean_candles(rows)
        assert [c.time for c in result.candles] == [_SEC, _SEC + 1, _SEC + 2, _SEC + 3]
        assert result.rows_filled == 2

    def test_filled_candle_is_flat_at_previous_close(self) -> None:
        rows = [_row(_SEC, 1.09, 1.10, 1.08, 1.0850), _row(_SEC + 2, 1.09, 1.10, 1.08, 1.0950)]
        result = clean_candles(rows)
        filled = result.candles[1]
        assert (filled.open, filled.high, filled.low, filled.close) == (
            1.0850,
            1.0850,
            1.0850,
            1.0850,
        )

    def test_gap_equal_to_limit_is_filled(self) -> None:
        rows = [_row(_SEC, 1.09, 1.10, 1.08, 1.09), _row(_SEC + 60, 1.09, 1.10, 1.08, 1.09)]
        result = clean_candles(rows)
        assert [c.time for c in result.candles][-1] == _SEC + 60
        assert result.rows_filled == 59

    def test_consecutive_gaps_chain_using_last_close(self) -> None:
        # Un hueco de 2 s produce dos imputaciones encadenadas, ambas planas
        # al close de la última vela procesada (la imputación anterior).
        rows = [_row(_SEC, 1.09, 1.10, 1.08, 1.09), _row(_SEC + 3, 1.09, 1.10, 1.08, 1.10)]
        result = clean_candles(rows)
        assert [c.time for c in result.candles] == [_SEC, _SEC + 1, _SEC + 2, _SEC + 3]
        assert result.rows_filled == 2
        for candle in result.candles[1:3]:
            assert (candle.open, candle.high, candle.low, candle.close) == (1.09, 1.09, 1.09, 1.09)


class TestNoFillBeyondLimit:
    """PA-3: huecos > 60 s no se rellenan; quedan como hueco real."""

    def test_gap_over_limit_is_not_filled(self) -> None:
        rows = [_row(_SEC, 1.09, 1.10, 1.08, 1.09), _row(_SEC + 61, 1.09, 1.10, 1.08, 1.09)]
        result = clean_candles(rows)
        assert [c.time for c in result.candles] == [_SEC, _SEC + 61]
        assert result.rows_filled == 0

    def test_zero_max_gap_disables_fill(self) -> None:
        rows = [_row(_SEC, 1.09, 1.10, 1.08, 1.09), _row(_SEC + 1, 1.09, 1.10, 1.08, 1.09)]
        result = clean_candles(rows, max_gap_seconds=0)
        assert [c.time for c in result.candles] == [_SEC, _SEC + 1]
        assert result.rows_filled == 0


class TestOutputInvariants:
    """La salida es siempre OHLC válido consumible por el frontend (RF-003)."""

    def test_every_candle_has_unique_ascending_utc_times(self) -> None:
        rows = [_row(_SEC, 1.0, 1.0, 1.0, 1.0), _row(_SEC + 30, 1.0, 1.0, 1.0, 1.0)]
        result = clean_candles(rows)
        times = [c.time for c in result.candles]
        assert times == sorted(set(times))

    def test_all_prices_are_non_negative_and_ordered(self) -> None:
        rows = [
            _row(_SEC, 1.0950, 1.1000, 1.0900, 1.0950),
            _row(_SEC + 5, 1.0960, 1.1010, 1.0940, 1.0990),
        ]
        for candle in clean_candles(rows).candles:
            assert 0 <= candle.low <= candle.open <= candle.high
            assert 0 <= candle.low <= candle.close <= candle.high
