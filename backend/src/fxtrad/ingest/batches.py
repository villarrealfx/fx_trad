"""Descomposición del rango de descarga en tandas de 6–12 meses (TASK-064, RF-104).

Una descarga larga se ejecuta por **tandas** (ADR-015) para acotar el impacto de
un corte y poder reportar progreso y reanudar (TASK-065). Cada tanda planifica
sus bloques con ``plan_blocks`` (TASK-052) y expone cuántos bloques contiene, de
modo que el progreso se reporta como bloques completados/total.

El rango se parte en tandas contiguas de tamaño ~igual: si dura hasta un año es
una sola tanda; si no, se usan ``ceil(duración / 1 año)`` tandas, lo que deja
cada una en el intervalo ~6–12 meses de ADR-015.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import structlog

from fxtrad.ingest.planner import DownloadBlock, plan_blocks
from fxtrad.pipeline import MarketCalendar

logger = structlog.get_logger()

MAX_BATCH_SECONDS = 365 * 24 * 3600
"""Duración máxima de una tanda: 1 año (ADR-015)."""

MIN_BATCH_SECONDS = MAX_BATCH_SECONDS // 2
"""Duración mínima efectiva de una tanda: medio año (~6 meses, ADR-015)."""


@dataclass(frozen=True, slots=True)
class DownloadBatch:
    """Tanda de descarga con su ventana temporal y sus bloques planificados.

    Attributes:
        start: Primer segundo UTC de la tanda (inclusivo).
        end: Último segundo UTC de la tanda (inclusivo).
        blocks: Bloques (TASK-052) que cubren la tanda.
    """

    start: int
    end: int
    blocks: tuple[DownloadBlock, ...]

    @property
    def total_blocks(self) -> int:
        """Número total de bloques de la tanda (denominador del progreso)."""
        return len(self.blocks)

    @property
    def duration(self) -> int:
        """Duración de la tanda en segundos."""
        return self.end - self.start


def plan_batches(
    start: int,
    end: int,
    *,
    calendar: MarketCalendar | None = None,
) -> list[DownloadBatch]:
    """Descompone ``[start, end]`` en tandas contiguas de 6–12 meses.

    Args:
        start: Primer segundo UTC del rango (inclusivo).
        end: Último segundo UTC del rango (inclusivo).
        calendar: Calendario de mercado para planificar los bloques de cada
            tanda; por defecto solo cierra fines de semana.

    Returns:
        Tandas contiguas que cubren el rango completo; una sola si dura hasta
        un año.

    Raises:
        ValueError: si ``end`` es anterior a ``start``.
    """
    if end < start:
        raise ValueError(f"Rango inválido: fin ({end}) anterior a inicio ({start})")
    duration = end - start
    count = 1 if duration <= MAX_BATCH_SECONDS else math.ceil(duration / MAX_BATCH_SECONDS)
    size = math.ceil(duration / count)
    batches: list[DownloadBatch] = []
    cursor = start
    for index in range(count):
        batch_start = cursor
        batch_end = end if index == count - 1 else min(end, batch_start + size - 1)
        blocks = tuple(plan_blocks(batch_start, batch_end, calendar))
        batches.append(DownloadBatch(batch_start, batch_end, blocks))
        cursor = batch_end + 1
    logger.debug(
        "tandas_planificadas",
        tandas=len(batches),
        inicio=start,
        fin=end,
    )
    return batches


__all__ = [
    "MAX_BATCH_SECONDS",
    "MIN_BATCH_SECONDS",
    "DownloadBatch",
    "plan_batches",
]
