"""Construcción de la aplicación FastAPI (ADR-002)."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI

from fxtrad.api.routes import router
from fxtrad.ingest import CeleryDownloadStatus, DownloadQueue, DownloadStatusQuery
from fxtrad.storage import ParquetSeriesStore, SeriesQuery


def create_app(
    download_queue: DownloadQueue,
    download_status_query: DownloadStatusQuery | None = None,
    series_query: SeriesQuery | None = None,
) -> FastAPI:
    """Crea la aplicación FastAPI con dependencias inyectadas.

    Args:
        download_queue: Implementación de la cola (ADR-006). En pruebas se
            inyecta un stub; en producción será la de Celery (TASK-004).
        download_status_query: Consulta de estado de descargas (TASK-006); por
            defecto usa la de Celery sobre la misma cola.
        series_query: Consulta de series OHLC por activo/rango/timeframe
            (TASK-021); por defecto se construye sobre el directorio de datos
            (ADR-004/ADR-007).

    Returns:
        Aplicación FastAPI lista para servir las rutas de descargas y series.
    """
    app = FastAPI(title="fxtrad-backend", version="0.1.0")
    app.state.download_queue = download_queue
    app.state.download_status_query = download_status_query or CeleryDownloadStatus()
    app.state.series_query = series_query or _default_series_query()
    app.include_router(router)
    return app


def _default_series_query() -> SeriesQuery:
    """Construye la consulta de series por defecto sobre el directorio de datos.

    Localiza los Parquet por activo en la variable ``FXTRAD_DATA_DIR`` (por
    defecto ``data``), coherente con el volumen ``data/`` del despliegue local
    (ADR-004, ADR-007, AR-2).
    """
    data_dir = Path(os.getenv("FXTRAD_DATA_DIR", "data"))
    return SeriesQuery(ParquetSeriesStore(data_dir))


__all__ = ["create_app"]
