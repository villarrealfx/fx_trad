"""Módulo ingest: catálogo de activos y descarga de datos históricos (EP-001).

Concentra el catálogo de activos analizables (forex, metales y petróleo), el
modelo de request de descarga, el cliente Dukascopy (TASK-002) y el contrato
de cola asíncrona (TASK-003). Cubre RF-001 (descarga por activo y rango),
RX-001 (integración Dukascopy) y RNF-003 (ventana de hasta 2 años).
"""

from __future__ import annotations

from fxtrad.ingest.catalog import ASSET_CATALOG, Asset, AssetType, assets_by_type, get_asset
from fxtrad.ingest.dukascopy import (
    DukascopyClient,
    RawTick,
    aggregate_to_ohlc,
    build_hour_url,
    decode_bi5,
    hour_start_epoch,
)
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
    "DukascopyClient",
    "RawTick",
    "aggregate_to_ohlc",
    "assets_by_type",
    "build_hour_url",
    "celery_app",
    "decode_bi5",
    "download_asset",
    "get_asset",
    "hour_start_epoch",
]
