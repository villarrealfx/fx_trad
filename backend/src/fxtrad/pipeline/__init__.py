"""Módulo pipeline: limpieza, exclusión de mercado cerrado, resampling, UTC e indicadores.

Transforma datos crudos en OHLC válido (RF-003, política PA-3), excluye
periodos sin mercado (RF-004), resamplea a timeframes de visualización
(RF-009), normaliza a UTC (RNF-004) y calcula indicadores MA/RSI/ATR sobre la
serie limpia (RF-013, TASK-031).
"""

from __future__ import annotations

from fxtrad.pipeline.calendar import MarketCalendar
from fxtrad.pipeline.clean import CleaningResult, RawCandle, clean_candles
from fxtrad.pipeline.filter import filter_open_candles, filter_open_timestamps
from fxtrad.pipeline.indicators import (
    ATR_PERIOD_DEFAULT,
    MA_PERIODS_DEFAULT,
    RSI_PERIOD_DEFAULT,
    IndicatorsResult,
    compute_indicators,
)
from fxtrad.pipeline.resample import (
    InvalidSourceTimeframeError,
    InvalidTimeframeError,
    ResamplingResult,
    resample_ohlc,
)

__all__ = [
    "ATR_PERIOD_DEFAULT",
    "CleaningResult",
    "IndicatorsResult",
    "InvalidSourceTimeframeError",
    "InvalidTimeframeError",
    "MA_PERIODS_DEFAULT",
    "MarketCalendar",
    "RawCandle",
    "RSI_PERIOD_DEFAULT",
    "ResamplingResult",
    "clean_candles",
    "compute_indicators",
    "filter_open_candles",
    "filter_open_timestamps",
    "resample_ohlc",
]
