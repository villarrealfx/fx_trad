"""Tests del resampling OHLC a timeframes canónicos (TASK-014/TASK-059).

DoD TASK-059: la base canónica es 1 m — ``target="1m"`` es identidad y una vela
1 h coincide con la agregación de 60 velas 1 m. La ruta directa 1m→1d coincide
con 1m→1h→1d. Patrón AAA, nombres en inglés, sin mocking de reloj.
"""

from __future__ import annotations

import pytest

from fxtrad.contracts.ohlc import Candle, Timeframe
from fxtrad.pipeline.resample import (
    TIMEFRAME_SECONDS,
    InvalidSourceTimeframeError,
    InvalidTimeframeError,
    ResamplingResult,
    resample_ohlc,
)

# Marzo 2026: lunes 2 a las 00:00:00 UTC (time = 1772409600).
BASE_TS = 1_772_409_600


def _make_1m_series(start: int, count: int) -> list[Candle]:
    """Serie 1m alineada al epoch: una vela cada 60 s con OHLC determinista."""
    return [
        Candle(
            time=start + i * 60,
            open=float(i),
            high=float(i + 2),
            low=float(i),
            close=float(i + 1),
        )
        for i in range(count)
    ]


class TestResampleIdentity:
    """El timeframe base 1 m como target es passthrough (identidad)."""

    def test_target_1m_returns_same_candles(self) -> None:
        # Arrange.
        serie = _make_1m_series(BASE_TS, 100)

        # Act.
        result = resample_ohlc(serie, "1m")

        # Assert.
        assert result.candles == serie
        assert result.rows_input == 100
        assert result.rows_output == 100

    def test_target_1m_keeps_source_and_target(self) -> None:
        # Arrange.
        serie = _make_1m_series(BASE_TS, 10)

        # Act.
        result = resample_ohlc(serie, "1m")

        # Assert.
        assert result.source == "1m"
        assert result.target == "1m"


class TestResampleAggregation:
    """Agregación OHLC a timeframes de visualización (RF-009)."""

    def test_1h_matches_60_1m_candles(self) -> None:
        # Arrange: 60 velas 1m alineadas a la hora.
        serie = _make_1m_series(BASE_TS, 60)

        # Act.
        result = resample_ohlc(serie, "1h")

        # Assert.
        assert result.rows_input == 60
        assert result.rows_output == 1
        vela = result.candles[0]
        assert vela.time == BASE_TS
        assert vela.open == 0.0
        assert vela.high == 61.0
        assert vela.low == 0.0
        assert vela.close == 60.0

    @pytest.mark.parametrize(
        ("target", "expected_1m_candles"),
        [
            ("5m", 5),
            ("15m", 15),
            ("1h", 60),
            ("4h", 240),
            ("1d", 1440),
        ],
    )
    def test_timeframe_matches_n_1m_candles(
        self, target: Timeframe, expected_1m_candles: int
    ) -> None:
        # Arrange: tantas velas 1m como contiene un bucket del target.
        serie_1m = _make_1m_series(BASE_TS, expected_1m_candles)

        # Act: se omite ``source`` para ejercitar el origen canónico 1 m.
        result = resample_ohlc(serie_1m, target)

        # Assert: 1 vela target == N velas 1m, time alineado y OHLC correcto.
        assert result.rows_output == 1
        n = expected_1m_candles
        vela = result.candles[0]
        assert vela.time == BASE_TS
        assert vela.open == 0.0
        assert vela.high == float(n + 1)
        assert vela.low == 0.0
        assert vela.close == float(n)

    def test_one_hour_equals_60_one_minute_candles(self) -> None:
        # Arrange: 2 horas de velas 1m alineadas (120 velas).
        serie_1m = _make_1m_series(BASE_TS, 120)

        # Act.
        result = resample_ohlc(serie_1m, "1h")

        # Assert: 2 velas 1h, cada una == agregación de 60 velas 1m.
        assert result.rows_output == 2
        for idx, vela in enumerate(result.candles):
            assert vela.time == BASE_TS + idx * 3600
            assert vela.open == float(idx * 60)
            assert vela.high == float(idx * 60 + 61)
            assert vela.low == float(idx * 60)
            assert vela.close == float(idx * 60 + 60)

    def test_1d_direct_matches_1m_to_1h_then_1d(self) -> None:
        # Arrange: 1 día de velas 1m alineadas (1440 velas).
        serie_1m = _make_1m_series(BASE_TS, 1440)

        # Act: ruta directa y ruta en dos pasos.
        direct = resample_ohlc(serie_1m, "1d")
        intermedio = resample_ohlc(serie_1m, "1h")
        indirect = resample_ohlc(intermedio.candles, "1d", source="1h")

        # Assert: ambas rutas producen la misma vela 1d.
        assert direct.rows_output == 1
        assert indirect.rows_output == 1
        assert direct.candles == indirect.candles


class TestResampleValidation:
    """Validaciones de contrato: timeframes, orden y unicidad (RI-001)."""

    def test_rejects_non_canonical_target(self) -> None:
        # Arrange.
        serie = _make_1m_series(BASE_TS, 10)

        # Act / Assert.
        with pytest.raises(InvalidTimeframeError):
            resample_ohlc(serie, "3m")  # type: ignore[arg-type]

    def test_rejects_source_coarser_than_target(self) -> None:
        # Arrange.
        serie = _make_1m_series(BASE_TS, 10)

        # Act / Assert: no se puede "desagregar" de 1h a 1m.
        with pytest.raises(InvalidSourceTimeframeError):
            resample_ohlc(serie, "1m", source="1h")

    def test_rejects_1s_target_not_in_contract(self) -> None:
        # Arrange.
        serie = _make_1m_series(BASE_TS, 10)

        # Act / Assert: 1s ya no es un Timeframe del contrato (ADR-020).
        with pytest.raises(InvalidTimeframeError):
            resample_ohlc(serie, "1s")

    def test_rejects_duplicate_time(self) -> None:
        # Arrange: dos velas con el mismo time (viola RI-001).
        serie = _make_1m_series(BASE_TS, 2)
        serie.append(Candle(time=BASE_TS + 60, open=9, high=9, low=9, close=9))

        # Act / Assert.
        with pytest.raises(ValueError, match="duplicado"):
            resample_ohlc(serie, "1h")

    def test_rejects_unsorted_series(self) -> None:
        # Arrange: serie en orden descendente.
        serie = list(reversed(_make_1m_series(BASE_TS, 5)))

        # Act / Assert.
        with pytest.raises(ValueError, match="ordenada"):
            resample_ohlc(serie, "1h")

    def test_empty_series_returns_empty_result(self) -> None:
        # Arrange / Act.
        result = resample_ohlc([], "1h")

        # Assert.
        assert isinstance(result, ResamplingResult)
        assert result.candles == []
        assert result.rows_input == 0
        assert result.rows_output == 0


def test_timeframe_seconds_mapping_is_canonical() -> None:
    # Arrange / Act / Assert: cada timeframe canónico tiene su duración.
    assert TIMEFRAME_SECONDS == {
        "1m": 60,
        "5m": 300,
        "15m": 900,
        "1h": 3600,
        "4h": 14_400,
        "1d": 86_400,
    }
