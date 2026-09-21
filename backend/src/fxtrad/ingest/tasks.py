"""Tareas Celery de descarga de datos (RF-001, RF-002, RX-001; ADR-006).

TASK-004 implementa con Celery + RabbitMQ el contrato ``DownloadQueue`` que el
endpoint ``POST /downloads`` (TASK-003) usa como única vía de acoplamiento:
se encola ``download_asset`` y se devuelve el ``task_id`` inmediatamente; el
worker descarga las horas del rango y devuelve un resumen. El retry/backoff de
20 s (R-001) llega en TASK-005.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from celery import Celery  # type: ignore[import-untyped]

from fxtrad.ingest.freeserv import FreeservClient
from fxtrad.ingest.requests import DownloadRequest

logger = structlog.get_logger()

TASK_NAME = "ingest.download_asset"
"""Nombre canónico de la tarea de descarga (vía ``send_task`` o worker)."""

_DEFAULT_BROKER_URL = "amqp://guest:guest@localhost:5672//"


def _env_bool(name: str, default: bool) -> bool:
    """Lee una variable de entorno como booleano (valores 1/true/yes/on)."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def build_client() -> FreeservClient:
    """Construye el cliente de descarga real; inyectable en las pruebas."""
    return FreeservClient()


def create_celery_app() -> Celery:
    """Crea la aplicación Celery configurada por variables de entorno.

    ``FXTRAD_BROKER_URL`` define el broker amqp (default RabbitMQ local).
    ``FXTRAD_RESULT_BACKEND`` define dónde se guardan los resultados (default
    ``cache+memory``: suficiente para el MVP, sin Redis).
    ``FXTRAD_TASK_ALWAYS_EAGER=1`` ejecuta las tareas síncronas, útil en tests
    y CI donde no hay broker levantado.
    """
    app = Celery(
        "fxtrad",
        broker=os.getenv("FXTRAD_BROKER_URL", _DEFAULT_BROKER_URL),
    )
    app.conf.update(
        result_backend=os.getenv("FXTRAD_RESULT_BACKEND", "cache+memory://"),
        task_always_eager=_env_bool("FXTRAD_TASK_ALWAYS_EAGER", False),
        task_store_eager_result=True,
        task_track_started=True,
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        fxtrad_client_factory=build_client,
    )
    return app


celery_app = create_celery_app()
"""Instancia única de la aplicación Celery del módulo ingest."""


def iter_hours(start_epoch_s: int, end_epoch_s: int) -> list[tuple[int, int, int, int]]:
    """Enumeración de las horas UTC del rango inclusivo ``[start, end]``.

    Returns:
        Tuplas ``(year, month_index, day, hour)`` con mes 0-based, como espera
        ``FreeservClient.download_hour``.
    """
    start_dt = datetime.fromtimestamp(start_epoch_s, tz=UTC).replace(
        minute=0, second=0, microsecond=0
    )
    end_dt = datetime.fromtimestamp(end_epoch_s, tz=UTC)
    hours: list[tuple[int, int, int, int]] = []
    cursor = start_dt
    while cursor <= end_dt:
        hours.append((cursor.year, cursor.month - 1, cursor.day, cursor.hour))
        cursor += timedelta(hours=1)
    return hours


def run_download_range(
    client: FreeservClient,
    request: DownloadRequest,
    task_id: str | None = None,
) -> dict[str, object]:
    """Descarga todas las horas del rango y devuelve el resumen.

    Args:
        client: Cliente Dukascopy (en producción llega de la factoría).
        request: Solicitud validada de la descarga.
        task_id: Id de la tarea Celery, para correlación en los logs.

    Returns:
        Resumen con activo, horas descargadas, velas totales y rango.
    """
    scoped = logger.bind(task_id=task_id) if task_id else logger
    scoped.info(
        "descarga_rango_iniciada",
        activo=request.asset,
        inicio=request.start,
        fin=request.end,
    )
    hours = iter_hours(request.start, request.end)
    total_candles = 0
    for year, month_index, day, hour in hours:
        total_candles += len(client.download_hour(request.asset, year, month_index, day, hour))
    scoped.info(
        "descarga_rango_completada",
        activo=request.asset,
        horas=len(hours),
        velas=total_candles,
    )
    return {
        "activo": request.asset,
        "horas": len(hours),
        "velas": total_candles,
        "inicio": request.start,
        "fin": request.end,
    }


@celery_app.task(name=TASK_NAME, bind=True)  # type: ignore[untyped-decorator]
def download_asset(self: Any, symbol: str, start: int, end: int) -> dict[str, object]:
    """Descarga el rango indicado y devuelve un resumen.

    Los argumentos son serializables (JSON: símbolo + segundos UTC) para que
    la tarea sobreviva al broker. Se re-valida el request en el worker: una
    solicitud inválida nunca se descarga (HU-001).
    """
    request = DownloadRequest(asset=symbol, start=start, end=end)
    client = self.app.conf.fxtrad_client_factory()
    return run_download_range(client, request, task_id=self.request.id)


class CeleryDownloadQueue:
    """Cola de descargas respaldada por Celery (ADR-006, TASK-004).

    Cumple el protocolo ``DownloadQueue`` del endpoint ``POST /downloads``.
    """

    def __init__(self, app: Celery = celery_app) -> None:
        self._app = app

    def enqueue(self, request: DownloadRequest) -> str:
        """Encola ``download_asset`` y devuelve el ``task_id`` de Celery.

        Se usa ``apply_async`` de la tarea registrada (no ``send_task``, que
        ignora el modo eager): así los tests sin broker cubren la misma vía.
        Args:
            request: Solicitud validada de descarga.

        Returns:
            ``task_id`` generado por Celery (UUID como texto).
        """
        result = self._app.tasks[TASK_NAME].apply_async(
            kwargs={
                "symbol": request.asset,
                "start": request.start,
                "end": request.end,
            }
        )
        return str(result.id)


__all__ = [
    "CeleryDownloadQueue",
    "TASK_NAME",
    "build_client",
    "celery_app",
    "create_celery_app",
    "download_asset",
    "iter_hours",
    "run_download_range",
]
