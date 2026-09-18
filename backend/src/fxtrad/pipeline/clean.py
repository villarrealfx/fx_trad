"""Limpieza e imputación de velas crudas (RF-003, HU-004).

Implementa la política de imputación PA-3 (plan.md, resuelto 2026-09-18):
"Eliminar + FF acotado" con ``max_gap_seconds`` por defecto de 60 segundos.

Reglas:
1. Las filas con valores OHLC no finitos (NaN/±inf) se eliminan: nunca se
   inventa un precio a partir de datos inválidos.
2. Los huecos intra-sesión de hasta ``max_gap_seconds`` se rellenan con
   forward-fill: una vela plana al último close (open=high=low=close) en cada
   segundo faltante, para que los indicadores (MA/RSI/ATR, TASK-031) dispongan
   de serie continua.
3. Los huecos mayores que el umbral quedan como hueco real; la exclusión de
   periodos sin mercado es responsabilidad del calendario (TASK-012/TASK-013).
4. Se garantiza ``time`` único y creciente (RI-001).
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Mapping
from dataclasses import dataclass

import structlog
from pydantic import ValidationError

from fxtrad.contracts.ohlc import Candle

logger = structlog.get_logger()

G_MAX_DEFAULT_SECONDS = 60
"""Umbral por defecto (s) para el forward-fill de huecos intra-sesión (PA-3)."""


@dataclass(frozen=True, slots=True)
class RawCandle:
    """Vela cruda sin validar: OHLC puede contener NaN o ±inf.

    Attributes:
        time: Segundo UTC de la vela.
        open: Precio de apertura (posible ``nan``/``inf``).
        high: Precio máximo (posible ``nan``/``inf``).
        low: Precio mínimo (posible ``nan``/``inf``).
        close: Precio de cierre (posible ``nan``/``inf``).
    """

    time: int
    open: float
    high: float
    low: float
    close: float

    @classmethod
    def from_row(cls, row: Mapping[str, float | int]) -> RawCandle:
        """Construye una vela cruda desde un registro con claves canónicas."""
        return cls(
            time=int(row["time"]),
            open=float(row["open"]),
            high=float(row["high"]),
            low=float(row["low"]),
            close=float(row["close"]),
        )


@dataclass(frozen=True, slots=True)
class CleaningResult:
    """Resultado de la limpieza con los contadores de la política PA-3.

    Attributes:
        candles: Velas válidas ordenadas por ``time`` y sin duplicados.
        rows_dropped: Filas eliminadas por OHLC no finito o timestamp duplicado.
        rows_filled: Velas planas insertadas por forward-fill (≤ umbral).
    """

    candles: list[Candle]
    rows_dropped: int
    rows_filled: int


def _ohlc_is_finite(candle: RawCandle) -> bool:
    """Devuelve True si los cuatro precios OHLC son finitos."""
    prices = (candle.open, candle.high, candle.low, candle.close)
    return all(math.isfinite(value) for value in prices)


def _flat_candle(time: int, close: float) -> Candle:
    """Construye la vela plana de imputación al precio de cierre previo."""
    return Candle(time=time, open=close, high=close, low=close, close=close)


def clean_candles(
    rows: Iterable[RawCandle],
    *,
    max_gap_seconds: int = G_MAX_DEFAULT_SECONDS,
) -> CleaningResult:
    """Limpia velas crudas aplicando la política PA-3 (eliminación + FF acotado).

    Args:
        rows: Velas crudas, posiblemente desordenadas y con NaN/±inf.
        max_gap_seconds: Hueco intra-sesión máximo (s) a rellenar por ffill.
            Debe ser ≥ 0; con 0 no se rellena ningún hueco.

    Returns:
        Resultado con las velas válidas ordenadas por ``time`` (únicas) y los
        contadores de filas eliminadas y velas imputadas.
    """
    sorted_rows = sorted(rows, key=lambda row: row.time)
    valid: list[RawCandle] = []
    seen_times: set[int] = set()
    dropped = 0
    for row in sorted_rows:
        if not _ohlc_is_finite(row):
            dropped += 1
            continue
        if row.time in seen_times:
            dropped += 1
            continue
        seen_times.add(row.time)
        valid.append(row)

    candles: list[Candle] = []
    filled = 0
    for row in valid:
        try:
            candle = Candle(
                time=row.time,
                open=row.open,
                high=row.high,
                low=row.low,
                close=row.close,
            )
        except ValidationError:
            dropped += 1
            continue
        if candles:
            previous_close = candles[-1].close
            gap = candle.time - candles[-1].time
            if 0 < gap <= max_gap_seconds:
                for missing_second in range(candles[-1].time + 1, candle.time):
                    candles.append(_flat_candle(missing_second, previous_close))
                    filled += 1
        candles.append(candle)

    if dropped:
        logger.warning("filas_nan_eliminadas", filas_eliminadas=dropped)
    if filled:
        logger.warning("imputacion_aplicada", filas_afectadas=filled)
    return CleaningResult(candles=candles, rows_dropped=dropped, rows_filled=filled)


__all__ = ["CleaningResult", "G_MAX_DEFAULT_SECONDS", "RawCandle", "clean_candles"]
