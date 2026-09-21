"""Módulo storage: persistencia de series OHLC en Parquet + DuckDB (ADR-004).

Guarda un Parquet por activo con ``time`` BIGINT único (RI-001) y consulta
rangos con DuckDB (RF-005, RNF-002).
"""

from __future__ import annotations

from fxtrad.storage.series import DuplicateTimeError, ParquetSeriesStore

__all__ = [
    "DuplicateTimeError",
    "ParquetSeriesStore",
]
