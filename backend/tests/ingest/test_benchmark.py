"""Tests del benchmark de descarga (TASK-074, RNF-101).

Sin red: se inyecta un cliente stub y un reloj falso para verificar la medición
y el veredicto del objetivo (≤ 900 s/año).
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest.benchmark import DOWNLOAD_TARGET_SECONDS, benchmark_download
from fxtrad.ingest.retry import RetryPolicy

_DAY = 86_400
_START = 1_772_409_600  # 2026-03-02T00:00:00Z (lunes)
_THREE_DAYS_END = _START + 3 * _DAY - 1
_TWO_YEARS_END = _START + 2 * 365 * _DAY


class _FakeClock:
    """Reloj monótono falso que devuelve una secuencia de marcas."""

    def __init__(self, values: list[float]) -> None:
        self._values: Iterator[float] = iter(values)

    def __call__(self) -> float:
        return next(self._values)


class _StubClient:
    """Cliente de rango que devuelve una vela por bloque solicitado."""

    def __init__(self) -> None:
        self.calls = 0

    def download_range(self, symbol: str, start: datetime, end: datetime) -> list[Candle]:
        self.calls += 1
        return [Candle(time=int(start.timestamp()), open=1.0, high=1.0, low=1.0, close=1.0)]


class TestBenchmarkDownload:
    """La medición y el veredicto del objetivo son deterministas sin red."""

    def test_measures_elapsed_and_counts(self) -> None:
        client = _StubClient()

        result = benchmark_download(
            client,  # type: ignore[arg-type]
            "EURUSD",
            _START,
            _THREE_DAYS_END,
            clock=_FakeClock([100.0, 132.5]),
        )

        assert result.elapsed_seconds == 32.5
        assert result.velas == 1
        assert result.bloques == 1
        assert result.tandas == 1
        assert result.target_seconds == DOWNLOAD_TARGET_SECONDS
        assert result.within_target is True

    def test_exceeds_target_when_slower(self) -> None:
        result = benchmark_download(
            _StubClient(),  # type: ignore[arg-type]
            "EURUSD",
            _START,
            _THREE_DAYS_END,
            clock=_FakeClock([0.0, DOWNLOAD_TARGET_SECONDS + 1]),
        )

        assert result.within_target is False

    def test_target_seconds_is_configurable(self) -> None:
        result = benchmark_download(
            _StubClient(),  # type: ignore[arg-type]
            "EURUSD",
            _START,
            _THREE_DAYS_END,
            clock=_FakeClock([0.0, 10.0]),
            target_seconds=5.0,
        )

        assert result.target_seconds == 5.0
        assert result.within_target is False

    def test_two_years_reports_two_batches(self) -> None:
        result = benchmark_download(
            _StubClient(),  # type: ignore[arg-type]
            "EURUSD",
            _START,
            _TWO_YEARS_END,
            clock=_FakeClock([0.0, 1.0]),
            policy=RetryPolicy(backoff_seconds=0.0, sleep=lambda _s: None),
        )

        assert result.tandas == 2

    def test_borderline_equal_to_target_is_within(self) -> None:
        result = benchmark_download(
            _StubClient(),  # type: ignore[arg-type]
            "EURUSD",
            _START,
            _THREE_DAYS_END,
            clock=_FakeClock([0.0, DOWNLOAD_TARGET_SECONDS]),
        )

        assert result.within_target is True
