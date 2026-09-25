"""Construcción de la aplicación FastAPI (ADR-002)."""

from __future__ import annotations

import os
from pathlib import Path

import structlog
from fastapi import FastAPI

from fxtrad.api.catalog import CatalogQuery
from fxtrad.api.downloads import DownloadHistoryQuery
from fxtrad.api.routes import router
from fxtrad.ingest import (
    CeleryDownloadQueue,
    CeleryDownloadStatus,
    DownloadQueue,
    DownloadStatusQuery,
)
from fxtrad.storage import (
    DEFAULT_MAX_CANDLES,
    DEFAULT_MAX_WINDOWS,
    CachedSeriesQuery,
    DownloadMetadataStore,
    ParquetSeriesStore,
    SeriesQuery,
    SeriesReader,
    SeriesWindowCache,
)

logger = structlog.get_logger()


def create_app(
    download_queue: DownloadQueue,
    download_status_query: DownloadStatusQuery | None = None,
    series_query: SeriesReader | None = None,
    catalog_query: CatalogQuery | None = None,
    download_history_query: DownloadHistoryQuery | None = None,
) -> FastAPI:
    """Crea la aplicación FastAPI con dependencias inyectadas.

    Args:
        download_queue: Implementación de la cola (ADR-006). En pruebas se
            inyecta un stub; en producción será la de Celery (TASK-004).
        download_status_query: Consulta de estado de descargas (TASK-006); por
            defecto usa la de Celery sobre la misma cola.
        series_query: Consulta de series OHLC por activo/rango/timeframe
            (TASK-021), cacheada en memoria por ventana (TASK-044, ADR-007); por
            defecto se construye sobre el directorio de datos (ADR-004/ADR-007).
        catalog_query: Consulta del catálogo de activos con cobertura y estado
            (TASK-020, RF-007/CMP-006); por defecto se construye sobre el
            directorio de datos (ADR-004).
        download_history_query: Consulta del historial de descargas (TASK-047);
            por defecto se construye sobre el directorio de datos (ADR-004).

    Returns:
        Aplicación FastAPI lista para servir las rutas de descargas, series y
        catálogo.
    """
    app = FastAPI(title="fxtrad-backend", version="0.1.0")
    app.state.download_queue = download_queue
    app.state.download_status_query = download_status_query or CeleryDownloadStatus()
    app.state.series_query = series_query or _default_series_query()
    app.state.catalog_query = catalog_query or _default_catalog_query()
    app.state.download_history_query = download_history_query or _default_download_history_query()
    app.include_router(router)
    return app


def _default_series_query() -> SeriesReader:
    """Construye la consulta de series por defecto, con caché in-memory.

    Localiza los Parquet por activo en la variable ``FXTRAD_DATA_DIR`` (por
    defecto ``data``), coherente con el volumen ``data/`` del despliegue local
    (ADR-004, ADR-007, AR-2). Envuelve la lectura en la caché de ventanas de
    TASK-044: la segunda carga del mismo rango se sirve desde memoria (KPI-3).
    Los límites son configurables con ``FXTRAD_CACHE_MAX_WINDOWS`` y
    ``FXTRAD_CACHE_MAX_CANDLES``.
    """
    data_dir = Path(os.getenv("FXTRAD_DATA_DIR", "data"))
    cache = SeriesWindowCache(
        max_windows=_env_int("FXTRAD_CACHE_MAX_WINDOWS", DEFAULT_MAX_WINDOWS),
        max_candles=_env_int("FXTRAD_CACHE_MAX_CANDLES", DEFAULT_MAX_CANDLES),
    )
    return CachedSeriesQuery(SeriesQuery(ParquetSeriesStore(data_dir)), cache)


def _env_int(name: str, default: int) -> int:
    """Lee un entero del entorno y cae al valor por defecto si no es válido.

    Args:
        name: Nombre de la variable de entorno.
        default: Valor usado si la variable falta, está vacía o no es entera.

    Returns:
        El entero configurado o ``default``.
    """
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError:
        logger.warning(
            "configuracion_cache_invalida",
            variable=name,
            valor=raw,
            por_defecto=default,
        )
        return default


def _default_catalog_query() -> CatalogQuery:
    """Construye la consulta de catálogo por defecto sobre el directorio de datos.

    El catálogo (RF-007/CMP-006) combina la cobertura del Parquet 1s
    (``ParquetSeriesStore``) y el último estado de descarga de la tabla DuckDB
    (``DownloadMetadataStore``, TASK-018/RI-002) sobre ``FXTRAD_DATA_DIR``.
    """
    data_dir = Path(os.getenv("FXTRAD_DATA_DIR", "data"))
    return CatalogQuery(ParquetSeriesStore(data_dir), DownloadMetadataStore(data_dir))


def _default_download_history_query() -> DownloadHistoryQuery:
    """Construye la consulta de historial sobre el directorio de datos."""
    data_dir = Path(os.getenv("FXTRAD_DATA_DIR", "data"))
    return DownloadHistoryQuery(DownloadMetadataStore(data_dir))


def create_default_app() -> FastAPI:
    """Crea la aplicación con las dependencias de producción (TASK-038).

    Punto de entrada sin argumentos para Uvicorn en el compose (``--factory``):
    compone la cola real de Celery (ADR-006, ``FXTRAD_BROKER_URL``) y deja que
    ``create_app`` construya el resto de consultas sobre ``FXTRAD_DATA_DIR``.
    Las pruebas inyectan dobles con ``create_app`` y no pasan por aquí.

    Returns:
        Aplicación FastAPI lista para servir con las dependencias reales.
    """
    return create_app(CeleryDownloadQueue())


__all__ = ["create_app", "create_default_app"]
