"""Rutas HTTP de descargas (RF-001, HU-001).

``POST /downloads`` valida la solicitud (TASK-001) y la encola en la cola
asíncrona (ADR-006). Responde 202 Accepted con el identificador de la tarea;
un body inválido se rechaza con 422 sin encolar nada (criterio HU-001).

El ``task_id`` lo genera la cola, no esta ruta: así el endpoint depende de la
interfaz ``DownloadQueue`` y TASK-004 aporta la implementación real con Celery.
"""

from __future__ import annotations

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field

from fxtrad.ingest import DownloadInfo, DownloadQueue, DownloadRequest, DownloadStatusQuery

logger = structlog.get_logger()

router = APIRouter()


class DownloadAccepted(BaseModel):
    """Respuesta 202 de una descarga encolada correctamente.

    Attributes:
        task_id: Identificador único de la tarea en la cola.
    """

    task_id: str = Field(description="Identificador único de la tarea encolada.")


def _get_download_queue(request: Request) -> DownloadQueue:
    """Devuelve la cola inyectada en la aplicación al crearla (TASK-004)."""
    queue: DownloadQueue = request.app.state.download_queue
    return queue


DownloadQueueDependency = Annotated[DownloadQueue, Depends(_get_download_queue)]


def _get_download_status_query(request: Request) -> DownloadStatusQuery:
    """Devuelve la consulta de estado inyectada al crear la aplicación (TASK-006)."""
    query: DownloadStatusQuery = request.app.state.download_status_query
    return query


DownloadStatusDependency = Annotated[DownloadStatusQuery, Depends(_get_download_status_query)]


@router.post(
    "/downloads",
    response_model=DownloadAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Encola una descarga histórica de un activo",
)
def enqueue_download(
    download_request: DownloadRequest,
    download_queue: DownloadQueueDependency,
) -> DownloadAccepted:
    """Encola una descarga y responde 202 con el ``task_id``.

    Args:
        download_request: Body validado de la descarga (activo, inicio, fin).
        download_queue: Cola asíncrona inyectada (ADR-006).

    Returns:
        Confirmación con el identificador de la tarea encolada.
    """
    task_id = download_queue.enqueue(download_request)
    logger.info(
        "descarga_solicitada",
        activo=download_request.asset,
        inicio=download_request.start,
        fin=download_request.end,
        task_id=task_id,
    )
    return DownloadAccepted(task_id=task_id)


@router.get(
    "/downloads/{task_id}",
    response_model=DownloadInfo,
    summary="Consulta el estado de una descarga encolada",
)
def get_download_status(
    task_id: str,
    download_status: DownloadStatusDependency,
) -> DownloadInfo:
    """Devuelve el estado y las filas obtenidas de la descarga (TASK-006).

    Args:
        task_id: Identificador de la tarea devuelto por ``POST /downloads``.
        download_status: Consulta de estado inyectada (ADR-006).

    Returns:
        Estado (encolada/éxito/parcial/fallo) y filas obtenidas.
    """
    info = download_status.get(task_id)
    logger.info(
        "estado_descarga_consultado",
        task_id=task_id,
        estado=info.estado,
        filas=info.filas,
    )
    return info


__all__ = ["DownloadAccepted", "router"]
