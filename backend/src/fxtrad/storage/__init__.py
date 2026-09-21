"""Módulo storage: persistencia de series OHLC en Parquet + DuckDB (ADR-004).

Guarda un Parquet por activo con ``time`` BIGINT único (RI-001), consulta
rangos con DuckDB (RF-005, RNF-002) y expone la capa de consulta
parametrizada por activo/rango/timeframe (TASK-016, RF-005/RNF-002).
"""

from __future__ import annotations

from fxtrad.storage.queries import (
    InvalidRangeError,
    InvalidTimeframeError,
    SeriesQuery,
)
from fxtrad.storage.series import DuplicateTimeError, ParquetSeriesStore

__all__ = [
    "DuplicateTimeError",
    "InvalidRangeError",
    "InvalidTimeframeError",
    "ParquetSeriesStore",
    "SeriesQuery",
]
