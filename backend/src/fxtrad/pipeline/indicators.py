"""Cálculo de indicadores técnicos MA, RSI y ATR (TASK-031, RF-013, HU-016).

Los indicadores se calculan en el pipeline para que el frontend solo renderice
sin recomputar (HU-016). Sobre una serie ``Candle`` ordenada y con ``time``
único (RI-001) se computan:

- **MA** (media móvil simple): media aritmética de las últimas ``period``
  closes; ``None`` durante el warm-up (índices ``0..period-2``).
- **RSI** (Wilder): primer valor en el índice ``period`` con la media de las
  variaciones de la ventana ``[1..period]`` (media aritmética de los cambios
  positivos y de los negativos); a partir de ahí suavizado
  ``(prev*(period-1)+curr)/period``. ``avg_loss == 0`` → 100, ``avg_gain == 0``
  → 0, ambos nulos → 0.
- **ATR** (Wilder): primer valor en el índice ``period`` con la media de los
  true-ranges ``[0..period]``; suavizado idéntico al RSI. True range:
  ``max(high-low, |high-prev_close|, |low-prev_close|)``.

Defaults por convención (J-004, components.md CMP-010): MA 20/50/200, RSI 14,
ATR 14. Las salidas son tuplas alineadas por índice con el tiempo de la vela
correspondiente (``times``); los valores ``None`` marcan el warm-up del
indicador. La convención Wilder queda validada contra un fixture de referencia
golden (``tests/pipeline/fixtures/indicators_reference.json``).
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

import structlog

from fxtrad.contracts.ohlc import Candle

logger = structlog.get_logger()

#: Periodos por defecto de las medias móviles (convención J-004).
MA_PERIODS_DEFAULT = (20, 50, 200)
#: Periodo por defecto del RSI (convención J-004).
RSI_PERIOD_DEFAULT = 14
#: Periodo por defecto del ATR (convención J-004).
ATR_PERIOD_DEFAULT = 14


@dataclass(frozen=True, slots=True)
class IndicatorsResult:
    """Indicadores alineados por tiempo sobre una serie de velas.

    Cada serie es una tupla con un valor por vela (o ``None`` en el warm-up),
    ordenada igual que las velas de entrada.

    Attributes:
        times: Timestamps (s UTC) de cada vela, en el mismo orden (RI-001).
        ma: Medias móviles simples por periodo (clave = periodo).
        rsi: RSI Wilder por periodo (clave = periodo).
        atr: ATR Wilder por periodo (clave = periodo).
    """

    times: tuple[int, ...]
    ma: dict[int, tuple[float | None, ...]]
    rsi: dict[int, tuple[float | None, ...]]
    atr: dict[int, tuple[float | None, ...]]


def _validate_period(period: int, name: str) -> None:
    """Valida que un periodo de indicador sea ≥ 1."""
    if period < 1:
        raise ValueError(f"Periodo de {name} inválido: {period}. Debe ser ≥ 1.")


def _validate_series(candles: Sequence[Candle]) -> None:
    """Valida que la serie esté ordenada y sin ``time`` duplicado (RI-001)."""
    previous: int | None = None
    for candle in candles:
        if previous is not None and candle.time <= previous:
            if candle.time < previous:
                raise ValueError(f"Serie no ordenada: {candle.time} precede a {previous} (RI-001).")
            raise ValueError(f"time duplicado {candle.time} en la entrada (RI-001).")
        previous = candle.time


def _sma(values: Sequence[float], period: int) -> tuple[float | None, ...]:
    """Media móvil simple de ventana ``period`` sobre ``values``."""
    out: list[float | None] = []
    accumulation = 0.0
    for i, value in enumerate(values):
        accumulation += value
        if i >= period:
            accumulation -= values[i - period]
        if i >= period - 1:
            out.append(accumulation / period)
        else:
            out.append(None)
    return tuple(out)


def _rsi_value(avg_gain: float, avg_loss: float) -> float:
    """Conversión de promedios de ganancia/pérdida a un valor RSI."""
    if avg_loss == 0.0 and avg_gain == 0.0:
        return 0.0
    if avg_loss == 0.0:
        return 100.0
    if avg_gain == 0.0:
        return 0.0
    rs = avg_gain / avg_loss
    return 100.0 - 100.0 / (1.0 + rs)


def _rsi_wilder(closes: Sequence[float], period: int) -> tuple[float | None, ...]:
    """RSI de Wilder: primero en el índice ``period``, luego suavizado 1/period."""
    count = len(closes)
    out: list[float | None] = [None] * count
    if count < period + 1:
        return tuple(out)

    diffs = [closes[j] - closes[j - 1] for j in range(1, period + 1)]
    gains = [d for d in diffs if d > 0]
    losses = [-d for d in diffs if d < 0]
    avg_gain = sum(gains) / len(gains) if gains else 0.0
    avg_loss = sum(losses) / len(losses) if losses else 0.0
    out[period] = _rsi_value(avg_gain, avg_loss)

    for i in range(period + 1, count):
        change = closes[i] - closes[i - 1]
        avg_gain = (avg_gain * (period - 1) + max(change, 0.0)) / period
        avg_loss = (avg_loss * (period - 1) + max(-change, 0.0)) / period
        out[i] = _rsi_value(avg_gain, avg_loss)
    return tuple(out)


def _true_ranges(candles: Sequence[Candle]) -> list[float]:
    """True ranges consecutivos: tr[0] es high-low de la primera vela."""
    trs: list[float] = []
    for i, candle in enumerate(candles):
        if i == 0:
            trs.append(candle.high - candle.low)
        else:
            previous_close = candles[i - 1].close
            trs.append(
                max(
                    candle.high - candle.low,
                    abs(candle.high - previous_close),
                    abs(candle.low - previous_close),
                )
            )
    return trs


def _atr_wilder(candles: Sequence[Candle], period: int) -> tuple[float | None, ...]:
    """ATR de Wilder: primero en el índice ``period``, luego suavizado 1/period."""
    trs = _true_ranges(candles)
    count = len(candles)
    out: list[float | None] = [None] * count
    if count < period + 1:
        return tuple(out)

    previous = sum(trs[: period + 1]) / (period + 1)
    out[period] = previous
    for i in range(period + 1, count):
        previous = (previous * (period - 1) + trs[i]) / period
        out[i] = previous
    return tuple(out)


def compute_indicators(
    candles: Iterable[Candle],
    *,
    ma_periods: Sequence[int] = MA_PERIODS_DEFAULT,
    rsi_period: int = RSI_PERIOD_DEFAULT,
    atr_period: int = ATR_PERIOD_DEFAULT,
) -> IndicatorsResult:
    """Calcula MA/RSI/ATR sobre la serie con los periodos indicados.

    Args:
        candles: Serie de velas, ordenadas por ``time`` y sin duplicados (RI-001).
        ma_periods: Ventanas de las medias móviles a calcular.
        rsi_period: Ventana del RSI de Wilder.
        atr_period: Ventana del ATR de Wilder.

    Raises:
        ValueError: Si algún periodo es < 1 o la serie no es válida (RI-001).

    Returns:
        Indicadores alineados por índice con ``times``; ``None`` en el
        warm-up de cada indicador.
    """
    for period in ma_periods:
        _validate_period(period, "MA")
    _validate_period(rsi_period, "RSI")
    _validate_period(atr_period, "ATR")

    rows = list(candles)
    _validate_series(rows)

    times = tuple(candle.time for candle in rows)
    if not rows:
        logger.info(
            "indicadores_calculados",
            ma_periods=list(ma_periods),
            rsi_period=rsi_period,
            atr_period=atr_period,
            rows_input=0,
            rows_output=0,
        )
        return IndicatorsResult(times=(), ma={}, rsi={}, atr={})

    closes = [candle.close for candle in rows]
    ma = {period: _sma(closes, period) for period in ma_periods}
    rsi = {rsi_period: _rsi_wilder(closes, rsi_period)}
    atr = {atr_period: _atr_wilder(rows, atr_period)}
    logger.info(
        "indicadores_calculados",
        ma_periods=list(ma_periods),
        rsi_period=rsi_period,
        atr_period=atr_period,
        rows_input=len(rows),
        rows_output=len(times),
    )
    return IndicatorsResult(times=times, ma=ma, rsi=rsi, atr=atr)


__all__ = [
    "ATR_PERIOD_DEFAULT",
    "IndicatorsResult",
    "MA_PERIODS_DEFAULT",
    "RSI_PERIOD_DEFAULT",
    "compute_indicators",
]
