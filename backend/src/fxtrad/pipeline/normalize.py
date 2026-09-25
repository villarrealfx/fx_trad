"""Normalización UTC y validación de esquema de velas crudas (TASK-011, RNF-004).

Garantiza que toda fila que entra al pipeline cumple el esquema SerieOHLC de
ADR-004 antes de persistir: ``time`` como BIGINT (segundos UTC, entero) y los
precios OHLC como ``float``. La política de valores (NaN/±inf, negativos,
huecos) NO es responsabilidad de este módulo: la aplica la limpieza
(TASK-010, PA-3) y el forward-fill.

Semántica estricta: una fila que no puede normalizarse aborta el proceso con
``SchemaViolationError`` en lugar de descartarse en silencio, para que el ETL
detenga la escritura de datos presuntamente corruptos. La orquestación
(TASK-014) decide dónde ubicar este paso en la cadena.
"""

from __future__ import annotations

import functools
import math
from collections.abc import Iterable, Mapping
from datetime import UTC, datetime
from typing import Any

import structlog

from fxtrad.pipeline.clean import RawCandle

logger = structlog.get_logger()

_OHLC_KEYS = ("open", "high", "low", "close")


class SchemaViolationError(ValueError):
    """Una fila no cumple el esquema SerieOHLC (ADR-004), en el índice indicado."""


def normalize_time(value: object) -> int:
    """Normaliza el ``time`` de una vela a segundos UTC enteros (RNF-004).

    Admite, sin reescrituras: ``int`` ya en epoch; ``datetime`` con o sin zona
    horaria (naive se asume UTC); ``float`` con valor entero; ``str`` con un
    entero. Una fracción de segundo se rechaza: la base es de 1 s (RF-002) y
    truncarla inventaría datos.

    Args:
        value: Representación de ``time`` a normalizar.

    Returns:
        Epoch en segundos UTC (``int``).

    Raises:
        SchemaViolationError: si ``value`` no es convertible a un segundo entero.
    """
    if isinstance(value, bool):
        raise _violation("time", value, "se espera un segundo entero UTC")
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            raise _violation("time", value, "se espera un segundo entero UTC")
        seconds = int(value)
        if seconds != value:
            raise _violation("time", value, "fracción de segundo en la base 1s (RF-002)")
        return seconds
    if isinstance(value, str):
        try:
            return int(value)
        except ValueError:
            raise _violation("time", value, "solo se admite un entero en segundos UTC") from None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return int(value.astimezone(UTC).timestamp())
    raise _violation("time", value, "se espera un segundo entero UTC o datetime")


def normalize_price(value: object, *, field: str = "ohlc") -> float:
    """Normaliza un precio OHLC a ``float`` (esquema DOUBLE, ADR-004).

    Solo valida el tipo: int, float y ``str`` numérico son admisibles. La
    validez del valor (finito, no negativo, orden OHLC) es responsabilidad de
    la limpieza (TASK-010, PA-3).

    Args:
        value: Precio a normalizar.
        field: Nombre de la clave canónica (''open'', ''high'', ...) para
            diagnosticar el error con contexto.

    Returns:
        Precio como ``float``.

    Raises:
        SchemaViolationError: si ``value`` no es convertible a número.
    """
    violation = functools.partial(_violation, field)
    if isinstance(value, bool):
        raise violation(value, "se espera un precio numérico")
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            raise violation(value, "se espera un precio numérico") from None
    raise violation(value, "se espera un precio numérico")


def normalize_row(row: Mapping[str, Any], index: int) -> RawCandle:
    """Normaliza una fila cruda al esquema SerieOHLC (TASK-011).

    Args:
        row: Registro con las claves canónicas ``time/open/high/low/close``.
        index: Posición de la fila en la entrada, para diagnosticar el error.

    Returns:
        Vela cruda con ``time`` entero UTC y precios ``float``.

    Raises:
        SchemaViolationError: si falta una clave canónica o un valor no cumple
            el tipo esperado (ADR-004).
    """
    if not isinstance(row, Mapping):
        raise SchemaViolationError(
            f"Fila {index}: se espera un mapeo con claves time/open/high/low/close"
        )
    for key in ("time", *_OHLC_KEYS):
        if key not in row:
            raise _violation(key, None, "clave canónica ausente", index=index)
    try:
        seconds = normalize_time(row["time"])
        prices = tuple(normalize_price(row[key], field=key) for key in _OHLC_KEYS)
    except SchemaViolationError as error:
        raise SchemaViolationError(f"Fila {index}: {error}") from None
    return RawCandle(time=seconds, open=prices[0], high=prices[1], low=prices[2], close=prices[3])


def normalize_schema(rows: Iterable[Mapping[str, Any]]) -> list[RawCandle]:
    """Normaliza todas las filas al esquema SerieOHLC (TASK-011, RNF-004).

    Args:
        rows: Filas crudas con las claves canónicas ``time/open/high/low/close``.

    Returns:
        Velas crudas normalizadas, en el orden de entrada.

    Raises:
        SchemaViolationError: si alguna fila no cumple el esquema ADR-004.
    """
    normalized = [normalize_row(row, index) for index, row in enumerate(rows)]
    logger.info("esquema_normalizado", filas=len(normalized), modulo="pipeline")
    return normalized


def _violation(
    field: str, value: object, reason: str, index: int | None = None
) -> SchemaViolationError:
    """Construye un ``SchemaViolationError`` con contexto de fila y campo."""
    prefix = f"Fila {index}: " if index is not None else ""
    return SchemaViolationError(f"{prefix}campo '{field}' ({value!r}): {reason}")


__all__ = [
    "SchemaViolationError",
    "normalize_price",
    "normalize_row",
    "normalize_schema",
    "normalize_time",
]
