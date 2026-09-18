"""Construcción de la aplicación FastAPI (ADR-002)."""

from __future__ import annotations

from fastapi import FastAPI

from fxtrad.api.routes import router
from fxtrad.ingest import DownloadQueue


def create_app(download_queue: DownloadQueue) -> FastAPI:
    """Crea la aplicación FastAPI con la cola de descargas inyectada.

    Args:
        download_queue: Implementación de la cola (ADR-006). En pruebas se
            inyecta un stub; en producción será la de Celery (TASK-004).

    Returns:
        Aplicación FastAPI lista para servir la ruta ``POST /downloads``.
    """
    app = FastAPI(title="fxtrad-backend", version="0.1.0")
    app.state.download_queue = download_queue
    app.include_router(router)
    return app


__all__ = ["create_app"]
