"""Tests del catálogo de activos (TASK-001, RF-001).

Verifica que el catálogo cubre las tres categorías exigidas por la DoD
(≥1 forex, 1 metal y 1 petróleo) y que las consultas sobre símbolos funcionan.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from fxtrad.ingest import ASSET_CATALOG, Asset, assets_by_type, get_asset

_SAMPLE = Asset(symbol="EURUSD", type="forex", name="Euro / Dólar estadounidense")


class TestCatalogCoverage:
    """DoD: el catálogo incluye al menos un forex, un metal y un petróleo."""

    def test_catalog_is_not_empty(self) -> None:
        assert len(ASSET_CATALOG) > 0

    def test_catalog_has_at_least_one_forex(self) -> None:
        assert any(a.type == "forex" for a in ASSET_CATALOG)

    def test_catalog_has_at_least_one_metal(self) -> None:
        assert any(a.type == "metal" for a in ASSET_CATALOG)

    def test_catalog_has_at_least_one_oil(self) -> None:
        assert any(a.type == "oil" for a in ASSET_CATALOG)

    def test_all_types_are_valid_literals(self) -> None:
        valid = {"forex", "metal", "oil"}
        assert {a.type for a in ASSET_CATALOG}.issubset(valid)


class TestCatalogQueries:
    """Consultas del catálogo por símbolo y por categoría."""

    def test_get_asset_finds_known_symbol(self) -> None:
        assert get_asset("EURUSD") is not None
        assert get_asset("EURUSD").type == "forex"

    def test_get_asset_returns_none_for_unknown(self) -> None:
        assert get_asset("BTCUSD") is None

    def test_assets_by_type_only_contains_matching(self) -> None:
        for asset_type in ("forex", "metal", "oil"):
            grouped = assets_by_type(asset_type)
            assert grouped, f"Debe existir al menos un activo de tipo {asset_type}"
            assert all(a.type == asset_type for a in grouped)


class TestAssetModel:
    """Forma e inmutabilidad del modelo Asset."""

    def test_asset_is_immutable(self) -> None:
        with pytest.raises(ValidationError):
            _SAMPLE.symbol = "XXX"

    def test_asset_rejects_extra_fields(self) -> None:
        with pytest.raises(ValidationError):
            Asset(symbol="EURUSD", type="forex", name="X", volume=1000)
