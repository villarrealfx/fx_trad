"""Resampling OHLC a timeframes canónicos (TASK-014/TASK-059, RF-009).

Agrega la serie base ``1m`` a los timeframes de visualización
(5m/15m/1h/4h/1d) respetando el contrato ``Candle``/``Timeframe``
(``contracts/ohlc.py``) y la política PA-3 de ``time`` único (RI-001).
``target`` igual al origen es identidad (passthrough): devuelve la serie sin
cambios, pues la base 1m es el origen de toda agregación (ADR-012).

Los buckets se alinean al epoch UTC (``time // tf_seconds``); con la base 1m
alineada, una vela 1h contiene exactamente 60 velas 1m y la agregación 1m→1d
directa coincide con 1m→1h→1d (DoD TASK-059). ``1s`` ya no pertenece al contrato
``Timeframe`` (ADR-020) y por tanto es un target inválido.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

import structlog

from fxtrad.contracts.ohlc import Candle, Timeframe

logger = structlog.get_logger()

#: Segundos por timeframe canónico (RF-009, contrato ``Timeframe``).
TIMEFRAME_SECONDS: dict[Timeframe, int] = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14_400,
    "1d": 86_400,
}


class InvalidTimeframeError(ValueError):
    """El timeframe no pertenece al conjunto canónico (RF-009)."""


class InvalidSourceTimeframeError(ValueError):
    """El timeframe origen no puede resamplarse al target (orden inválido)."""


@dataclass(frozen=True, slots=True)
class ResamplingResult:
    """Velas agregadas y métricas del resampling.

    Attributes:
        candles: Velas OHLC resultantes, ordenadas por ``time``.
        source: Timeframe de entrada.
        target: Timeframe de salida.
        rows_input: Número de velas de entrada.
        rows_output: Número de velas de salida.
    """

    candles: list[Candle]
    source: Timeframe
    target: Timeframe
    rows_input: int
    rows_output: int


def _validate_timeframe(tf: Timeframe) -> int:
    """Segundos del timeframe o ``InvalidTimeframeError`` para no canónicos."""
    if tf not in TIMEFRAME_SECONDS:
        raise InvalidTimeframeError(
            f"Timeframe no canónico: {tf!r}. Válidos: {', '.join(TIMEFRAME_SECONDS)}"
        )
    return TIMEFRAME_SECONDS[tf]


def resample_ohlc(
    candles: Iterable[Candle],
    target: Timeframe,
    *,
    source: Timeframe = "1m",
) -> ResamplingResult:
    """Agrega velas OHLC al ``target`` desde ``source``.

    Si ``target == source`` devuelve la serie sin cambios (identidad; usado para
    la base 1m como timeframe de visualización). En otro caso agrupa por bucket
    alineado al epoch (``time // tf_seconds``) y computa OHLC con el primer open,
    alta máxima, baja mínima y último close del grupo.

    Args:
        candles: Serie de entrada ordenada por ``time``, sin duplicados (RI-001).
        target: Timeframe de salida (1m/5m/15m/1h/4h/1d).
        source: Timeframe de entrada; por defecto la base 1m (ADR-012).

    Raises:
        InvalidTimeframeError: Si ``source`` o ``target`` no son canónicos.
        InvalidSourceTimeframeError: Si ``source`` es más gruesa que ``target``
            (p. ej. pedir ``1s`` desde la base 1m).
        ValueError: Si la serie no está ordenada o tiene ``time`` duplicado.

    Returns:
        Resultado con las velas agregadas y los conteos del proceso.
    """
    source_secs = _validate_timeframe(source)
    target_secs = _validate_timeframe(target)
    if source_secs > target_secs:
        raise InvalidSourceTimeframeError(
            f"No se puede resamplear de {source} a {target}: el origen es más "
            "grueso que el destino."
        )

    rows = list(candles)
    if not rows:
        logger.info(
            "resampling_aplicado",
            source=source,
            target=target,
            rows_input=0,
            rows_output=0,
        )
        return ResamplingResult([], source, target, 0, 0)

    prev_time: int | None = None
    for candle in rows:
        if prev_time is not None and candle.time <= prev_time:
            if candle.time < prev_time:
                raise ValueError(
                    f"Serie no ordenada: {candle.time} precede a {prev_time} (RI-001)."
                )
            raise ValueError(f"time duplicado {candle.time} en la entrada (RI-001).")
        prev_time = candle.time

    if source_secs == target_secs:
        logger.info(
            "resampling_aplicado",
            source=source,
            target=target,
            rows_input=len(rows),
            rows_output=len(rows),
        )
        return ResamplingResult(list(rows), source, target, len(rows), len(rows))

    buckets: dict[int, list[Candle]] = {}
    for candle in rows:
        buckets.setdefault(candle.time // target_secs, []).append(candle)

    output: list[Candle] = []
    for bucket in sorted(buckets):
        group = buckets[bucket]
        output.append(
            Candle(
                time=bucket * target_secs,
                open=group[0].open,
                high=max(c.high for c in group),
                low=min(c.low for c in group),
                close=group[-1].close,
            )
        )

    logger.info(
        "resampling_aplicado",
        source=source,
        target=target,
        rows_input=len(rows),
        rows_output=len(output),
    )
    return ResamplingResult(output, source, target, len(rows), len(output))


__all__ = [
    "InvalidSourceTimeframeError",
    "InvalidTimeframeError",
    "ResamplingResult",
    "TIMEFRAME_SECONDS",
    "resample_ohlc",
]
