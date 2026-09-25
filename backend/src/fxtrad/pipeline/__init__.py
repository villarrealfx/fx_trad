"""Módulo pipeline: limpieza, exclusión de mercado cerrado, resampling, UTC e indicadores.

Transforma datos crudos en OHLC válido (RF-003, política PA-3), excluye
periodos sin mercado (RF-004), resamplea a timeframes de visualización
(RF-009), normaliza a UTC (RNF-004), persiste la descarga en la base local
(RF-006/RI-002, TASK-050), regenera los Parquets pre-resampling tras un merge
(RF-009, TASK-049) y calcula indicadores MA/RSI/ATR sobre la serie limpia
(RF-013, TASK-031).
"""

from __future__ import annotations

from fxtrad.pipeline.calendar import MarketCalendar
from fxtrad.pipeline.clean import CleaningResult, RawCandle, clean_candles
from fxtrad.pipeline.filter import filter_open_candles, filter_open_timestamps
from fxtrad.pipeline.indicator_registry import (
    IndicatorRegistry,
    IndicatorSpec,
)
from fxtrad.pipeline.indicators import (
    ATR_PERIOD_DEFAULT,
    INDICATOR_PLUGINS_PACKAGE,
    MA_PERIODS_DEFAULT,
    REGISTRY,
    RSI_PERIOD_DEFAULT,
    IndicatorsResult,
    compute_indicators,
)
from fxtrad.pipeline.normalize import (
    SchemaViolationError,
    normalize_price,
    normalize_row,
    normalize_schema,
    normalize_time,
)
from fxtrad.pipeline.persist import DownloadPersister, build_persister
from fxtrad.pipeline.refresh import (
    DERIVED_TIMEFRAMES,
    ENV_TIMEFRAMES,
    DerivedSeriesRefresher,
    parse_timeframes,
    timeframes_from_env,
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
    "DERIVED_TIMEFRAMES",
    "DownloadPersister",
    "DerivedSeriesRefresher",
    "ENV_TIMEFRAMES",
    "IndicatorsResult",
    "IndicatorRegistry",
    "IndicatorSpec",
    "INDICATOR_PLUGINS_PACKAGE",
    "InvalidSourceTimeframeError",
    "InvalidTimeframeError",
    "MA_PERIODS_DEFAULT",
    "MarketCalendar",
    "RawCandle",
    "REGISTRY",
    "RSI_PERIOD_DEFAULT",
    "ResamplingResult",
    "SchemaViolationError",
    "clean_candles",
    "compute_indicators",
    "filter_open_candles",
    "filter_open_timestamps",
    "normalize_price",
    "normalize_row",
    "normalize_schema",
    "parse_timeframes",
    "build_persister",
    "normalize_time",
    "resample_ohlc",
    "timeframes_from_env",
]
