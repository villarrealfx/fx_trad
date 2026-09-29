"""Contrato OHLC compartido (implementación Python).

Fija la forma y los tipos de la serie OHLC definida en
``contracts/ohlc-contract.md`` y ``contracts/ohlc.schema.json``, consumible por
el frontend sin transformaciones ad-hoc (RNF-008).

Espejo TS: ``frontend/src/contracts/ohlc.ts``. Toda modificación aquí debe
reflejarse también en el schema canónico y en el espejo TS; los tests de
alineación verifican la consistencia.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, NonNegativeInt

Timeframe = Literal["1m", "5m", "15m", "1h", "4h", "1d"]
"""Granularidad de agregación de cada vela (RF-009).

La base canónica es 1 m (ADR-012); ``"1s"`` se retiró del contrato (ADR-020).
"""


class Candle(BaseModel):
    """Vela OHLC: una fila de la serie en un instante de tiempo."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    time: NonNegativeInt = Field(
        description="Timestamp en segundos UTC, único por activo y timeframe (RI-001)."
    )
    open: float = Field(ge=0, description="Precio de apertura del intervalo.")
    high: float = Field(ge=0, description="Precio máximo del intervalo.")
    low: float = Field(ge=0, description="Precio mínimo del intervalo.")
    close: float = Field(ge=0, description="Precio de cierre del intervalo.")


class OhlcResponse(BaseModel):
    """Respuesta de una serie para el frontend (RX-002)."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    symbol: str = Field(description="Código del activo, p. ej. EURUSD.")
    timeframe: Timeframe = Field(description="Granularidad de agregación de cada vela.")
    candles: list[Candle] = Field(description="Velas ordenadas ascendentemente por time.")


__all__ = ["Candle", "OhlcResponse", "Timeframe"]
