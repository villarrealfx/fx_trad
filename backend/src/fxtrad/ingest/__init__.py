"""Módulo ingest: catálogo de activos y descarga de datos históricos (EP-001).

Concentra el catálogo de activos analizables (forex, metales y petróleo), el
modelo de request de descarga, el cliente de Dukascopy vía API chart freeserv
(TASK-002, ADR-010) y el contrato de cola asíncrona (TASK-003). Cubre RF-001
(descarga por activo y rango), RX-001 (integración Dukascopy) y RNF-003
(ventana de hasta 2 años).
"""

from __future__ import annotations

from fxtrad.ingest.batches import MAX_BATCH_SECONDS, DownloadBatch, plan_batches
from fxtrad.ingest.catalog import ASSET_CATALOG, Asset, AssetType, assets_by_type, get_asset
from fxtrad.ingest.freeserv import FreeservClient, candles_from_ohlc
from fxtrad.ingest.pacing import DEFAULT_PAUSE_SECONDS, download_blocks
from fxtrad.ingest.planner import (
    DEFAULT_MAX_BLOCK_CANDLES,
    DownloadBlock,
    plan_blocks,
    planned_candles,
)
from fxtrad.ingest.queue import DownloadQueue
from fxtrad.ingest.requests import DownloadRequest
from fxtrad.ingest.resume import coalesce_ranges, failed_ranges, pending_ranges
from fxtrad.ingest.status import DownloadInfo, DownloadStatus, DownloadStatusQuery
from fxtrad.ingest.tasks import (
    CeleryDownloadQueue,
    CeleryDownloadStatus,
    celery_app,
    download_asset,
    resume_download,
)
from fxtrad.ingest.times import to_epoch_seconds
from fxtrad.ingest.window import MAX_WINDOW_SECONDS, validate_request_window

__all__ = [
    "ASSET_CATALOG",
    "Asset",
    "AssetType",
    "CeleryDownloadQueue",
    "CeleryDownloadStatus",
    "DEFAULT_MAX_BLOCK_CANDLES",
    "DEFAULT_PAUSE_SECONDS",
    "DownloadBatch",
    "DownloadBlock",
    "DownloadInfo",
    "DownloadQueue",
    "DownloadRequest",
    "DownloadStatus",
    "DownloadStatusQuery",
    "FreeservClient",
    "assets_by_type",
    "candles_from_ohlc",
    "celery_app",
    "coalesce_ranges",
    "download_asset",
    "download_blocks",
    "failed_ranges",
    "get_asset",
    "MAX_BATCH_SECONDS",
    "MAX_WINDOW_SECONDS",
    "pending_ranges",
    "plan_batches",
    "plan_blocks",
    "planned_candles",
    "resume_download",
    "to_epoch_seconds",
    "validate_request_window",
]
