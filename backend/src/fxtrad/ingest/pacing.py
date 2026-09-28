"""Pacing entre bloques de descarga (TASK-054, RF-102/RNF-101).

Aplica una espera configurable **entre** bloques consecutivos para mitigar el
rate-limiting (503) de freeserv sin dejar de cubrir todo el rango (ADR-013). El
mecanismo de espera es inyectable para poder probarlo sin dormir de verdad.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Sequence

import structlog

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest.planner import DownloadBlock

logger = structlog.get_logger()

DEFAULT_PAUSE_SECONDS = 20.0
"""Espera por defecto entre bloques (ADR-013)."""


def download_blocks(
    blocks: Sequence[DownloadBlock],
    download: Callable[[DownloadBlock], list[Candle]],
    *,
    pause_seconds: float = DEFAULT_PAUSE_SECONDS,
    sleep: Callable[[float], None] = time.sleep,
) -> list[Candle]:
    """Descarga los bloques aplicando pacing y concatena sus velas.

    Duerme ``pause_seconds`` **entre** bloques: para N bloques se realizan
    exactamente N−1 esperas (no se espera antes del primero ni después del
    último).

    Args:
        blocks: Bloques ordenados a descargar (TASK-052).
        download: Callable que descarga un bloque y devuelve sus velas.
        pause_seconds: Segundos de espera entre bloques.
        sleep: Función de espera inyectable (en tests, un espía sin dormir).

    Returns:
        Velas concatenadas en el orden de los bloques.

    Raises:
        Exception: propaga cualquier error de ``download`` sin aplicar esperas
            adicionales.
    """
    logger.debug("pacing_iniciado", bloques=len(blocks), pausa_segundos=pause_seconds)
    candles: list[Candle] = []
    for index, block in enumerate(blocks):
        if index > 0:
            sleep(pause_seconds)
        candles.extend(download(block))
    logger.debug("pacing_completado", bloques=len(blocks), velas=len(candles))
    return candles


__all__ = ["DEFAULT_PAUSE_SECONDS", "download_blocks"]
