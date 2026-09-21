"""Módulo ingest: catálogo de activos y descarga de datos históricos (EP-001).

Concentra el catálogo de activos analizables (forex, metales y petróleo), el
modelo de request de descarga, el cliente de Dukascopy vía API chart freeserv
(TASK-002, ADR-010) y el contrato de cola asíncrona (TASK-003). Cubre RF-001
(descarga por activo y rango), RX-001 (integración Dukascopy) y RNF-003
(ventana de hasta 2 años).
"""

from __future__ import annotations

from fxtrad.ingest.catalog import ASSET_CATALOG, Asset, AssetType, assets_by_type, get_asset
from fxtrad.ingest.freeserv import FreeservClient, aggregate_to_ohlc, hour_start_epoch
from fxtrad.ingest.queue import DownloadQueue
from fxtrad.ingest.requests import DownloadRequest
from fxtrad.ingest.tasks import CeleryDownloadQueue, celery_app, download_asset

__all__ = [
    "ASSET_CATALOG",
    "Asset",
    "AssetType",
    "CeleryDownloadQueue",
    "DownloadQueue",
    "DownloadRequest",
    "FreeservClient",
    "aggregate_to_ohlc",
    "assets_by_type",
    "celery_app",
    "download_asset",
    "get_asset",
    "hour_start_epoch",
]
