"""Filtro de periodos sin mercado por calendario (RF-004).

Conserva solo las filas (timestamps o velas) que corresponden a días de mercado
abierto, excluyendo fines de semana y feriados configurables. Esto evita que los
gaps reales de mercado se interpreten como señales falsas.

El módulo es agnóstico al formato de entrada: ``filter_open_timestamps`` opera
sobre segundos UTC genéricos, y ``filter_open_candles`` sobre instancias de
``Candle`` (contrato OHLC, TASK-009).
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from fxtrad.contracts.ohlc import Candle
    from fxtrad.pipeline.calendar import MarketCalendar

logger = structlog.get_logger()


def filter_open_timestamps(
    timestamps: Iterable[int],
    calendar: MarketCalendar,
) -> Iterator[int]:
    """Conserva únicamente los segundos UTC que caen en días de mercado abierto.

    Args:
        timestamps: Iterable de segundos en UTC (no necesitan estar ordenados).
        calendar: Calendario de mercado que determina los días abiertos.

    Yields:
        Los mismos segundos que ``timestamps``, sin los que caen en días cerrados.
        Se emite ``WARN`` al final de la iteración si se excluyeron filas.
    """
    dropped = 0
    for ts in timestamps:
        if calendar.is_open_timestamp(ts):
            yield ts
        else:
            dropped += 1
    if dropped:
        logger.warning(
            "periodos_sin_mercado_excluidos",
            filas_excluidas=dropped,
        )


def filter_open_candles(
    candles: Iterable[Candle],
    calendar: MarketCalendar,
) -> list[Candle]:
    """Conserva las velas cuyo ``time`` cae en un día de mercado abierto.

    Preserva el orden original.

    Args:
        candles: Secuencia de ``Candle`` (contrato OHLC compartido).
        calendar: Calendario de mercado por activo.

    Returns:
        Lista con las velas de días abiertos, en el mismo orden que la entrada.
    """
    included = list(filter_open_timestamps((c.time for c in candles), calendar))
    included_set = frozenset(included)
    return [c for c in candles if c.time in included_set]


__all__ = ["filter_open_candles", "filter_open_timestamps"]
