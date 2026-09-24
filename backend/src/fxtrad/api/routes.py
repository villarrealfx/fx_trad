"""Rutas HTTP de descargas y series (RF-001/RF-008/RX-002, HU-001/HU-009).

``POST /downloads`` valida la solicitud (TASK-001) y la encola en la cola
asíncrona (ADR-006). Responde 202 Accepted con el identificador de la tarea;
un body inválido se rechaza con 422 sin encolar nada (criterio HU-001).

``GET /series`` devuelve la serie OHLC de un activo por rango y timeframe
(TASK-021), delegando en la capa de consulta de `storage` (RF-009/ADR-007);
responde en el contrato ``OhlcResponse`` del frontend (RX-002, RNF-008).

``GET /assets`` devuelve el catálogo de activos con datos almacenados en el
contrato CMP-006 (TASK-020, RF-007), compuesto por `CatalogQuery`.

El ``task_id`` lo genera la cola, no esta ruta: así el endpoint depende de la
interfaz ``DownloadQueue`` y TASK-004 aporta la implementación real con Celery.
"""

from __future__ import annotations

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from fxtrad.api.catalog import AssetRow, CatalogQuery
from fxtrad.contracts.ohlc import OhlcResponse, Timeframe
from fxtrad.ingest import DownloadInfo, DownloadQueue, DownloadRequest, DownloadStatusQuery
from fxtrad.storage import (
    InvalidRangeError,
    InvalidTimeframeError,
    SeriesQuery,
)

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


def _get_series_query(request: Request) -> SeriesQuery:
    """Devuelve la consulta de series inyectada al crear la aplicación (TASK-021)."""
    query: SeriesQuery = request.app.state.series_query
    return query


SeriesQueryDependency = Annotated[SeriesQuery, Depends(_get_series_query)]


def _get_catalog_query(request: Request) -> CatalogQuery:
    """Devuelve la consulta de catálogo inyectada al crear la aplicación."""
    query: CatalogQuery = request.app.state.catalog_query
    return query


CatalogQueryDependency = Annotated[CatalogQuery, Depends(_get_catalog_query)]


@router.get(
    "/assets",
    response_model=list[AssetRow],
    summary="Devuelve el catálogo de activos con datos almacenados",
)
def get_assets(
    request: Request,
    catalog_query: CatalogQueryDependency,
) -> list[AssetRow]:
    """Devuelve los activos con cobertura y estado en el contrato CMP-006.

    Compone el catálogo canónico de RF-001 con la cobertura almacenada en el
    Parquet 1s y el último estado de descarga (RF-007, TASK-020): la
    biblioteca del frontend lista solo activos con datos guardados (SCR-001).

    Args:
        request: Request HTTP (para correlación).
        catalog_query: Consulta de catálogo inyectada (cobertura + estado).

    Returns:
        Filas de activos con datos almacenados, en orden canónico.
    """
    rows = catalog_query.list()
    logger.info(
        "catalogo_activos_consultado",
        correlation_id=request.headers.get("x-correlation-id"),
        activos=len(rows),
    )
    return rows


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


@router.get(
    "/series",
    response_model=OhlcResponse,
    summary="Devuelve la serie OHLC de un activo en el rango y timeframe",
)
def get_series(
    request: Request,
    symbol: str,
    series_query: SeriesQueryDependency,
    timeframe: Timeframe = "1s",
    start: int | None = None,
    end: int | None = None,
) -> OhlcResponse:
    """Devuelve las velas del activo en el rango ``[start, end]`` (TASK-021).

    Args:
        request: Request HTTP (para correlación y estado de la aplicación).
        symbol: Símbolo del activo (identificador del catálogo).
        series_query: Capa de consulta OHLC por activo/rango/timeframe.
        timeframe: Granularidad canónica (RF-009); ``1s`` por defecto.
        start: Inicio del rango en segundos UTC (inclusivo); si es ``None``,
            no hay cota inferior.
        end: Fin del rango en segundos UTC (inclusivo); si es ``None``, no
            hay cota superior.

    Returns:
        Serie OHLC del rango/timeframe en el contrato del frontend (RNF-008).

    Raises:
        HTTPException: 404 si el activo no tiene serie; 400 si el rango es
            inválido o el símbolo no es seguro; 422 si el timeframe no es
            canónico (validado por el tipo ``Timeframe``).
    """
    try:
        candles = series_query.read(symbol, timeframe=timeframe, start=start, end=end)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (InvalidRangeError, InvalidTimeframeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    logger.info(
        "serie_solicitada",
        correlation_id=request.headers.get("x-correlation-id"),
        activo=symbol,
        timeframe=timeframe,
        inicio=start,
        fin=end,
        velas=len(candles),
    )
    return OhlcResponse(symbol=symbol, timeframe=timeframe, candles=candles)


__all__ = ["DownloadAccepted", "router"]
