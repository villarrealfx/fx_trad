"""Módulo pipeline: limpieza, exclusión de mercado cerrado, resampling y UTC.

Transforma datos crudos en OHLC válido (RF-003), excluye periodos sin mercado
(RF-004), resamplea a timeframes de visualización (RF-009) y normaliza a UTC
(RNF-004).
"""

from __future__ import annotations

from fxtrad.pipeline.calendar import MarketCalendar

__all__ = ["MarketCalendar"]
