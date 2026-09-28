"""Benchmark de descarga de 1 año a 1 m (TASK-074, RNF-101).

Mide el tiempo de una descarga usando la misma ruta que la tarea Celery
(tandas + bloques + pacing + retry) y comprueba el objetivo de RNF-101
(≤ 900 s por año). El reloj es inyectable para poder probarlo sin red.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import cast

import structlog

from fxtrad.ingest.freeserv import FreeservClient
from fxtrad.ingest.requests import DownloadRequest
from fxtrad.ingest.retry import RetryPolicy
from fxtrad.ingest.tasks import run_download_range

logger = structlog.get_logger()

YEAR_SECONDS = 365 * 24 * 3600
"""Un año en segundos (referencia de RNF-101)."""

DOWNLOAD_TARGET_SECONDS = 900.0
"""Objetivo de RNF-101: ≤ 900 s para 1 año a 1 m."""


@dataclass(frozen=True, slots=True)
class BenchmarkResult:
    """Resultado de una medición de descarga.

    Attributes:
        elapsed_seconds: Tiempo medido de la descarga.
        velas: Velas de 1 m descargadas.
        bloques: Bloques descargados.
        tandas: Tandas en que se descompuso el rango.
        target_seconds: Objetivo de tiempo evaluado (RNF-101).
        within_target: ``True`` si ``elapsed_seconds <= target_seconds``.
    """

    elapsed_seconds: float
    velas: int
    bloques: int
    tandas: int
    target_seconds: float
    within_target: bool


def benchmark_download(
    client: FreeservClient,
    symbol: str,
    start: int,
    end: int,
    *,
    policy: RetryPolicy | None = None,
    clock: Callable[[], float] = time.perf_counter,
    target_seconds: float = DOWNLOAD_TARGET_SECONDS,
) -> BenchmarkResult:
    """Mide la descarga de ``[start, end]`` y evalúa el objetivo de RNF-101.

    Ejecuta ``run_download_range`` sin persistidor (solo mide la descarga) y
    cronometra con ``clock`` (``time.perf_counter`` por defecto, inyectable en
    tests).

    Args:
        client: Cliente Dukascopy (en producción, el real).
        symbol: Símbolo canónico del activo.
        start: Inicio del rango en segundos UTC (inclusivo).
        end: Fin del rango en segundos UTC (inclusivo).
        policy: Política de reintentos y pacing; por defecto ``RetryPolicy()``.
        clock: Función de tiempo inyectable (segundos monótonos).
        target_seconds: Objetivo de tiempo a evaluar.

    Returns:
        ``BenchmarkResult`` con el tiempo y el veredicto del objetivo.
    """
    request = DownloadRequest(asset=symbol, start=start, end=end)
    started = clock()
    summary = run_download_range(client, request, policy=policy)
    elapsed = clock() - started
    result = BenchmarkResult(
        elapsed_seconds=elapsed,
        velas=cast(int, summary["velas"]),
        bloques=cast(int, summary["bloques"]),
        tandas=len(cast(list[object], summary["tandas"])),
        target_seconds=target_seconds,
        within_target=elapsed <= target_seconds,
    )
    logger.info(
        "benchmark_descarga",
        activo=symbol,
        segundos=elapsed,
        objetivo=target_seconds,
        dentro=result.within_target,
        velas=result.velas,
        bloques=result.bloques,
        tandas=result.tandas,
    )
    return result


__all__ = [
    "DOWNLOAD_TARGET_SECONDS",
    "YEAR_SECONDS",
    "BenchmarkResult",
    "benchmark_download",
]
