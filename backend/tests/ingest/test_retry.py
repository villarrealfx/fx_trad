"""Tests de la política de reintentos con backoff (TASK-005, R-001).

DoD: un fallo HTTP simulado se reintenta con backoff (20 s por defecto) y, si
se agotan los intentos, la hora queda marcada como fallida. La espera real se
sustituye por un espía inyectado en ``RetryPolicy.sleep``.
"""

from __future__ import annotations

import pytest
from structlog.testing import capture_logs

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest.retry import (
    DownloadError,
    RetryPolicy,
    download_status,
    retry_download_hour,
)

_HOUR = (2026, 2, 2, 0)  # 2026-03-02T00:00:00Z


def _candle(second: int = 0) -> Candle:
    return Candle(
        time=1_772_409_600 + second,
        open=1.0912,
        high=1.0913,
        low=1.0911,
        close=1.09125,
    )


class _FlakyClient:
    """Cliente que falla las primeras ``failures`` llamadas y luego responde."""

    def __init__(self, failures: int, candles: list[Candle] | None = None) -> None:
        self.failures = failures
        self.candles = candles if candles is not None else [_candle()]
        self.calls = 0

    def download_hour(
        self, symbol: str, year: int, month_index: int, day: int, hour: int
    ) -> list[Candle]:
        self.calls += 1
        if self.calls <= self.failures:
            raise ConnectionError("HTTP 503 simulado")
        return self.candles


class _SleepSpy:
    """Espía de ``time.sleep`` que registra las esperas sin dormir."""

    def __init__(self) -> None:
        self.waits: list[float] = []

    def __call__(self, seconds: float) -> None:
        self.waits.append(seconds)


def _policy(sleep: _SleepSpy, max_attempts: int = 3, backoff: float = 20.0) -> RetryPolicy:
    return RetryPolicy(max_attempts=max_attempts, backoff_seconds=backoff, sleep=sleep)


class TestRetryPolicyDefaults:
    """Los valores por defecto reflejan la mitigación R-001 (hasta 20 s)."""

    def test_default_backoff_is_20_seconds(self) -> None:
        assert RetryPolicy().backoff_seconds == 20.0

    def test_default_attempts_is_three(self) -> None:
        assert RetryPolicy().max_attempts == 3


class TestRetryDownloadHour:
    """Comportamiento de reintento de una hora con fallo simulado."""

    def test_transient_failure_is_retried_and_succeeds(self) -> None:
        client = _FlakyClient(failures=1)
        spy = _SleepSpy()
        candles = retry_download_hour(client, "EURUSD", *_HOUR, _policy(spy))
        assert candles == client.candles
        assert client.calls == 2
        assert spy.waits == [20.0]

    def test_no_retry_when_first_attempt_succeeds(self) -> None:
        client = _FlakyClient(failures=0)
        spy = _SleepSpy()
        retry_download_hour(client, "EURUSD", *_HOUR, _policy(spy))
        assert client.calls == 1
        assert spy.waits == []

    def test_backoff_uses_configured_seconds(self) -> None:
        client = _FlakyClient(failures=2)
        spy = _SleepSpy()
        retry_download_hour(client, "EURUSD", *_HOUR, _policy(spy, backoff=0.5))
        assert client.calls == 3
        assert spy.waits == [0.5, 0.5]

    def test_exhausted_retries_raise_download_error(self) -> None:
        client = _FlakyClient(failures=99)
        spy = _SleepSpy()
        with pytest.raises(DownloadError) as excinfo:
            retry_download_hour(client, "EURUSD", *_HOUR, _policy(spy, max_attempts=3))
        assert client.calls == 3
        assert spy.waits == [20.0, 20.0]
        assert excinfo.value.attempts == 3
        assert excinfo.value.symbol == "EURUSD"
        assert (excinfo.value.year, excinfo.value.month_index) == (2026, 2)

    def test_logs_reintento_then_fallo_descarga(self) -> None:
        client = _FlakyClient(failures=99)
        spy = _SleepSpy()
        with capture_logs() as logs, pytest.raises(DownloadError):
            retry_download_hour(client, "EURUSD", *_HOUR, _policy(spy, max_attempts=2))
        events = [entry["event"] for entry in logs]
        assert events == ["reintento", "fallo_descarga"]
        assert logs[0]["activo"] == "EURUSD"
        assert logs[0]["espera_s"] == 20.0


class TestDownloadStatus:
    """Clasificación del estado global del rango (DoD: parcial/fallo)."""

    @pytest.mark.parametrize(
        ("attempted", "failed", "expected"),
        [
            (3, 0, "exito"),
            (3, 1, "parcial"),
            (3, 2, "parcial"),
            (3, 3, "fallo"),
            (0, 0, "exito"),
        ],
    )
    def test_status_matrix(self, attempted: int, failed: int, expected: str) -> None:
        assert download_status(attempted, failed) == expected
