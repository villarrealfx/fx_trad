"""Verificación de la exclusión de mercado cerrado (TASK-069, RF-106).

DoD: el filtro no deja filas de 1 m en fines de semana ni feriados.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

from fxtrad.contracts.ohlc import Candle
from fxtrad.pipeline import MarketCalendar, filter_open_candles

_DAY = 86_400
_MONDAY = 1_772_409_600  # 2026-03-02T00:00:00Z


def _candles_for_days(offsets: list[int], minutes: int = 3) -> list[Candle]:
    """Velas de 1 m al inicio de cada día indicado (offset en días desde el lunes)."""
    candles: list[Candle] = []
    for offset in offsets:
        day_start = _MONDAY + offset * _DAY
        for minute in range(minutes):
            time = day_start + minute * 60
            candles.append(Candle(time=time, open=1.0, high=1.0, low=1.0, close=1.0))
    return candles


def _day(time: int) -> date:
    return datetime.fromtimestamp(time, tz=UTC).date()


class TestMarketFilter:
    """Solo sobreviven las velas de días de mercado abierto."""

    def test_weekend_candles_are_removed(self) -> None:
        candles = _candles_for_days([5, 6])  # sábado y domingo

        kept = filter_open_candles(candles, MarketCalendar())

        assert kept == []

    def test_holiday_candles_are_removed(self) -> None:
        # Miércoles 2026-03-04 como feriado.
        calendar = MarketCalendar(holidays=[date(2026, 3, 4)])
        candles = _candles_for_days([0, 1, 2, 3, 4, 5, 6])  # lunes a domingo

        kept = filter_open_candles(candles, calendar)

        kept_days = {_day(candle.time) for candle in kept}
        assert kept_days == {date(2026, 3, 2), date(2026, 3, 3), date(2026, 3, 5), date(2026, 3, 6)}

    def test_no_kept_candle_falls_on_a_closed_day(self) -> None:
        calendar = MarketCalendar(holidays=[date(2026, 3, 4)])
        candles = _candles_for_days([0, 1, 2, 3, 4, 5, 6])

        kept = filter_open_candles(candles, calendar)

        assert all(calendar.is_open_timestamp(candle.time) for candle in kept)
        assert len(kept) == 12  # 4 días abiertos × 3 velas
