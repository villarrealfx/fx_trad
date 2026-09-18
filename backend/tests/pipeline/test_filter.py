"""Tests del filtro de periodos sin mercado (TASK-013, RF-004).

Usa timestamps fijos de marzo de 2026 (viernes 6 a martes 10), calculados al
planificar la tarea, para verificar que un rango con fin de semana no produce
filas en sábado ni domingo.
"""

from __future__ import annotations

from datetime import date

import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.pipeline import MarketCalendar, filter_open_candles, filter_open_timestamps

_FRI_LATE = 1772841599  # 2026-03-06T23:59:59Z (viernes)
_SAT_OPEN = 1772841600  # 2026-03-07T00:00:00Z (sábado)
_SAT_MID = 1772884800  # 2026-03-07T12:00:00Z (sábado)
_SUN_MID = 1772971200  # 2026-03-08T12:00:00Z (domingo)
_SUN_LATE = 1773014399  # 2026-03-08T23:59:59Z (domingo)
_MON_OPEN = 1773014400  # 2026-03-09T00:00:00Z (lunes)
_TUE_OPEN = 1773100800  # 2026-03-10T00:00:00Z (martes)


@pytest.fixture
def default_calendar() -> MarketCalendar:
    return MarketCalendar()


class TestWeekendFiltering:
    """DoD: un rango con fin de semana no produce filas en sábado/domingo."""

    def test_weekend_range_drops_all_saturday_and_sunday(
        self, default_calendar: MarketCalendar
    ) -> None:
        ts = [_FRI_LATE, _SAT_OPEN, _SAT_MID, _SUN_MID, _SUN_LATE, _MON_OPEN]
        result = list(filter_open_timestamps(ts, default_calendar))
        assert result == [_FRI_LATE, _MON_OPEN]

    def test_full_weekend_is_completely_excluded(self, default_calendar: MarketCalendar) -> None:
        weekend_grid = [_SAT_OPEN + step for step in range(0, 24 * 3600, 3600)] + [_SUN_MID]
        result = list(filter_open_timestamps(weekend_grid, default_calendar))
        assert result == []

    def test_open_days_are_conserved(self, default_calendar: MarketCalendar) -> None:
        ts = [_MON_OPEN, _TUE_OPEN]
        result = list(filter_open_timestamps(ts, default_calendar))
        assert result == [_MON_OPEN, _TUE_OPEN]

    def test_monday_boundary_included_sunday_excluded(
        self, default_calendar: MarketCalendar
    ) -> None:
        ts = [_SUN_LATE, _MON_OPEN]
        result = list(filter_open_timestamps(ts, default_calendar))
        assert result == [_MON_OPEN]


class TestCandleFiltering:
    """El filtro sobre velas usa ``time`` preservando el contrato OHLC."""

    def _candle(self, ts: int) -> Candle:
        return Candle(time=ts, open=1.0, high=2.0, low=0.5, close=1.5)

    def test_candles_dropped_on_weekend(self, default_calendar: MarketCalendar) -> None:
        candles = [self._candle(t) for t in (_SAT_MID, _SUN_MID, _MON_OPEN)]
        result = filter_open_candles(candles, default_calendar)
        assert [c.time for c in result] == [_MON_OPEN]

    def test_candles_preserve_order(self, default_calendar: MarketCalendar) -> None:
        candles = [self._candle(t) for t in (_SAT_OPEN, _FRI_LATE, _MON_OPEN)]
        result = filter_open_candles(candles, default_calendar)
        assert [c.time for c in result] == [_FRI_LATE, _MON_OPEN]

    def test_configured_holiday_is_excluded(self) -> None:
        calendar = MarketCalendar(holidays=[date(2026, 3, 2)])
        candles = [
            self._candle(1772409600),  # 2026-03-02 00:00Z (lunes, feriado configurado)
            self._candle(_MON_OPEN),
        ]
        result = filter_open_candles(candles, calendar)
        assert [c.time for c in result] == [_MON_OPEN]


class TestEdgeCases:
    """Casos límite del filtro."""

    def test_empty_input_yields_nothing(self, default_calendar: MarketCalendar) -> None:
        assert list(filter_open_timestamps([], default_calendar)) == []
        assert filter_open_candles([], default_calendar) == []

    def test_all_open_input_is_unchanged(self, default_calendar: MarketCalendar) -> None:
        ts = [_MON_OPEN, _TUE_OPEN, _FRI_LATE]
        assert list(filter_open_timestamps(ts, default_calendar)) == [*ts]
