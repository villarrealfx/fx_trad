"""Tests de la reanudación por rango restante (TASK-065, RF-104).

DoD: tras una descarga ``parcial``, el complemento (rangos fallidos) se descarga
y se fusiona sin duplicados (upsert por ``time``, KPI-4).
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pandas as pd

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest import (
    DownloadRequest,
    FreeservClient,
    coalesce_ranges,
    failed_ranges,
    pending_ranges,
    resume_download,
)
from fxtrad.pipeline.persist import build_persister
from fxtrad.storage import ParquetSeriesStore

_START = 1772409600  # 2026-03-02T00:00:00Z (lunes)


def _candle(time: int) -> Candle:
    """Vela plana para la base de prueba."""
    return Candle(time=time, open=1.0, high=1.0, low=1.0, close=1.0)


def _minute_fetcher():
    """Fetcher que devuelve una vela de 1 m por minuto del rango solicitado."""

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
        records = [
            {
                "timestamp": pd.to_datetime(second, unit="s", utc=True),
                "open": 1.0,
                "high": 1.0,
                "low": 1.0,
                "close": 1.0,
            }
            for second in range(start_s, end_s + 1, 60)
        ]
        return pd.DataFrame(records).set_index("timestamp")

    return fetch


def _stored_times(store: ParquetSeriesStore, symbol: str = "EURUSD") -> list[int]:
    return [candle.time for candle in store.read_range(symbol, 0, 2**31 - 1)]


class TestFailedRanges:
    """``failed_ranges`` extrae los intervalos fallidos del resumen."""

    def test_extracts_intervals(self) -> None:
        summary = {"fallos_detalle": [{"inicio": 10, "fin": 20}, {"inicio": 30, "fin": 40}]}

        assert failed_ranges(summary) == [(10, 20), (30, 40)]

    def test_missing_or_malformed_yields_empty(self) -> None:
        assert failed_ranges({}) == []
        assert failed_ranges({"fallos_detalle": "no-es-lista"}) == []
        assert failed_ranges({"fallos_detalle": [{"inicio": 1}, "x", {}]}) == []


class TestCoalesceRanges:
    """``coalesce_ranges`` une intervalos contiguos o solapados."""

    def test_merges_contiguous_and_overlapping(self) -> None:
        assert coalesce_ranges([(10, 19), (20, 29), (25, 40)]) == [(10, 40)]

    def test_keeps_disjoint_ranges(self) -> None:
        assert coalesce_ranges([(10, 19), (30, 39)]) == [(10, 19), (30, 39)]

    def test_sorts_input(self) -> None:
        assert coalesce_ranges([(30, 39), (10, 19)]) == [(10, 19), (30, 39)]


class TestPendingRanges:
    """``pending_ranges`` recorta los fallos al rango solicitado."""

    def test_clips_to_the_requested_range(self) -> None:
        summary = {"fallos_detalle": [{"inicio": 0, "fin": 100}]}

        assert pending_ranges(summary, 40, 60) == [(40, 60)]

    def test_ignores_failures_outside_the_range(self) -> None:
        summary = {"fallos_detalle": [{"inicio": 0, "fin": 10}]}

        assert pending_ranges(summary, 100, 200) == []

    def test_no_failures_means_nothing_to_resume(self) -> None:
        assert pending_ranges({}, _START, _START + 100) == []


class TestResumeDownload:
    """El complemento se descarga y se fusiona sin duplicados (KPI-4)."""

    def test_no_failures_does_not_download_or_write(self, tmp_path: Path) -> None:
        client = FreeservClient(fetcher=_minute_fetcher())
        persister = build_persister(tmp_path)

        summary = resume_download(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_START + 239),
            previous_summary={},
            persister=persister,
        )

        assert summary["reanudado"] is False
        assert summary["velas"] == 0
        assert not ParquetSeriesStore(tmp_path).has_series("EURUSD")

    def test_resume_downloads_pending_range_without_duplicates(self, tmp_path: Path) -> None:
        client = FreeservClient(fetcher=_minute_fetcher())
        persister = build_persister(tmp_path)
        # Base ya almacenada: minutos 0 y 60.
        persister.persist(
            "EURUSD",
            [_candle(_START), _candle(_START + 60)],
            start=_START,
            end=_START + 119,
            status="parcial",
        )
        previous = {"fallos_detalle": [{"inicio": _START + 120, "fin": _START + 239}]}

        summary = resume_download(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_START + 239),
            previous_summary=previous,
            persister=persister,
        )

        store = ParquetSeriesStore(tmp_path)
        times = _stored_times(store)
        assert summary["reanudado"] is True
        assert summary["estado"] == "exito"
        assert summary["velas"] == 2  # minutos 120 y 180
        assert times == [_START, _START + 60, _START + 120, _START + 180]
        assert len(times) == len(set(times))

    def test_resume_is_idempotent(self, tmp_path: Path) -> None:
        client = FreeservClient(fetcher=_minute_fetcher())
        persister = build_persister(tmp_path)
        request = DownloadRequest(asset="EURUSD", start=_START, end=_START + 239)
        previous = {"fallos_detalle": [{"inicio": _START + 120, "fin": _START + 239}]}

        resume_download(client, request, previous, persister=persister)
        resume_download(client, request, previous, persister=persister)

        times = _stored_times(ParquetSeriesStore(tmp_path))
        assert len(times) == len(set(times))
