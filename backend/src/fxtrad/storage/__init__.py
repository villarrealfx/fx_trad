"""Módulo storage: series OHLC y metadatos de descarga en DuckDB (ADR-004).

Guarda un Parquet por activo con ``time`` BIGINT único (RI-001), consulta
rangos con DuckDB (RF-005, RNF-002), expone la capa de consulta parametrizada
por activo/rango/timeframe (TASK-016), cachea en memoria las ventanas ya
materializadas (TASK-044, ADR-007) y persiste los metadatos de descarga en
una tabla DuckDB (TASK-018, RI-002/RF-006).
"""

from __future__ import annotations

from fxtrad.storage.cache import (
    DEFAULT_MAX_CANDLES,
    DEFAULT_MAX_WINDOWS,
    CachedSeriesQuery,
    CacheStats,
    SeriesReader,
    SeriesWindowCache,
    window_key,
)
from fxtrad.storage.metadata import (
    DownloadMetadata,
    DownloadMetadataStore,
    DownloadStatus,
)
from fxtrad.storage.queries import (
    InvalidRangeError,
    InvalidTimeframeError,
    SeriesQuery,
)
from fxtrad.storage.series import DuplicateTimeError, ParquetSeriesStore

__all__ = [
    "DEFAULT_MAX_CANDLES",
    "DEFAULT_MAX_WINDOWS",
    "CacheStats",
    "CachedSeriesQuery",
    "DownloadMetadata",
    "DownloadMetadataStore",
    "DownloadStatus",
    "DuplicateTimeError",
    "InvalidRangeError",
    "InvalidTimeframeError",
    "ParquetSeriesStore",
    "SeriesQuery",
    "SeriesReader",
    "SeriesWindowCache",
    "window_key",
]
