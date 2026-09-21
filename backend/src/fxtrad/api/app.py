"""Construcción de la aplicación FastAPI (ADR-002)."""

from __future__ import annotations

from fastapi import FastAPI

from fxtrad.api.routes import router
from fxtrad.ingest import CeleryDownloadStatus, DownloadQueue, DownloadStatusQuery


def create_app(
    download_queue: DownloadQueue,
    download_status_query: DownloadStatusQuery | None = None,
) -> FastAPI:
    """Crea la aplicación FastAPI con la cola y la consulta de estado inyectadas.

    Args:
        download_queue: Implementación de la cola (ADR-006). En pruebas se
            inyecta un stub; en producción será la de Celery (TASK-004).
        download_status_query: Consulta de estado de descargas (TASK-006); por
            defecto usa la de Celery sobre la misma cola.

    Returns:
        Aplicación FastAPI lista para servir las rutas de descargas.
    """
    app = FastAPI(title="fxtrad-backend", version="0.1.0")
    app.state.download_queue = download_queue
    app.state.download_status_query = download_status_query or CeleryDownloadStatus()
    app.include_router(router)
    return app


__all__ = ["create_app"]
