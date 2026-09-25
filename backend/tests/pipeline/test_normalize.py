"""Tests de normalización UTC y validación de esquema (TASK-011, RNF-004).

DoD: todas las filas cumplen ``time`` BIGINT UTC y tipos numéricos. Verifica
las coerciones admitidas (passthrough, ``datetime`` aware/naive, ``float`` y
``str`` enteros, precios numéricos) y el rechazo estricto con índice de fila de
cualquier valor que no cumpla el esquema ADR-004.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

import pytest

from fxtrad.pipeline import (
    SchemaViolationError,
    normalize_price,
    normalize_row,
    normalize_schema,
    normalize_time,
)

_SEC = 1786442400  # 2026-08-11 10:00:00 UTC


def _row(**overrides: object) -> dict[str, object]:
    """Fila cruda canónica con valores por defecto (franco de claves)."""
    row = {"time": _SEC, "open": 1.09, "high": 1.10, "low": 1.08, "close": 1.09}
    row.update(overrides)
    return row


class TestNormalizeTime:
    """El ``time`` converge siempre a segundos UTC enteros (RNF-004)."""

    def test_int_is_identity(self) -> None:
        assert normalize_time(_SEC) == _SEC

    def test_utc_aware_datetime_is_identity(self) -> None:
        value = datetime(2026, 8, 11, 10, 0, 0, tzinfo=UTC)
        assert normalize_time(value) == _SEC

    def test_naive_datetime_is_assumed_utc(self) -> None:
        value = datetime(2026, 8, 11, 10, 0, 0)
        assert normalize_time(value) == _SEC

    def test_non_utc_timezone_converges(self) -> None:
        value = datetime(2026, 8, 11, 12, 0, 0, tzinfo=timezone(timedelta(hours=2)))
        assert normalize_time(value) == _SEC

    def test_integer_float_is_truncated_to_int(self) -> None:
        assert normalize_time(float(_SEC)) == _SEC

    def test_numeric_string_is_parsed(self) -> None:
        assert normalize_time(str(_SEC)) == _SEC


class TestNormalizeTimeRejections:
    """Valores no normalizables se rechazan con ``SchemaViolationError``."""

    @pytest.mark.parametrize("value", [1.5, "abc", None, object(), True, False])
    def test_rejects_non_epoch_types(self, value: object) -> None:
        with pytest.raises(SchemaViolationError):
            normalize_time(value)

    @pytest.mark.parametrize("value", [float("nan"), float("inf")])
    def test_rejects_non_finite_floats(self, value: float) -> None:
        with pytest.raises(SchemaViolationError):
            normalize_time(value)


class TestNormalizePrice:
    """Los precios se convierten a ``float`` (esquema DOUBLE, ADR-004)."""

    def test_int_and_float_are_preserved_as_float(self) -> None:
        assert normalize_price(1) == 1.0
        assert normalize_price(1.5) == 1.5

    def test_numeric_string_parses_to_float(self) -> None:
        assert normalize_price("1.0950") == 1.0950

    @pytest.mark.parametrize("value", ["1,5", "abc", None, object(), True])
    def test_rejects_non_numeric_values(self, value: object) -> None:
        with pytest.raises(SchemaViolationError):
            normalize_price(value)


class TestNormalizeRow:
    """Cada fila cumple el esquema con tipos correctos y orden de entrada."""

    def test_canonical_row_is_normalized(self) -> None:
        candle = normalize_row(_row(), 0)
        assert candle.time == _SEC
        assert candle.open == 1.09
        assert candle.high == 1.10
        assert candle.low == 1.08
        assert candle.close == 1.09

    def test_mixed_value_types_coerce_to_schema(self) -> None:
        candle = normalize_row(
            _row(time="1786442400", open=1, high="1.10", low=18000, close=1.09), 0
        )
        assert isinstance(candle.time, int)
        assert all(isinstance(price, float) for price in (candle.open, candle.high))
        assert candle.low == 18000.0

    @pytest.mark.parametrize("missing_key", ["time", "open", "high", "low", "close"])
    def test_missing_canonical_key_is_rejected(self, missing_key: str) -> None:
        row = _row()
        del row[missing_key]
        with pytest.raises(SchemaViolationError):
            normalize_row(row, 0)

    def test_diagnostic_includes_row_index_and_field(self) -> None:
        with pytest.raises(SchemaViolationError) as excinfo:
            normalize_row(_row(high="1,6"), 7)
        message = str(excinfo.value)
        assert "Fila 7" in message
        assert "high" in message


class TestNormalizeSchema:
    """El lote completo se normaliza sin reordenar ni descartar filas."""

    def test_all_rows_are_normalized_in_order(self) -> None:
        rows = [_row(), _row(time=_SEC + 1, open="1.10")]
        result = normalize_schema(rows)
        assert [candle.time for candle in result] == [_SEC, _SEC + 1]
        assert result[1].open == 1.10

    def test_fractional_second_aborts_the_batch(self) -> None:
        rows = [_row(), _row(time=_SEC + 0.5)]
        with pytest.raises(SchemaViolationError):
            normalize_schema(rows)

    def test_empty_batch_yields_empty_result(self) -> None:
        assert normalize_schema([]) == []

    def test_rowless_input_is_rejected(self) -> None:
        with pytest.raises(SchemaViolationError):
            normalize_schema([42])  # type: ignore[list-item]
