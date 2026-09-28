"""Tests del pacing entre bloques de descarga (TASK-054, RF-102/RNF-101).

DoD: con un ``sleep`` falso se verifica que para N bloques se realizan
exactamente N−1 esperas, y que las velas se concatenan en orden.
"""

from __future__ import annotations

import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest import DEFAULT_PAUSE_SECONDS, DownloadBlock, download_blocks


def _block(index: int) -> DownloadBlock:
    """Bloque sintético de 1 minuto en el offset indicado."""
    start = index * 60
    return DownloadBlock(start=start, end=start + 59, planned_candles=1)


def _candle(block: DownloadBlock) -> Candle:
    """Vela sintética cuyo ``time`` es el inicio del bloque."""
    return Candle(time=block.start, open=1.0, high=1.0, low=1.0, close=1.0)


class RecordingSleep:
    """Espía de ``sleep``: registra los segundos sin dormir de verdad."""

    def __init__(self) -> None:
        self.calls: list[float] = []

    def __call__(self, seconds: float) -> None:
        self.calls.append(seconds)


class TestDownloadBlocks:
    """El pacing ocurre exactamente entre bloques consecutivos."""

    def test_sleeps_n_minus_one_times_for_n_blocks(self) -> None:
        blocks = [_block(0), _block(1), _block(2)]
        sleep = RecordingSleep()

        download_blocks(blocks, lambda block: [_candle(block)], sleep=sleep)

        assert sleep.calls == [DEFAULT_PAUSE_SECONDS, DEFAULT_PAUSE_SECONDS]

    def test_two_blocks_sleep_once(self) -> None:
        sleep = RecordingSleep()

        download_blocks([_block(0), _block(1)], lambda block: [_candle(block)], sleep=sleep)

        assert sleep.calls == [DEFAULT_PAUSE_SECONDS]

    def test_single_block_does_not_sleep(self) -> None:
        sleep = RecordingSleep()

        download_blocks([_block(0)], lambda block: [_candle(block)], sleep=sleep)

        assert sleep.calls == []

    def test_empty_blocks_returns_empty_without_sleep(self) -> None:
        sleep = RecordingSleep()

        result = download_blocks([], lambda block: [_candle(block)], sleep=sleep)

        assert result == []
        assert sleep.calls == []

    def test_downloads_in_order_and_concatenates_candles(self) -> None:
        blocks = [_block(0), _block(1), _block(2)]
        seen: list[int] = []

        def download(block: DownloadBlock) -> list[Candle]:
            seen.append(block.start)
            return [_candle(block)]

        candles = download_blocks(blocks, download, sleep=RecordingSleep())

        assert seen == [0, 60, 120]
        assert [candle.time for candle in candles] == [0, 60, 120]

    def test_custom_pause_seconds_is_used(self) -> None:
        sleep = RecordingSleep()

        download_blocks(
            [_block(0), _block(1), _block(2)],
            lambda block: [_candle(block)],
            pause_seconds=5.0,
            sleep=sleep,
        )

        assert sleep.calls == [5.0, 5.0]

    def test_error_propagates_without_extra_sleeps(self) -> None:
        blocks = [_block(0), _block(1), _block(2)]
        sleep = RecordingSleep()

        def download(block: DownloadBlock) -> list[Candle]:
            if block.start == 60:
                raise RuntimeError("fallo de red")
            return [_candle(block)]

        with pytest.raises(RuntimeError, match="fallo de red"):
            download_blocks(blocks, download, sleep=sleep)

        # Solo la espera previa al bloque que falló; no hay esperas posteriores.
        assert sleep.calls == [DEFAULT_PAUSE_SECONDS]
