"""Política de reintentos con backoff para descargas (R-001, TASK-005).

``retry_download_hour`` envuelve la descarga de una hora con reintentos
exponencialmente constantes: si el fetch falla, se registra el evento
``reintento`` (WARN) y se espera ``RetryPolicy.backoff_seconds`` (por defecto
20 s, mitigación de R-001) antes del siguiente intento. Al agotar las
repeticiones se registra ``fallo_descarga`` (ERROR) y se lanza ``DownloadError``
para que el rango continúe con el resto de horas y el resumen quede en estado
parcial/fallo (DoD de TASK-005).

La política de reintentos NO duplica el retry interno de ``dukascopy-python``
(a nivel HTTP, 7 intentos con 1 s): opera a nivel de hora en la tarea Celery
(ADR-006) y es la fuente del backoff de 20 s documentado en el plan.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal, Protocol

import structlog

from fxtrad.contracts.ohlc import Candle

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
    "DownloadError",
    "DownloadStatus",
    "RetryPolicy",
    "download_status",
    "retry_download_hour",
]
