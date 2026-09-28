"""Planificador de bloques de descarga por calendario (TASK-052, RF-102/RNF-101).

Estima las velas de 1 minuto que cubre un rango temporal según el calendario de
mercado (RF-004) y particiona el rango en bloques que no superan el máximo de
puntos por petición de la API de Dukascopy (30.000, ADR-013). Es lógica pura y
determinista: no realiza E/S y sirve de base al pacing y a la reanudación
(TASK-053/TASK-056).
"""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, date, datetime

import structlog

from fxtrad.ingest.times import to_epoch_seconds
from fxtrad.pipeline import MarketCalendar

logger = structlog.get_logger()

MINUTE_SECONDS = 60
"""Segundos por vela de 1 minuto."""

MINUTES_PER_DAY = 1440
"""Minutos de un día completo a 1 m (24 h)."""

MAX_API_POINTS = 30_000
"""Máximo de puntos por petición de freeserv (ADR-013)."""

DEFAULT_MAX_BLOCK_CANDLES = MAX_API_POINTS
"""Tamaño máximo por defecto de un bloque de descarga."""


@dataclass(frozen=True, slots=True)
class DownloadBlock:
    """Bloque de descarga con su ventana temporal y velas estimadas.

    Attributes:
        start: Primer segundo UTC del bloque (inclusivo).
        end: Último segundo UTC del bloque (inclusivo).
        planned_candles: Velas de 1 m estimadas para los días abiertos del bloque.
    """

    start: int
    end: int
    planned_candles: int


def _validate_range(start: int, end: int) -> None:
    """Valida que el rango temporal sea creciente.

    Raises:
        ValueError: si ``end`` es anterior a ``start``.
    """
    if end < start:
        raise ValueError(f"Rango inválido: fin ({end}) anterior a inicio ({start})")


def _day_bounds(day: date) -> tuple[int, int]:
    """Devuelve el primer y último segundo UTC del día (ambos inclusivos)."""
    start = to_epoch_seconds(datetime(day.year, day.month, day.day, tzinfo=UTC))
    return start, start + MINUTES_PER_DAY * MINUTE_SECONDS - 1


def _candles_in(lo: int, hi: int) -> int:
    """Cuenta las velas de 1 m alineadas al minuto dentro de ``[lo, hi]``."""
    if hi < lo:
        return 0
    first = -(-lo // MINUTE_SECONDS)
    last = hi // MINUTE_SECONDS
    return max(0, last - first + 1)


def _open_day_segments(
    start: int, end: int, calendar: MarketCalendar
) -> Iterator[tuple[int, int, int]]:
    """Itera ``(lo, hi, velas)`` por cada día abierto del rango ``[start, end]``."""
    first_day = datetime.fromtimestamp(start, tz=UTC).date()
    last_day = datetime.fromtimestamp(end, tz=UTC).date()
    for day in calendar.open_days(first_day, last_day):
        day_start, day_end = _day_bounds(day)
        lo = max(start, day_start)
        hi = min(end, day_end)
        candles = _candles_in(lo, hi)
        if candles > 0:
            yield lo, hi, candles


def planned_candles(start: int, end: int, calendar: MarketCalendar | None = None) -> int:
    """Estima las velas de 1 m de los días abiertos en ``[start, end]``.

    Args:
        start: Primer segundo UTC del rango (inclusivo).
        end: Último segundo UTC del rango (inclusivo).
        calendar: Calendario de mercado; por defecto solo cierra fines de semana.

    Returns:
        Número de velas de 1 m estimadas (0 si no hay días abiertos).

    Raises:
        ValueError: si ``end`` es anterior a ``start``.
    """
    _validate_range(start, end)
    cal = calendar if calendar is not None else MarketCalendar()
    return sum(candles for _, _, candles in _open_day_segments(start, end, cal))


def plan_blocks(
    start: int,
    end: int,
    calendar: MarketCalendar | None = None,
    max_block_candles: int = DEFAULT_MAX_BLOCK_CANDLES,
) -> list[DownloadBlock]:
    """Particiona ``[start, end]`` en bloques de ≤ ``max_block_candles`` velas.

    Los bloques agrupan días abiertos consecutivos y nunca superan el máximo de
    puntos por petición (ADR-013). Los bloques resultantes están ordenados y no
    se solapan.

    Args:
        start: Primer segundo UTC del rango (inclusivo).
        end: Último segundo UTC del rango (inclusivo).
        calendar: Calendario de mercado; por defecto solo cierra fines de semana.
        max_block_candles: Máximo de velas por bloque; debe permitir un día
            completo (≥ ``MINUTES_PER_DAY``).

    Returns:
        Lista de bloques ordenados; vacía si no hay días abiertos.

    Raises:
        ValueError: si ``end`` es anterior a ``start`` o si ``max_block_candles``
            no permite al menos un día completo.
    """
    _validate_range(start, end)
    if max_block_candles < MINUTES_PER_DAY:
        raise ValueError(
            "max_block_candles debe permitir un día completo "
            f"(≥ {MINUTES_PER_DAY}), se recibió {max_block_candles}"
        )
    cal = calendar if calendar is not None else MarketCalendar()
    blocks: list[DownloadBlock] = []
    block_start: int | None = None
    block_end = 0
    block_candles = 0
    for lo, hi, candles in _open_day_segments(start, end, cal):
        if block_candles and block_candles + candles > max_block_candles:
            assert block_start is not None  # garantizado: block_candles > 0
            blocks.append(DownloadBlock(block_start, block_end, block_candles))
            block_start = None
            block_candles = 0
        if block_start is None:
            block_start = lo
        block_end = hi
        block_candles += candles
    if block_start is not None:
        blocks.append(DownloadBlock(block_start, block_end, block_candles))
    logger.debug(
        "planificacion_descarga",
        bloques=len(blocks),
        velas_planificadas=sum(block.planned_candles for block in blocks),
        max_bloque=max_block_candles,
    )
    return blocks


__all__ = [
    "DEFAULT_MAX_BLOCK_CANDLES",
    "MAX_API_POINTS",
    "MINUTES_PER_DAY",
    "MINUTE_SECONDS",
    "DownloadBlock",
    "plan_blocks",
    "planned_candles",
]
