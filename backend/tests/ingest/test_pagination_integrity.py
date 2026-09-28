"""Integridad de la paginación por bloques (TASK-058, RF-102; KPI-5).

DoD: para un rango de prueba, las velas descargadas cubren el calendario sin
huecos no explicados (KPI-5). Se verifica que (a) los bloques de un rango son
contiguos en tiempo abierto, con huecos solo en días de mercado cerrado, y (b)
una descarga real descarga exactamente las velas de mercado esperadas.
"""

from __future__ import annotations

from datetime import UTC, datetime
from itertools import pairwise
from pathlib import Path

import pandas as pd

from fxtrad.ingest import (
    DownloadRequest,
    FreeservClient,
    plan_blocks,
    planned_candles,
)
from fxtrad.ingest.tasks import run_download_range
from fxtrad.pipeline import MarketCalendar
from fxtrad.pipeline.persist import build_persister
from fxtrad.storage import ParquetSeriesStore

_DAY = 86_400
_START = 1_772_409_600  # 2026-03-02T00:00:00Z (lunes)
_TWO_WEEKS_END = _START + 14 * _DAY - 1  # 2026-03-15T23:59:59Z (domingo)
_SIX_WEEKS_END = _START + 42 * _DAY - 1


def _ohlc_df(rows: list[tuple[int, float, float, float, float]]) -> pd.DataFrame:
    """DataFrame OHLC con la forma de ``dukascopy_python.fetch`` (intervalos OHLC)."""
    records = [
        {
            "timestamp": pd.to_datetime(ts, unit="s", utc=True),
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
        }
        for ts, open_, high, low, close in rows
    ]
    if not records:
        return pd.DataFrame(columns=["open", "high", "low", "close"]).set_index(
            pd.DatetimeIndex([], name="timestamp")
        )
    return pd.DataFrame(records).set_index("timestamp")


def _open_minute_fetcher(calendar: MarketCalendar | None = None):
    """Fetcher que devuelve una vela de 1 m por minuto de mercado del rango."""
    cal = calendar if calendar is not None else MarketCalendar()

    def fetch(
        instrument: str,
        interval: str,
        offer_side: str,
        start: datetime,
        end: datetime,
        limit: int | None = None,
    ) -> pd.DataFrame:
        start_s = int(start.timestamp())
        end_s = int(end.timestamp())
        rows = []
        for minute in range(start_s - start_s % 60, end_s + 1, 60):
            day = datetime.fromtimestamp(minute, tz=UTC).date()
            if cal.is_open_day(day):
                rows.append((minute, 1.0, 1.0, 1.0, 1.0))
        return _ohlc_df(rows)

    return fetch


class TestBlockTiling:
    """Los bloques tapan el tiempo de mercado y solo dejan huecos explicados."""

    def test_blocks_are_ordered_and_non_overlapping(self) -> None:
        blocks = plan_blocks(_START, _SIX_WEEKS_END)

        assert len(blocks) > 1
        for previous, current in pairwise(blocks):
            assert previous.end < current.start

    def test_gaps_between_blocks_are_closed_market_days(self) -> None:
        blocks = plan_blocks(_START, _SIX_WEEKS_END)

        for previous, current in pairwise(blocks):
            gap = (previous.end + 1, current.start - 1)
            if gap[0] <= gap[1]:
                assert planned_candles(*gap) == 0  # hueco sin mercado

    def test_block_candles_match_calendar_estimate(self) -> None:
        blocks = plan_blocks(_START, _SIX_WEEKS_END)

        for block in blocks:
            assert block.planned_candles == planned_candles(block.start, block.end)

    def test_blocks_cover_all_market_candles(self) -> None:
        blocks = plan_blocks(_START, _SIX_WEEKS_END)
        covered = sum(block.planned_candles for block in blocks)

        assert covered == planned_candles(_START, _SIX_WEEKS_END)


class TestDownloadIntegrity:
    """La descarga cuadra con el calendario: 0 huecos no explicados (KPI-5)."""

    def test_downloaded_candles_match_market_expectation(self, tmp_path: Path) -> None:
        client = FreeservClient(fetcher=_open_minute_fetcher())
        persister = build_persister(tmp_path)

        summary = run_download_range(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_TWO_WEEKS_END),
            persister=persister,
        )

        expected = planned_candles(_START, _TWO_WEEKS_END)
        stored = ParquetSeriesStore(tmp_path).read_range("EURUSD", 0, 2**31 - 1)
        assert expected == 10 * 1440  # 10 días de mercado × 1440 minutos
        assert summary["estado"] == "exito"
        assert summary["velas"] == expected
        assert len(stored) == expected

    def test_downloaded_times_have_no_duplicates(self, tmp_path: Path) -> None:
        client = FreeservClient(fetcher=_open_minute_fetcher())
        persister = build_persister(tmp_path)

        run_download_range(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_TWO_WEEKS_END),
            persister=persister,
        )

        times = [c.time for c in ParquetSeriesStore(tmp_path).read_range("EURUSD", 0, 2**31 - 1)]
        assert len(times) == len(set(times))

    def test_no_candles_on_closed_days(self, tmp_path: Path) -> None:
        client = FreeservClient(fetcher=_open_minute_fetcher())
        persister = build_persister(tmp_path)

        run_download_range(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_TWO_WEEKS_END),
            persister=persister,
        )

        calendar = MarketCalendar()
        for candle in ParquetSeriesStore(tmp_path).read_range("EURUSD", 0, 2**31 - 1):
            assert calendar.is_open_timestamp(candle.time)
