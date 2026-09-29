"""Catálogo de activos analizables (RF-001).

Define los instrumentos que el sistema permite descargar y analizar: divisas
(forex), metales y petróleo. Los códigos aquí son canónicos del sistema; el
mapeo a los identificadores exactos de instrumentos Dukascopy se realiza en el
cliente de descarga (TASK-002).
"""

from __future__ import annotations

from typing import Literal

import structlog
from pydantic import BaseModel, ConfigDict, Field

logger = structlog.get_logger()

AssetType = Literal["forex", "metal", "oil"]
"""Categoría de activo: divisa, metal o petróleo."""


class Asset(BaseModel):
    """Instrumento financiero descargable y analizable en el sistema.

    Attributes:
        symbol: Código canónico del instrumento (p. ej. ``EURUSD``).
        name: Nombre legible del instrumento.
        type: Categoría del activo: ``forex``, ``metal`` u ``oil``.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    symbol: str = Field(description="Código canónico del instrumento, p. ej. EURUSD.")
    type: AssetType = Field(description="Categoría del activo (forex, metal u oil).")
    name: str = Field(description="Nombre legible del instrumento.")


ASSET_CATALOG: tuple[Asset, ...] = (
    Asset(symbol="EURUSD", type="forex", name="Euro / Dólar estadounidense"),
    Asset(symbol="GBPUSD", type="forex", name="Libra esterlina / Dólar estadounidense"),
    Asset(symbol="USDJPY", type="forex", name="Dólar estadounidense / Yen japonés"),
    Asset(symbol="GBPJPY", type="forex", name="Libra esterlina / Yen japonés"),
    Asset(symbol="EURJPY", type="forex", name="Euro / Yen japonés"),
    Asset(symbol="AUDUSD", type="forex", name="Dólar australiano / Dólar estadounidense"),
    Asset(symbol="USDCAD", type="forex", name="Dólar estadounidense / Dólar canadiense"),
    Asset(symbol="EURGBP", type="forex", name="Euro / Libra esterlina"),
    Asset(symbol="XAUUSD", type="metal", name="Oro spot"),
    Asset(symbol="XAGUSD", type="metal", name="Plata spot"),
    Asset(symbol="WTI", type="oil", name="Petróleo crudo WTI"),
    Asset(symbol="BRENT", type="oil", name="Petróleo crudo Brent"),
)
"""Catálogo canónico de activos, con al menos una divisa, un metal y un petróleo."""


def get_asset(symbol: str) -> Asset | None:
    """Devuelve el activo del catálogo con el símbolo indicado, o None."""
    for asset in ASSET_CATALOG:
        if asset.symbol == symbol:
            return asset
    return None


def is_known_asset(symbol: str) -> bool:
    """Devuelve True si el símbolo pertenece al catálogo de activos."""
    return get_asset(symbol) is not None


def assets_by_type(asset_type: AssetType) -> tuple[Asset, ...]:
    """Devuelve los activos del catálogo que pertenecen a la categoría indicada.

    Args:
        asset_type: ``forex``, ``metal`` u ``oil``.

    Returns:
        Tupla con los activos de esa categoría, en orden de catálogo.
    """
    return tuple(asset for asset in ASSET_CATALOG if asset.type == asset_type)


__all__ = [
    "ASSET_CATALOG",
    "Asset",
    "AssetType",
    "assets_by_type",
    "get_asset",
    "is_known_asset",
]
