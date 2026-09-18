"""Tests de alineación del contrato OHLC: modelo Pydantic ↔ schema canónico.

Lee ``contracts/ohlc.schema.json`` como fuente de verdad y compara contra el
esquema generado por Pydantic para ``Candle`` y ``OhlcResponse``.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from fxtrad.contracts.ohlc import Candle, OhlcResponse

_REPO_ROOT = Path(__file__).resolve().parents[3]
_CANONICAL_PATH = _REPO_ROOT / "contracts" / "ohlc.schema.json"


@pytest.fixture(scope="module")
def canonical() -> dict[str, Any]:
    with _CANONICAL_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="module")
def candle_def(canonical: dict[str, Any]) -> dict[str, Any]:
    return canonical["definitions"]["candle"]


@pytest.fixture(scope="module")
def response_def(canonical: dict[str, Any]) -> dict[str, Any]:
    return canonical["definitions"]["ohlcResponse"]


# -- Candle ---------------------------------------------------------------


class TestCandleAlignment:
    """Verifica que el esquema Pydantic de Candle es compatible con el canónico."""

    def test_field_keys_match(self, candle_def: dict[str, Any]) -> None:
        pydantic = Candle.model_json_schema()
        assert list(pydantic["properties"].keys()) == list(
            candle_def["properties"].keys()
        ), "Las claves de Candle no coinciden con el schema canónico."

    def test_field_types_match(self, candle_def: dict[str, Any]) -> None:
        pydantic = Candle.model_json_schema()
        for field in candle_def["properties"]:
            assert (
                pydantic["properties"][field]["type"] == candle_def["properties"][field]["type"]
            ), f"Tipo de campo '{field}' no coincide entre Pydantic y canónico."

    def test_required_fields_match(self, candle_def: dict[str, Any]) -> None:
        pydantic = Candle.model_json_schema()
        assert set(pydantic["required"]) == set(candle_def["required"])

    def test_additional_properties_forbidden(self, candle_def: dict[str, Any]) -> None:
        pydantic = Candle.model_json_schema()
        assert pydantic.get("additionalProperties") is False
        assert candle_def.get("additionalProperties") is False


# -- OhlcResponse ---------------------------------------------------------


class TestOhlcResponseAlignment:
    """Verifica que el esquema Pydantic de OhlcResponse es compatible con el canónico."""

    def test_field_keys_match(self, response_def: dict[str, Any]) -> None:
        pydantic = OhlcResponse.model_json_schema()
        assert list(pydantic["properties"].keys()) == list(
            response_def["properties"].keys()
        ), "Las claves de OhlcResponse no coinciden con el schema canónico."

    def test_symbol_is_string(self, response_def: dict[str, Any]) -> None:
        pydantic = OhlcResponse.model_json_schema()
        assert pydantic["properties"]["symbol"]["type"] == "string"

    def test_candles_is_array(self, response_def: dict[str, Any]) -> None:
        pydantic = OhlcResponse.model_json_schema()
        assert pydantic["properties"]["candles"]["type"] == "array"

    def test_timeframe_enum_values_match(self, canonical: dict[str, Any]) -> None:
        expected = canonical["definitions"]["timeframe"]["enum"]
        pydantic_schema = OhlcResponse.model_json_schema()
        pydantic_enum = pydantic_schema["properties"]["timeframe"]["enum"]
        assert sorted(pydantic_enum) == sorted(
            expected
        ), "El enum Timeframe no coincide entre Pydantic y el schema canónico."

    def test_additional_properties_forbidden(self, response_def: dict[str, Any]) -> None:
        pydantic = OhlcResponse.model_json_schema()
        assert pydantic.get("additionalProperties") is False
        assert response_def.get("additionalProperties") is False


# -- Comportamiento del modelo --------------------------------------------


class TestCandleBehavior:
    """Verifica que los modelos rechazan o aceptan valores según el contrato."""

    def test_candle_round_trip_json(self) -> None:
        candle = Candle(time=1700000000, open=1.08, high=1.09, low=1.07, close=1.085)
        exported = candle.model_dump(mode="json")
        assert exported == {
            "time": 1700000000,
            "open": 1.08,
            "high": 1.09,
            "low": 1.07,
            "close": 1.085,
        }

    def test_candle_rejects_unknown_fields(self) -> None:
        with pytest.raises(ValidationError):
            Candle(
                time=1700000000,
                open=1.08,
                high=1.09,
                low=1.07,
                close=1.085,
                volume=1000,
            )

    def test_candle_rejects_negative_time(self) -> None:
        with pytest.raises(ValidationError):
            Candle(time=-1, open=1.0, high=1.0, low=1.0, close=1.0)

    def test_candle_rejects_negative_price(self) -> None:
        with pytest.raises(ValidationError):
            Candle(time=100, open=-1.0, high=1.0, low=1.0, close=1.0)

    def test_candle_invariants_not_enforced(self) -> None:
        """La validación semántica de precios se difiere al pipeline (TASK-010/011).

        Este test documenta que el contrato SOLO valida forma y tipos; las
        invariante de precio (high >= max(open,close), etc.) NO se verifican aquí.
        """
        # Un candle con high < close es construible sin error
        candle = Candle(time=100, open=1.10, high=1.08, low=1.07, close=1.09)
        assert candle.close > candle.high  # anomalia de precio, aceptada en el contrato


class TestOhlcResponseBehavior:
    """Verifica que OhlcResponse rechaza valores inválidos."""

    def test_invalid_timeframe_rejected(self) -> None:
        with pytest.raises(ValidationError):
            OhlcResponse(symbol="EURUSD", timeframe="3m", candles=[])

    def test_round_trip_preserves_values(self) -> None:
        candle = Candle(time=1700000000, open=1.08, high=1.09, low=1.07, close=1.085)
        response = OhlcResponse(symbol="EURUSD", timeframe="1s", candles=[candle])
        exported = response.model_dump(mode="json")
        assert exported["symbol"] == "EURUSD"
        assert exported["timeframe"] == "1s"
        assert exported["candles"] == [
            {"time": 1700000000, "open": 1.08, "high": 1.09, "low": 1.07, "close": 1.085}
        ]
