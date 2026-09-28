"""Reanudación de descargas parciales por rango restante (TASK-065, RF-104).

Una descarga que termina en estado ``parcial`` deja bloques fallidos en
``fallos_detalle`` (TASK-056). Aquí se derivan los rangos que faltan —el
complemento— coalesciendo bloques contiguos, para volver a descargarlos y
fusionarlos sin duplicados (upsert por ``time``, KPI-4). Responde a ADR-015
(tandas reanudables).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence

import structlog

logger = structlog.get_logger()


def failed_ranges(summary: Mapping[str, object]) -> list[tuple[int, int]]:
    """Extrae los intervalos ``[inicio, fin]`` fallidos del resumen de descarga.

    Args:
        summary: Resumen devuelto por ``run_download_range`` (o compatible).

    Returns:
        Lista de intervalos fallidos; vacía si no hubo fallos o el resumen no
        trae ``fallos_detalle`` con el formato esperado.
    """
    raw = summary.get("fallos_detalle", [])
    if not isinstance(raw, Sequence) or isinstance(raw, (str, bytes)):
        return []
    ranges: list[tuple[int, int]] = []
    for item in raw:
        if not isinstance(item, Mapping):
            continue
        start = item.get("inicio")
        end = item.get("fin")
        if isinstance(start, int) and isinstance(end, int):
            ranges.append((start, end))
    return ranges


def coalesce_ranges(ranges: Sequence[tuple[int, int]]) -> list[tuple[int, int]]:
    """Fusiona intervalos solapados o contiguos en rangos mínimos ordenados.

    Args:
        ranges: Intervalos ``[inicio, fin]`` posiblemente solapados o contiguos.

    Returns:
        Intervalos disjuntos y no contiguos, en orden ascendente.
    """
    merged: list[tuple[int, int]] = []
    for start, end in sorted(ranges):
        if merged and start <= merged[-1][1] + 1:
            previous_start, previous_end = merged[-1]
            merged[-1] = (previous_start, max(previous_end, end))
        else:
            merged.append((start, end))
    return merged


def pending_ranges(summary: Mapping[str, object], start: int, end: int) -> list[tuple[int, int]]:
    """Rangos pendientes de reanudar: los fallos recortados a ``[start, end]``.

    Args:
        summary: Resumen de la descarga previa (con ``fallos_detalle``).
        start: Inicio del rango solicitado en segundos UTC (inclusivo).
        end: Fin del rango solicitado en segundos UTC (inclusivo).

    Returns:
        Intervalos pendientes disjuntos, en orden ascendente; vacío si no hubo
        fallos dentro del rango (nada que reanudar).
    """
    clipped = [
        (max(failure_start, start), min(failure_end, end))
        for failure_start, failure_end in failed_ranges(summary)
        if failure_end >= start and failure_start <= end
    ]
    return coalesce_ranges(clipped)


__all__ = ["coalesce_ranges", "failed_ranges", "pending_ranges"]
