"""Contrato canónico OHLC (backend).

Exporta los modelos tipados que implementan el contrato definido en
``contracts/ohlc-contract.md`` (espejo de ``frontend/src/contracts/ohlc.ts``).
"""

from fxtrad.contracts.ohlc import Candle, OhlcResponse, Timeframe

__all__ = ["Candle", "OhlcResponse", "Timeframe"]
