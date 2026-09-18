"""Módulo ingest: catálogo de activos y descarga de datos históricos (EP-001).

Concentra el catálogo de activos analizables (forex, metales y petróleo), el
modelo de request de descarga y el cliente Dukascopy (este último en TASK-002).
Cubre RF-001 (descarga por activo y rango), RX-001 (integración Dukascopy) y
RNF-003 (ventana de hasta 2 años).
"""

from __future__ import annotations

from fxtrad.ingest.catalog import ASSET_CATALOG, Asset, AssetType, assets_by_type, get_asset
from fxtrad.ingest.requests import DownloadRequest

__all__ = [
    "ASSET_CATALOG",
    "Asset",
    "AssetType",
    "DownloadRequest",
    "assets_by_type",
    "get_asset",
]
