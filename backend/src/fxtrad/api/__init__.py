"""Módulo api: exposición REST del backend (ADR-002).

Concentra las rutas HTTP consumidas por el frontend y el factory de la app.
Expone `POST /downloads` (TASK-003, RF-001), `GET /downloads/{task_id}`
(TASK-006), `GET /downloads` (TASK-047), `GET /assets` (TASK-020) y
`GET /series` (TASK-021, RX-002). La interfaz pública está documentada en
`_docs/module-interfaces.md` (TASK-042).
"""

from __future__ import annotations

from fxtrad.api.app import create_app, create_default_app
from fxtrad.api.catalog import AssetRow, AssetStatus, CatalogQuery
from fxtrad.api.downloads import (
    DownloadHistoryQuery,
    DownloadHistoryRow,
    DownloadMetadataReader,
    DownloadRange,
)
from fxtrad.api.routes import DownloadAccepted, router

__all__ = [
    "AssetRow",
    "AssetStatus",
    "CatalogQuery",
    "DownloadAccepted",
    "DownloadHistoryQuery",
    "DownloadHistoryRow",
    "DownloadMetadataReader",
    "DownloadRange",
    "create_app",
    "create_default_app",
    "router",
]
