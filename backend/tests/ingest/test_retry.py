"""Tests de la política de reintentos con backoff por bloque (TASK-055, R-001).

DoD: un fallo HTTP simulado en un bloque se reintenta con backoff (20 s por
defecto) y, si se agotan los intentos, el bloque queda marcado como fallido sin
abortar el rango. La espera real se sustituye por un espía en ``RetryPolicy.sleep``.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from structlog.testing import capture_logs

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest import DownloadBlock
from fxtrad.ingest.retry import (
    BlockDownloadError,
    RetryPolicy,
    collect_blocks_candles,
    download_status,
    retry_download_block,
)


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


_BLOCK_BASE = 1_772_409_600  # 2026-03-02T00:00:00Z


def _block(index: int) -> DownloadBlock:
    """Bloque sintético de 1 minuto en el offset ``index``."""
    start = _BLOCK_BASE + index * 60
    return DownloadBlock(start=start, end=start + 59, planned_candles=1)


class _BlockRangeClient:
    """Cliente de rango que falla en los bloques cuyo ``start`` está marcado."""

    def __init__(self, failing_starts: set[int] | None = None) -> None:
        self.failing_starts = failing_starts or set()
        self.seen: list[tuple[datetime, datetime]] = []
        self.calls = 0

    def download_range(self, symbol: str, start: datetime, end: datetime) -> list[Candle]:
        self.calls += 1
        self.seen.append((start, end))
        if int(start.timestamp()) in self.failing_starts:
            raise ConnectionError("HTTP 503 simulado")
        return [Candle(time=int(start.timestamp()), open=1.0, high=1.0, low=1.0, close=1.0)]


class _AlwaysFailingRangeClient:
    """Cliente de rango que siempre falla (para agotar reintentos)."""

    def __init__(self) -> None:
        self.calls = 0

    def download_range(self, symbol: str, start: datetime, end: datetime) -> list[Candle]:
        self.calls += 1
        raise ConnectionError("HTTP 503 simulado")


class _FlakyRangeClient:
    """Cliente de rango que falla las primeras ``failures`` llamadas."""

    def __init__(self, failures: int) -> None:
        self.failures = failures
        self.calls = 0

    def download_range(self, symbol: str, start: datetime, end: datetime) -> list[Candle]:
        self.calls += 1
        if self.calls <= self.failures:
            raise ConnectionError("HTTP 503 simulado")
        return [Candle(time=int(start.timestamp()), open=1.0, high=1.0, low=1.0, close=1.0)]


class TestRetryDownloadBlock:
    """Reintento y backoff aplicados a un bloque (TASK-055)."""

    def test_transient_failure_is_retried_and_succeeds(self) -> None:
        client = _FlakyRangeClient(failures=1)
        spy = _SleepSpy()

        candles = retry_download_block(client, "EURUSD", _block(0), _policy(spy))

        assert len(candles) == 1
        assert client.calls == 2
        assert spy.waits == [20.0]

    def test_no_retry_when_first_attempt_succeeds(self) -> None:
        client = _BlockRangeClient()
        spy = _SleepSpy()

        retry_download_block(client, "EURUSD", _block(0), _policy(spy))

        assert client.calls == 1
        assert spy.waits == []

    def test_passes_block_window_as_utc_datetimes(self) -> None:
        client = _BlockRangeClient()
        block = _block(1)

        retry_download_block(client, "EURUSD", block, _policy(_SleepSpy()))

        assert client.seen == [
            (
                datetime.fromtimestamp(block.start, tz=UTC),
                datetime.fromtimestamp(block.end, tz=UTC),
            )
        ]

    def test_exhausted_retries_raise_block_error(self) -> None:
        client = _AlwaysFailingRangeClient()
        spy = _SleepSpy()
        block = _block(2)

        with pytest.raises(BlockDownloadError) as excinfo:
            retry_download_block(client, "EURUSD", block, _policy(spy, max_attempts=3))

        assert client.calls == 3
        assert spy.waits == [20.0, 20.0]
        assert excinfo.value.attempts == 3
        assert excinfo.value.symbol == "EURUSD"
        assert excinfo.value.block == block

    def test_logs_reintento_then_fallo_descarga_bloque(self) -> None:
        client = _AlwaysFailingRangeClient()
        spy = _SleepSpy()

        with capture_logs() as logs, pytest.raises(BlockDownloadError):
            retry_download_block(client, "EURUSD", _block(0), _policy(spy, max_attempts=2))

        events = [entry["event"] for entry in logs]
        assert events == ["reintento_bloque", "fallo_descarga_bloque"]
        assert logs[0]["activo"] == "EURUSD"
        assert logs[0]["espera_s"] == 20.0


class TestCollectBlocksCandles:
    """Un bloque fallido no aborta el rango y el estado queda correcto."""

    def test_failing_block_does_not_abort_range(self) -> None:
        blocks = [_block(0), _block(1), _block(2)]
        client = _BlockRangeClient(failing_starts={_block(1).start})

        candles, failures = collect_blocks_candles(client, "EURUSD", blocks, _policy(_SleepSpy()))

        assert [candle.time for candle in candles] == [_block(0).start, _block(2).start]
        assert failures == [_block(1)]
        assert download_status(len(blocks), len(failures)) == "parcial"

    def test_all_blocks_succeed_status_exito(self) -> None:
        blocks = [_block(0), _block(1)]
        client = _BlockRangeClient()

        candles, failures = collect_blocks_candles(client, "EURUSD", blocks, _policy(_SleepSpy()))

        assert len(candles) == 2
        assert failures == []
        assert download_status(len(blocks), len(failures)) == "exito"

    def test_all_blocks_fail_status_fallo(self) -> None:
        blocks = [_block(0), _block(1)]
        client = _BlockRangeClient(failing_starts={_block(0).start, _block(1).start})

        candles, failures = collect_blocks_candles(client, "EURUSD", blocks, _policy(_SleepSpy()))

        assert candles == []
        assert failures == blocks
        assert download_status(len(blocks), len(failures)) == "fallo"
