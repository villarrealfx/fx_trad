"""Política de reintentos con backoff para descargas (R-001, TASK-005/TASK-055).

``retry_download_hour`` envuelve la descarga de una hora con reintentos
exponencialmente constantes: si el fetch falla, se registra el evento
``reintento`` (WARN) y se espera ``RetryPolicy.backoff_seconds`` (por defecto
20 s, mitigación de R-001) antes del siguiente intento. Al agotar las
repeticiones se registra ``fallo_descarga`` (ERROR) y se lanza ``DownloadError``
para que el rango continúe con el resto de horas y el resumen quede en estado
parcial/fallo (DoD de TASK-005).

Con la base 1 m (ADR-012) la unidad de descarga es el **bloque** (TASK-052), por
lo que ``retry_download_block`` aplica la misma política a ``download_range`` y
``collect_blocks_candles`` recorre los bloques sin abortar el rango: un bloque
que agota los reintentos se registra como fallido y el estado global se clasifica
con ``download_status`` (TASK-055, ADR-013).

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
"""Estado de una descarga en el resumen de la tarea (DoD TASK-005).

Valores en español por ser parte del contrato de respuesta legible por la
interfaz (SCR-002): ``exito`` sin fallos, ``parcial`` con alguna hora fallida,
``fallo`` cuando ninguna hora del rango se descargó.
"""


class DownloadHourClient(Protocol):
    """Protocolo del cliente de descarga usado por la política de reintentos."""

    def download_hour(
        self, symbol: str, year: int, month_index: int, day: int, hour: int
    ) -> list[Candle]:
        """Descarga una hora y devuelve las velas OHLC de 1 s."""
        ...


class DownloadRangeClient(Protocol):
    """Protocolo del cliente de descarga por rango usado por el retry por bloque."""

    def download_range(self, symbol: str, start: datetime, end: datetime) -> list[Candle]:
        """Descarga el rango ``[start, end]`` y devuelve las velas OHLC (TASK-053)."""
        ...


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    """Configuración de reintentos de una descarga (R-001).

    Attributes:
        max_attempts: Número máximo de intentos por hora (incluye el primero).
        backoff_seconds: Espera entre intentos, en segundos (mitigación R-001).
        sleep: Función de espera inyectable para tests (evita dormir de verdad).
    """

    max_attempts: int = 3
    backoff_seconds: float = 20.0
    sleep: Callable[[float], None] = time.sleep


class DownloadError(RuntimeError):
    """Fallo de descarga de una hora tras agotar los reintentos (TASK-005).

    Attributes:
        symbol: Activo que falló durante la descarga.
        year: Año de la hora fallida.
        month_index: Mes 0-based de la hora fallida.
        day: Día de la hora fallida.
        hour: Hora UTC de la hora fallida.
        attempts: Intentos realizados antes de desistir.
    """

    def __init__(
        self,
        symbol: str,
        year: int,
        month_index: int,
        day: int,
        hour: int,
        attempts: int,
    ) -> None:
        self.symbol = symbol
        self.year = year
        self.month_index = month_index
        self.day = day
        self.hour = hour
        self.attempts = attempts
        super().__init__(
            f"Descarga fallida de '{symbol}' {year:04d}-{month_index + 1:02d}-{day:02d} "
            f"{hour:02d}:00Z tras {attempts} intentos."
        )


def retry_download_hour(
    client: DownloadHourClient,
    symbol: str,
    year: int,
    month_index: int,
    day: int,
    hour: int,
    policy: RetryPolicy,
) -> list[Candle]:
    """Descarga una hora reintentando con backoff ante fallos transitorios.

    Args:
        client: Cliente de descarga (productivo o inyectado en tests).
        symbol: Símbolo canónico del activo (p. ej. ``EURUSD``).
        year: Año (4 dígitos).
        month_index: Mes 0-based (``0`` = enero … ``11`` = diciembre).
        day: Día del mes (1-based).
        hour: Hora UTC (0-23).
        policy: Política de reintentos y backoff.

    Returns:
        Velas OHLC de la hora descargada.

    Raises:
        DownloadError: si se agotan los intentos de ``policy.max_attempts``.
    """
    for attempt in range(1, policy.max_attempts + 1):
        try:
            return client.download_hour(symbol, year, month_index, day, hour)
        except Exception as exc:
            if attempt >= policy.max_attempts:
                logger.error(
                    "fallo_descarga",
                    activo=symbol,
                    intento=attempt,
                    max_intentos=policy.max_attempts,
                    error=type(exc).__name__,
                    exc_info=exc,
                )
                raise DownloadError(symbol, year, month_index, day, hour, attempt) from exc
            logger.warning(
                "reintento",
                activo=symbol,
                intento=attempt + 1,
                max_intentos=policy.max_attempts,
                error=type(exc).__name__,
                espera_s=policy.backoff_seconds,
            )
            policy.sleep(policy.backoff_seconds)
    raise AssertionError("No alcanzable: el bucle retorna o lanza DownloadError.")


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
    (``download_status``), en línea con el comportamiento de TASK-005.

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


def download_status(total_attempted: int, failed_hours: int) -> DownloadStatus:
    """Clasifica el estado global de una descarga (exito/parcial/fallo).

    Args:
        total_attempted: Horas del rango intentadas por la tarea.
        failed_hours: Horas que fallaron tras agotar reintentos.

    Returns:
        ``exito`` sin fallos, ``fallo`` si todas fallan, ``parcial`` si alguna.
    """
    if total_attempted == 0 or failed_hours == 0:
        return "exito"
    if failed_hours == total_attempted:
        return "fallo"
    return "parcial"


__all__ = [
    "BlockDownloadError",
    "DownloadError",
    "DownloadHourClient",
    "DownloadRangeClient",
    "DownloadStatus",
    "RetryPolicy",
    "collect_blocks_candles",
    "download_status",
    "retry_download_block",
    "retry_download_hour",
]
