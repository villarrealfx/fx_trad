"""Tareas Celery de descarga de datos (RF-001, RF-002, RX-001; ADR-006).

TASK-004 implementa con Celery + RabbitMQ el contrato ``DownloadQueue`` que el
endpoint ``POST /downloads`` (TASK-003) usa como única vía de acoplamiento:
se encola ``download_asset`` y se devuelve el ``task_id`` inmediatamente; el
worker descarga las horas del rango y devuelve un resumen. TASK-005 añade el
retry/backoff de 20 s (R-001): cada hora se reintenta con ``RetryPolicy`` y el
resumen queda en estado ``exito``/``parcial``/``fallo``.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from celery import Celery  # type: ignore[import-untyped]
from celery.result import AsyncResult  # type: ignore[import-untyped]

from fxtrad.ingest.freeserv import FreeservClient
from fxtrad.ingest.requests import DownloadRequest
from fxtrad.ingest.retry import (
    DownloadError,
    RetryPolicy,
    download_status,
    retry_download_hour,
)
from fxtrad.ingest.status import DownloadInfo

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


def _default_result_backend(broker_url: str) -> str:
    """Devuelve el result backend coherente con el broker indicado.

    Con ``amqp`` (RabbitMQ) se usa ``rpc://``: el worker y la API corren en
    procesos distintos y deben compartir resultados para el GET de estado
    (TASK-006). Con transportes en memoria (tests/CI) basta ``cache+memory``.
    """
    if broker_url.startswith("amqp"):
        return "rpc://"
    return "cache+memory://"


def create_celery_app() -> Celery:
    """Crea la aplicación Celery configurada por variables de entorno.

    ``FXTRAD_BROKER_URL`` define el broker amqp (default RabbitMQ local).
    ``FXTRAD_RESULT_BACKEND`` define dónde se guardan los resultados (default
    ``rpc://`` con RabbitMQ —compartido entre worker y API para TASK-006—; si no,
    ``cache+memory`` para tests).
    ``FXTRAD_TASK_ALWAYS_EAGER=1`` ejecuta las tareas síncronas, útil en tests
    y CI donde no hay broker levantado.
    """
    broker_url = os.getenv("FXTRAD_BROKER_URL", _DEFAULT_BROKER_URL)
    app = Celery("fxtrad", broker=broker_url)
    app.conf.update(
        result_backend=os.getenv("FXTRAD_RESULT_BACKEND", _default_result_backend(broker_url)),
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
    policy: RetryPolicy | None = None,
) -> dict[str, object]:
    """Descarga todas las horas del rango y devuelve el resumen.

    Cada hora se reintenta con backoff de 20 s (R-001). Una hora que falla tras
    agotar los intentos no aborta el rango: se registra en ``fallos_detalle`` y
    el resumen final queda en estado ``parcial`` o ``fallo`` (TASK-005).

    Args:
        client: Cliente Dukascopy (en producción llega de la factoría).
        request: Solicitud validada de la descarga.
        task_id: Id de la tarea Celery, para correlación en los logs.
        policy: Política de reintentos; por defecto ``RetryPolicy()`` (20 s).

    Returns:
        Resumen con activo, horas, velas, rango, estado y horas fallidas.
    """
    retry_policy = policy if policy is not None else RetryPolicy()
    scoped = logger.bind(task_id=task_id) if task_id else logger
    scoped.info(
        "descarga_rango_iniciada",
        activo=request.asset,
        inicio=request.start,
        fin=request.end,
    )
    hours = iter_hours(request.start, request.end)
    total_candles = 0
    failures: list[dict[str, int]] = []
    for year, month_index, day, hour in hours:
        try:
            candles = retry_download_hour(
                client, request.asset, year, month_index, day, hour, retry_policy
            )
        except DownloadError:
            failures.append({"year": year, "month_index": month_index, "day": day, "hour": hour})
            continue
        total_candles += len(candles)
    status = download_status(len(hours), len(failures))
    scoped.info(
        "descarga_rango_completada",
        activo=request.asset,
        horas=len(hours),
        velas=total_candles,
        estado=status,
        horas_fallidas=len(failures),
    )
    if failures:
        scoped.warning(
            "descarga_rango_parcial",
            activo=request.asset,
            horas_fallidas=len(failures),
            detalle=failures,
        )
    return {
        "activo": request.asset,
        "horas": len(hours),
        "velas": total_candles,
        "inicio": request.start,
        "fin": request.end,
        "estado": status,
        "horas_fallidas": len(failures),
        "fallos_detalle": failures,
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


class CeleryDownloadStatus:
    """Consulta de estado de una descarga respaldada por Celery (TASK-006).

    Cumple el protocolo ``DownloadStatusQuery`` del endpoint
    ``GET /downloads/{task_id}``. Lee el ``AsyncResult`` de la tarea: mientras
    la tarea no termina el estado es ``encolada``; al completar, el estado y
    las filas provienen del resumen de la descarga (TASK-005).
    """

    def __init__(self, app: Celery = celery_app) -> None:
        self._app = app

    def get(self, task_id: str) -> DownloadInfo:
        """Devuelve el estado y las filas obtenidas de la tarea indicada.

        Args:
            task_id: Identificador de la tarea cuya descarga se consulta.

        Returns:
            ``DownloadInfo`` con el estado (encolada/éxito/parcial/fallo) y
            las filas obtenidas; una tarea aún no terminada reporta 0 filas.
        """
        result = AsyncResult(task_id, app=self._app)
        if result.state == "SUCCESS":
            payload = result.result or {}
            estado = payload.get("estado", "exito")
            filas = payload.get("velas", 0)
            return DownloadInfo(task_id=task_id, estado=estado, filas=filas)
        if result.state == "FAILURE":
            return DownloadInfo(task_id=task_id, estado="fallo", filas=0)
        return DownloadInfo(task_id=task_id, estado="encolada", filas=0)


__all__ = [
    "CeleryDownloadQueue",
    "CeleryDownloadStatus",
    "DownloadError",
    "RetryPolicy",
    "TASK_NAME",
    "build_client",
    "celery_app",
    "create_celery_app",
    "download_asset",
    "iter_hours",
    "run_download_range",
]
