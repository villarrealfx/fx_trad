"""Tests del calendario de mercado por activo (TASK-012, RF-004).

Cubre el cierre semanal, los feriados configurables y un rango completo de marzo
de 2026 con expectativas deterministas (calculadas al planificar la tarea).
"""

from __future__ import annotations

from datetime import date

import pytest

from fxtrad.pipeline import MarketCalendar

_MARCH_2026_START = date(2026, 3, 1)
_MARCH_2026_END = date(2026, 3, 31)
_MARCH_2026_WEEKENDS = {
    date(2026, 3, 1),
    date(2026, 3, 7),
    date(2026, 3, 8),
    date(2026, 3, 14),
    date(2026, 3, 15),
    date(2026, 3, 21),
    date(2026, 3, 22),
    date(2026, 3, 28),
    date(2026, 3, 29),
}
_SATURDAY_UTC_TS = 1772841600  # 2026-03-07T00:00:00Z
_MONDAY_UTC_TS = 1772409600  # 2026-03-02T00:00:00Z


@pytest.fixture
def default_calendar() -> MarketCalendar:
    return MarketCalendar()


class TestWeekendClosure:
    """Cierre semanal: sábado y domingo cerrados por defecto."""

    def test_saturday_and_sunday_are_closed(self, default_calendar: MarketCalendar) -> None:
        for day in _MARCH_2026_WEEKENDS:
            assert default_calendar.is_closed_day(day), f"Esperado cerrado: {day}"
            assert not default_calendar.is_open_day(day)

    def test_weekdays_are_open(self, default_calendar: MarketCalendar) -> None:
        for day in (
            date(2026, 3, 2),
            date(2026, 3, 3),
            date(2026, 3, 4),
            date(2026, 3, 5),
            date(2026, 3, 6),
        ):
            assert default_calendar.is_open_day(day), f"Esperado abierto: {day}"
            assert not default_calendar.is_closed_day(day)


class TestConfigurableHolidays:
    """Feriados configurables por activo."""

    def test_configured_holiday_is_closed(self) -> None:
        calendar = MarketCalendar(holidays=[date(2026, 3, 2)])
        assert calendar.is_closed_day(date(2026, 3, 2))
        assert calendar.holidays == frozenset({date(2026, 3, 2)})

    def test_calendars_are_independent_per_asset(self) -> None:
        calendar_a = MarketCalendar(holidays=[date(2026, 3, 2)])
        calendar_b = MarketCalendar()
        assert calendar_a.is_closed_day(date(2026, 3, 2))
        assert calendar_b.is_open_day(date(2026, 3, 2))

    def test_custom_closed_weekdays_are_respected(self) -> None:
        calendar = MarketCalendar(closed_weekdays={0, 5, 6})  # cerrado además los lunes
        assert calendar.closed_weekdays == frozenset({0, 5, 6})
        assert calendar.is_closed_day(date(2026, 3, 2))  # lunes
        assert calendar.is_open_day(date(2026, 3, 3))  # martes

    def test_invalid_closed_weekday_is_rejected(self) -> None:
        with pytest.raises(ValueError):
            MarketCalendar(closed_weekdays={7})


class TestMarch2026Range:
    """DoD: un rango de marzo 2026 sin filas en días de mercado cerrado."""

    def test_full_month_has_twenty_two_open_days(self, default_calendar: MarketCalendar) -> None:
        open_days = list(default_calendar.open_days(_MARCH_2026_START, _MARCH_2026_END))
        assert len(open_days) == 22  # 31 días - 9 días de fin de semana

    def test_full_month_never_contains_weekend(self, default_calendar: MarketCalendar) -> None:
        open_days = set(default_calendar.open_days(_MARCH_2026_START, _MARCH_2026_END))
        assert open_days.isdisjoint(_MARCH_2026_WEEKENDS)

    def test_range_with_holiday_excludes_it(self) -> None:
        calendar = MarketCalendar(holidays=[date(2026, 3, 2)])
        open_days = list(calendar.open_days(_MARCH_2026_START, _MARCH_2026_END))
        assert len(open_days) == 21
        assert date(2026, 3, 2) not in open_days

    def test_open_days_iterates_in_chronological_order(
        self, default_calendar: MarketCalendar
    ) -> None:
        days = list(default_calendar.open_days(date(2026, 3, 1), date(2026, 3, 3)))
        assert days == [date(2026, 3, 2), date(2026, 3, 3)]

    def test_invalid_range_raises_value_error(self, default_calendar: MarketCalendar) -> None:
        with pytest.raises(ValueError):
            list(default_calendar.open_days(date(2026, 3, 31), date(2026, 3, 1)))


class TestTimestampApi:
    """Consulta por timestamps en segundos UTC (uso directo del pipeline)."""

    def test_saturday_timestamp_is_closed(self, default_calendar: MarketCalendar) -> None:
        assert not default_calendar.is_open_timestamp(_SATURDAY_UTC_TS)

    def test_monday_timestamp_is_open(self, default_calendar: MarketCalendar) -> None:
        assert default_calendar.is_open_timestamp(_MONDAY_UTC_TS)

    def test_holiday_timestamp_is_closed(self) -> None:
        calendar = MarketCalendar(holidays=[date(2026, 3, 2)])
        assert not calendar.is_open_timestamp(_MONDAY_UTC_TS)
