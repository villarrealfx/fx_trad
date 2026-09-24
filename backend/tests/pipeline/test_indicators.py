"""Tests del cálculo de indicadores MA/RSI/ATR (TASK-031, RF-013).

Valida la implementación contra el fixture de referencia golden
(``fixtures/indicators_reference.json``, generado offline con la misma
convención Wilder documentada en ``pipeline/indicators.py`` y verificado a mano)
y contra propiedades de cada indicador: warm-up con ``None``, periodos límite,
casos degenerados (RSI 0/100, ATR plano) y validación RI-001.
Patrón AAA, nombres en inglés, sin mocking.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.pipeline.indicators import (
    ATR_PERIOD_DEFAULT,
    MA_PERIODS_DEFAULT,
    RSI_PERIOD_DEFAULT,
    IndicatorsResult,
    compute_indicators,
)

_FIXTURE = Path(__file__).parent / "fixtures" / "indicators_reference.json"
_BASE_TS = 1_772_409_600  # 2026-03-02 00:00:00 UTC (lunes)


def _load_fixture() -> dict:
    return json.loads(_FIXTURE.read_text(encoding="utf-8"))


def _candles_from_fixture(fixture: dict) -> list[Candle]:
    """Convierte el fixture JSON a velas Candle (tipos del contrato OHLC)."""
    return [
        Candle(
            time=int(row["time"]),
            open=row["open"],
            high=row["high"],
            low=row["low"],
            close=row["close"],
        )
        for row in fixture["candles"]
    ]


def _make_candles(closes: list[float], *, high_low: bool = False) -> list[Candle]:
    """Serie sintética con OHLC determinista (high/low opcionales para ATR)."""
    candles: list[Candle] = []
    for i, close in enumerate(closes):
        candles.append(
            Candle(
                time=_BASE_TS + i,
                open=close - 0.5,
                high=close + 2.0 if high_low else close,
                low=close - 2.0 if high_low else close,
                close=close,
            )
        )
    return candles


def _as_approx(expected: list[float | None]) -> list[float | None]:
    """Lista con valores flotantes convertidos a pytest.approx."""
    return [pytest.approx(value) if value is not None else None for value in expected]


class TestReferenceFixture:
    """La implementación reproduce el fixture golden de referencia."""

    def test_ma20_matches_reference(self) -> None:
        fixture = _load_fixture()
        result = compute_indicators(_candles_from_fixture(fixture), ma_periods=(20,))
        assert result.ma[20] == tuple(_as_approx(fixture["expected"]["ma20"]))

    def test_rsi14_matches_reference(self) -> None:
        fixture = _load_fixture()
        result = compute_indicators(_candles_from_fixture(fixture))
        assert result.rsi[14] == tuple(_as_approx(fixture["expected"]["rsi14"]))

    def test_atr14_matches_reference(self) -> None:
        fixture = _load_fixture()
        result = compute_indicators(_candles_from_fixture(fixture))
        assert result.atr[14] == tuple(_as_approx(fixture["expected"]["atr14"]))

    def test_times_align_with_candle_times(self) -> None:
        fixture = _load_fixture()
        result = compute_indicators(_candles_from_fixture(fixture))
        expected_times = tuple(int(r["time"]) for r in fixture["candles"])
        assert result.times == expected_times


class TestDefaults:
    """Los periodos por defecto siguen la convención J-004."""

    def test_defaults_follow_journey_convention(self) -> None:
        fixture = _load_fixture()
        result = compute_indicators(_candles_from_fixture(fixture))
        assert MA_PERIODS_DEFAULT == (20, 50, 200)
        assert RSI_PERIOD_DEFAULT == 14
        assert ATR_PERIOD_DEFAULT == 14
        assert set(result.ma) == set(MA_PERIODS_DEFAULT)
        assert list(result.rsi) == [RSI_PERIOD_DEFAULT]
        assert list(result.atr) == [ATR_PERIOD_DEFAULT]

    def test_same_length_per_period(self) -> None:
        fixture = _load_fixture()
        result = compute_indicators(_candles_from_fixture(fixture))
        n = len(fixture["candles"])
        for series in (*result.ma.values(), *result.rsi.values(), *result.atr.values()):
            assert len(series) == n


class TestMovingAverage:
    """Media móvil simple: ventana, warm-up y periodos límite."""

    def test_warmup_is_none_and_first_value_is_mean(self) -> None:
        result = compute_indicators(_make_candles([1.0, 2.0, 3.0, 4.0]), ma_periods=(3,))
        assert result.ma[3] == (None, None, 2.0, 3.0)

    def test_period_one_returns_close(self) -> None:
        result = compute_indicators(_make_candles([1.0, 2.0, 3.0]), ma_periods=(1,))
        assert result.ma[1] == (1.0, 2.0, 3.0)

    def test_full_window_reference_values(self) -> None:
        result = compute_indicators(
            _make_candles([1.0, 2.0, 3.0, 4.0, 5.0]), ma_periods=(2,), rsi_period=1, atr_period=1
        )
        assert result.ma[2] == (None, 1.5, 2.5, 3.5, 4.5)


class TestRsi:
    """RSI de Wilder: tendencia, planitud y límites 0/100."""

    def test_strong_uptrend_is_100(self) -> None:
        result = compute_indicators(_make_candles([1.0, 2.0, 3.0, 4.0]), rsi_period=2)
        assert result.rsi[2][2] == pytest.approx(100.0)

    def test_strong_downtrend_is_0(self) -> None:
        result = compute_indicators(_make_candles([4.0, 3.0, 2.0, 1.0]), rsi_period=2)
        assert result.rsi[2][2] == pytest.approx(0.0)

    def test_flat_series_returns_zero(self) -> None:
        result = compute_indicators(_make_candles([2.0] * 5), rsi_period=2)
        assert result.rsi[2][2] == pytest.approx(0.0)

    def test_warmup_is_none(self) -> None:
        result = compute_indicators(_make_candles([1.0, 2.0, 3.0, 4.0]), rsi_period=2)
        assert result.rsi[2][:2] == (None, None)


class TestAtr:
    """ATR de Wilder: volatilidad plana, nula y warm-up."""

    def test_flat_candles_yield_zero(self) -> None:
        candles = [
            Candle(time=_BASE_TS + i, open=2.0, high=2.0, low=2.0, close=2.0) for i in range(5)
        ]
        result = compute_indicators(candles, atr_period=2)
        assert result.atr[2][2] == pytest.approx(0.0)

    def test_warmup_is_none(self) -> None:
        result = compute_indicators(
            _make_candles([2.0, 3.0, 4.0, 5.0], high_low=True), atr_period=2
        )
        assert result.atr[2][:2] == (None, None)


class TestValidation:
    """Validación RI-001 y de periodos."""

    def test_empty_input_yields_empty_result(self) -> None:
        result = compute_indicators([])
        assert result == IndicatorsResult(times=(), ma={}, rsi={}, atr={})

    def test_unordered_series_raises(self) -> None:
        candles = _make_candles([1.0, 2.0, 3.0])
        with pytest.raises(ValueError, match="no ordenada"):
            compute_indicators([candles[1], candles[0], candles[2]])

    def test_duplicate_time_raises(self) -> None:
        candles = _make_candles([1.0, 2.0, 3.0])
        with pytest.raises(ValueError, match="duplicado"):
            compute_indicators([candles[0], candles[0], candles[2]])

    def test_invalid_ma_period_raises(self) -> None:
        with pytest.raises(ValueError, match="Periodo de MA"):
            compute_indicators(_make_candles([1.0, 2.0]), ma_periods=(0,))

    def test_invalid_rsi_period_raises(self) -> None:
        with pytest.raises(ValueError, match="Periodo de RSI"):
            compute_indicators(_make_candles([1.0, 2.0]), rsi_period=0)

    def test_invalid_atr_period_raises(self) -> None:
        with pytest.raises(ValueError, match="Periodo de ATR"):
            compute_indicators(_make_candles([1.0, 2.0]), atr_period=-1)
