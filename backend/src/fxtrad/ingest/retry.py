"""Política de reintentos con backoff para descargas por bloque (R-001; TASK-055).

La unidad de descarga es el **bloque** (TASK-052, ADR-012): ``retry_download_block``
aplica reintentos con backoff constante (``RetryPolicy.backoff_seconds``, 20 s por
defecto, mitigación de R-001) a ``download_range``. Al agotar las repeticiones se
registra ``fallo_descarga_bloque`` (ERROR) y se lanza ``BlockDownloadError`` para
que el rango continúe con el resto de bloques: ``collect_blocks_candles`` recorre
la lista sin abortar y el estado global (``exito``/``parcial``/``fallo``) se
clasifica con ``download_status`` (TASK-055, ADR-013).

La política de reintentos NO duplica el retry interno de ``dukascopy-python``
(a nivel HTTP, 7 intentos con 1 s): opera a nivel de bloque en la tarea Celery
(ADR-006) y es la fuente del backoff de 20 s documentado en el plan.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal, Protocol

import structlog

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest.planner import DownloadBlock

logger = structlog.get_logger()

DownloadStatus = Literal["exito", "parcial", "fallo"]
"""Estado de una descarga en el resumen de la tarea.

Valores en español por ser parte del contrato de respuesta legible por la
interfaz (SCR-002): ``exito`` sin fallos, ``parcial`` con algún bloque fallido,
``fallo`` cuando ningún bloque del rango se descargó.
"""


class DownloadRangeClient(Protocol):
    """Protocolo del cliente de descarga por rango usado por el retry por bloque."""

    def download_range(self, symbol: str, start: datetime, end: datetime) -> list[Candle]:
        """Descarga el rango ``[start, end]`` y devuelve las velas OHLC (TASK-053)."""
        ...


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    """Configuración de reintentos y pacing de una descarga (R-001).

    Attributes:
        max_attempts: Número máximo de intentos por bloque (incluye el primero).
        backoff_seconds: Espera entre intentos, en segundos (mitigación R-001).
        sleep: Función de espera inyectable para tests (evita dormir de verdad);
            se usa también para el pacing entre bloques (TASK-054).
    """

    max_attempts: int = 3
    backoff_seconds: float = 20.0
    sleep: Callable[[float], None] = time.sleep


def _format_epoch(epoch: int) -> str:
    """Formatea un epoch en segundos UTC como ``YYYY-MM-DD HH:MM`` para logs."""
    return datetime.fromtimestamp(epoch, tz=UTC).strftime("%Y-%m-%d %H:%M")


class BlockDownloadError(RuntimeError):
    """Fallo de descarga de un bloque tras agotar los reintentos (TASK-055).

    Attributes:
        symbol: Activo que falló durante la descarga.
        block: Bloque (TASK-052) que agotó los reintentos.
        attempts: Intentos realizados antes de desistir.
    """

    def __init__(self, symbol: str, block: DownloadBlock, attempts: int) -> None:
        self.symbol = symbol
        self.block = block
        self.attempts = attempts
        super().__init__(
            f"Descarga fallida de '{symbol}' bloque "
            f"{_format_epoch(block.start)}Z-{_format_epoch(block.end)}Z "
            f"tras {attempts} intentos."
        )


def retry_download_block(
    client: DownloadRangeClient,
    symbol: str,
    block: DownloadBlock,
    policy: RetryPolicy,
) -> list[Candle]:
    """Descarga un bloque reintentando con backoff ante fallos transitorios.

    Args:
        client: Cliente de descarga por rango (TASK-053).
        symbol: Símbolo canónico del activo (p. ej. ``EURUSD``).
        block: Bloque a descargar, con su ventana ``[start, end]`` en segundos UTC.
        policy: Política de reintentos y backoff.

    Returns:
        Velas OHLC de 1 m del bloque.

    Raises:
        BlockDownloadError: si se agotan los intentos de ``policy.max_attempts``.
    """
    start = datetime.fromtimestamp(block.start, tz=UTC)
    end = datetime.fromtimestamp(block.end, tz=UTC)
    for attempt in range(1, policy.max_attempts + 1):
        try:
            return client.download_range(symbol, start, end)
        except Exception as exc:
            if attempt >= policy.max_attempts:
                logger.error(
                    "fallo_descarga_bloque",
                    activo=symbol,
                    inicio=block.start,
                    fin=block.end,
                    intento=attempt,
                    max_intentos=policy.max_attempts,
                    error=type(exc).__name__,
                    exc_info=exc,
                )
                raise BlockDownloadError(symbol, block, attempt) from exc
            logger.warning(
                "reintento_bloque",
                activo=symbol,
                inicio=block.start,
                fin=block.end,
                intento=attempt + 1,
                max_intentos=policy.max_attempts,
                error=type(exc).__name__,
                espera_s=policy.backoff_seconds,
            )
            policy.sleep(policy.backoff_seconds)
    raise AssertionError("No alcanzable: el bucle retorna o lanza BlockDownloadError.")


def collect_blocks_candles(
    client: DownloadRangeClient,
    symbol: str,
    blocks: Sequence[DownloadBlock],
    policy: RetryPolicy,
) -> tuple[list[Candle], list[DownloadBlock]]:
    """Descarga los bloques reintentando cada uno sin abortar el rango.

    Un bloque que agota los reintentos no interrumpe la descarga: se acumula en
    la lista de fallos para que el estado global quede en ``parcial``/``fallo``
    (``download_status``).

    Args:
        client: Cliente de descarga por rango (TASK-053).
        symbol: Símbolo canónico del activo.
        blocks: Bloques ordenados a descargar (TASK-052).
        policy: Política de reintentos y backoff.

    Returns:
        Tupla ``(velas, bloques_fallidos)`` en el orden de descarga.
    """
    collected: list[Candle] = []
    failures: list[DownloadBlock] = []
    for block in blocks:
        try:
            collected.extend(retry_download_block(client, symbol, block, policy))
        except BlockDownloadError:
            failures.append(block)
    return collected, failures


def download_status(total_attempted: int, failed_units: int) -> DownloadStatus:
    """Clasifica el estado global de una descarga (exito/parcial/fallo).

    Args:
        total_attempted: Bloques del rango intentados por la tarea.
        failed_units: Bloques que fallaron tras agotar reintentos.

    Returns:
        ``exito`` sin fallos, ``fallo`` si todos fallan, ``parcial`` si alguno.
    """
    if total_attempted == 0 or failed_units == 0:
        return "exito"
    if failed_units == total_attempted:
        return "fallo"
    return "parcial"


__all__ = [
    "BlockDownloadError",
    "DownloadRangeClient",
    "DownloadStatus",
    "RetryPolicy",
    "collect_blocks_candles",
    "download_status",
    "retry_download_block",
]
