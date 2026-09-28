"""Tests de la orquestación por bloques de la descarga (TASK-056, RF-104).

DoD: un bloque que falla se reintenta con backoff y no aborta el rango; el
estado del resumen queda en ``parcial``/``fallo``; el pacing de 20 s se aplica
solo entre bloques (N−1 esperas).
"""

from __future__ import annotations

from datetime import datetime

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest import DownloadRequest, plan_blocks
from fxtrad.ingest.tasks import RetryPolicy, run_download_range

_START = 1772409600  # 2026-03-02T00:00:00Z (lunes)
_LONG_END = _START + 60 * 86400  # ~60 días → varios bloques de 20 días


class _SleepSpy:
    """Espía de ``time.sleep`` que registra las esperas sin dormir."""

    def __init__(self) -> None:
        self.waits: list[float] = []

    def __call__(self, seconds: float) -> None:
        self.waits.append(seconds)


class _SelectiveFailRangeClient:
    """Cliente de rango que falla en los bloques cuyo ``start`` está marcado."""

    def __init__(self, failing_starts: set[int]) -> None:
        self.failing_starts = failing_starts
        self.calls = 0

    def download_range(self, symbol: str, start: datetime, end: datetime) -> list[Candle]:
        self.calls += 1
        if int(start.timestamp()) in self.failing_starts:
            raise ConnectionError("HTTP 503 simulado")
        return [Candle(time=int(start.timestamp()), open=1.0, high=1.0, low=1.0, close=1.0)]


class TestPartialFailures:
    """Un bloque fallido no aborta el rango; el estado queda parcial/fallo."""

    @staticmethod
    def _policy(spy: _SleepSpy) -> RetryPolicy:
        return RetryPolicy(max_attempts=3, backoff_seconds=0.0, sleep=spy)

    def test_one_failing_block_yields_partial(self) -> None:
        blocks = plan_blocks(_START, _LONG_END)
        client = _SelectiveFailRangeClient(failing_starts={blocks[1].start})
        spy = _SleepSpy()

        summary = run_download_range(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_LONG_END),
            task_id="t-partial",
            policy=self._policy(spy),
        )

        assert summary["estado"] == "parcial"
        assert summary["bloques"] == len(blocks)
        assert summary["bloques_fallidos"] == 1
        assert summary["fallos_detalle"] == [{"inicio": blocks[1].start, "fin": blocks[1].end}]
        assert summary["velas"] == len(blocks) - 1

    def test_all_blocks_failing_yields_fallo(self) -> None:
        blocks = plan_blocks(_START, _LONG_END)
        client = _SelectiveFailRangeClient(failing_starts={block.start for block in blocks})

        summary = run_download_range(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_LONG_END),
            task_id="t-fallo",
            policy=self._policy(_SleepSpy()),
        )

        assert summary["estado"] == "fallo"
        assert summary["bloques_fallidos"] == len(blocks)
        assert summary["velas"] == 0

    def test_failing_block_is_retried_before_marking_partial(self) -> None:
        blocks = plan_blocks(_START, _LONG_END)
        client = _SelectiveFailRangeClient(failing_starts={blocks[1].start})

        run_download_range(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_LONG_END),
            task_id="t-retry",
            policy=self._policy(_SleepSpy()),
        )

        # Un intento por bloque exitoso + 3 intentos del bloque que falla.
        assert client.calls == (len(blocks) - 1) + 3

    def test_all_successful_blocks_yield_exito(self) -> None:
        blocks = plan_blocks(_START, _LONG_END)
        client = _SelectiveFailRangeClient(failing_starts=set())

        summary = run_download_range(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_LONG_END),
            task_id="t-ok",
            policy=self._policy(_SleepSpy()),
        )

        assert summary["estado"] == "exito"
        assert summary["bloques_fallidos"] == 0
        assert summary["velas"] == len(blocks)

    def test_paces_between_blocks_only(self) -> None:
        blocks = plan_blocks(_START, _LONG_END)
        client = _SelectiveFailRangeClient(failing_starts=set())
        spy = _SleepSpy()

        run_download_range(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_LONG_END),
            policy=self._policy(spy),
        )

        # Pacing de 20 s entre bloques: N−1 esperas (los backoff son 0.0).
        assert spy.waits.count(20.0) == len(blocks) - 1
