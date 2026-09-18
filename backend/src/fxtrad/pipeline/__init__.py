"""Módulo pipeline: limpieza, exclusión de mercado cerrado, resampling y UTC.

Transforma datos crudos en OHLC válido (RF-003, política PA-3), excluye
periodos sin mercado (RF-004), resamplea a timeframes de visualización
(RF-009) y normaliza a UTC (RNF-004).
"""

from __future__ import annotations

from fxtrad.pipeline.calendar import MarketCalendar
from fxtrad.pipeline.clean import CleaningResult, RawCandle, clean_candles
from fxtrad.pipeline.filter import filter_open_candles, filter_open_timestamps

__all__ = [
    "CleaningResult",
    "MarketCalendar",
    "RawCandle",
    "clean_candles",
    "filter_open_candles",
    "filter_open_timestamps",
]
