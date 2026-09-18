"""Calendario de mercado por activo (RF-004).

Determina qué días el mercado está abierto para un activo: excluye el cierre
semanal (fin de semana) y los feriados configurables por activo, evitando que
los gaps reales de mercado se interpreten como señales falsas en el pipeline.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from datetime import UTC, date, datetime

import structlog

logger = structlog.get_logger()

# date.weekday(): lunes = 0 ... domingo = 6
_WEEKEND: frozenset[int] = frozenset({5, 6})  # sábado y domingo


class MarketCalendar:
    """Calendario de días de mercado para un activo.

    Args:
        holidays: Fechas de cierre adicionales (feriados), configurables por
            activo. El cierre por fin de semana se aplica siempre.
        closed_weekdays: Días de la semana cerrados según ``date.weekday()``
            (lunes=0 ... domingo=6). Por defecto sábado y domingo, el cierre
            semanal habitual de forex, metales y petróleo.
    """

    def __init__(
        self,
        holidays: Iterable[date] = (),
        *,
        closed_weekdays: Iterable[int] = _WEEKEND,
    ) -> None:
        self._holidays: frozenset[date] = frozenset(holidays)
        self._closed_weekdays: frozenset[int] = frozenset(closed_weekdays)
        invalid = self._closed_weekdays.difference(range(7))
        if invalid:
            raise ValueError(
                "Días cerrados inválidos (0=lunes ... 6=domingo): " f"{sorted(invalid)}"
            )
        logger.debug(
            "calendario_inicializado",
            feriados=len(self._holidays),
            dias_cerrados=sorted(self._closed_weekdays),
        )

    @property
    def holidays(self) -> frozenset[date]:
        """Feriados configurados para el activo."""
        return self._holidays

    @property
    def closed_weekdays(self) -> frozenset[int]:
        """Días de la semana en los que el activo no opera."""
        return self._closed_weekdays

    def is_open_day(self, day: date) -> bool:
        """Devuelve True si el mercado está abierto el día indicado."""
        return day.weekday() not in self._closed_weekdays and day not in self._holidays

    def is_closed_day(self, day: date) -> bool:
        """Devuelve True si el mercado está cerrado el día indicado."""
        return not self.is_open_day(day)

    def open_days(self, start: date, end: date) -> Iterator[date]:
        """Itera los días abiertos del rango inclusivo ``[start, end]``.

        Raises:
            ValueError: si ``end`` es anterior a ``start``.
        """
        if end < start:
            raise ValueError(f"Rango de calendario inválido: fin ({end}) antes de inicio ({start})")
        cursor = start
        while cursor <= end:
            if self.is_open_day(cursor):
                yield cursor
            cursor = date.fromordinal(cursor.toordinal() + 1)

    def is_open_timestamp(self, timestamp: int) -> bool:
        """Devuelve True si un segundo UTC cae en un día de mercado.

        El mercado se considera cerrado todo el día si el día calendario (UTC)
        es de cierre; los horarios exactos de apertura/cierre se resuelven en el
        pipeline (TASK-013).
        """
        day = datetime.fromtimestamp(timestamp, tz=UTC).date()
        return self.is_open_day(day)


__all__ = ["MarketCalendar"]
