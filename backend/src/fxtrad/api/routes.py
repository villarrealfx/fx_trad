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

from fxtrad.ingest import DownloadQueue, DownloadRequest

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


__all__ = ["DownloadAccepted", "router"]
