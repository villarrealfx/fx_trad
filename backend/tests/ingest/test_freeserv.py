"""Tests del cliente Dukascopy vía API chart freeserv (TASK-002, RF-001/RF-002/RX-001).

Cubre el mapeo de instrumentos, la agregación OHLC de 1 segundo a partir de la
marca UTC absoluta de cada tick y la "hora conocida" de la DoD: una hora
concreta simulada desde un DataFrame sintético con la misma forma que devuelve
``dukascopy_python.fetch`` (ADR-010).
"""

from __future__ import annotations

import os
from datetime import UTC, datetime

import pandas as pd
import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest import FreeservClient
from fxtrad.ingest.freeserv import (
    FREESERV_INSTRUMENT,
    aggregate_to_ohlc,
    hour_start_epoch,
    instrument_id_for,
)

EURUSD_HOUR_START = 1786442400  # 2026-08-11 10:00 UTC


def _tick_df(rows: list[tuple[int, float, float]]) -> pd.DataFrame:
    """Construye un DataFrame con la forma de ``dukascopy_python.fetch``.

    Args:
        rows: Tuplas (epoch ms UTC, bid, ask) ya escaladas.
    """
    records = [
        {
            "timestamp": pd.to_datetime(ms, unit="ms", utc=True),
            "bidPrice": bid,
            "askPrice": ask,
            "bidVolume": 1_000_000.0,
            "askVolume": 1_000_000.0,
        }
        for ms, bid, ask in rows
    ]
    if not records:
        return pd.DataFrame(columns=["bidPrice", "askPrice", "bidVolume", "askVolume"]).set_index(
            pd.DatetimeIndex([], name="timestamp")
        )
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df.set_index("timestamp")


def _row_at(second: int, bid: float, ask: float) -> tuple[int, float, float]:
    """Epoch ms de un tick en el segundo indicado de la DoD (EURUSD, 2026-08-11)."""
    base = (EURUSD_HOUR_START + second) * 1000
    return (base, bid, ask)


def _fetcher_for(df: pd.DataFrame):
    """Devuelve un fetcher que responde siempre el mismo DataFrame."""

    def fetcher(
        instrument: str,
        interval: str,
        offer_side: str,
        start: datetime,
        end: datetime,
        limit: int | None = None,
    ) -> pd.DataFrame:
        return df

    return fetcher


class TestInstrumentMapping:
    """El catálogo canónico se mapea a ids de la API chart freeserv."""

    def test_forex_ids(self) -> None:
        assert instrument_id_for("EURUSD") == "EUR/USD"
        assert instrument_id_for("GBPUSD") == "GBP/USD"
        assert instrument_id_for("USDJPY") == "USD/JPY"

    def test_metal_ids(self) -> None:
        assert instrument_id_for("XAUUSD") == "XAU/USD"
        assert instrument_id_for("XAGUSD") == "XAG/USD"

    def test_oil_ids(self) -> None:
        # Petróleo: la API chart usa los ids CFD ``E_Light``/``E_Brent``.
        assert instrument_id_for("WTI") == "E_Light"
        assert instrument_id_for("BRENT") == "E_Brent"

    def test_covers_full_catalog(self) -> None:
        # Todo activo del catálogo (TASK-001) tiene id freeserv mapeado.
        from fxtrad.ingest.catalog import ASSET_CATALOG

        assert set(FREESERV_INSTRUMENT) == {a.symbol for a in ASSET_CATALOG}

    def test_unknown_symbol_is_rejected(self) -> None:
        with pytest.raises(KeyError, match="no está en el catálogo"):
            instrument_id_for("BTCUSD")


class TestAggregation:
    """La agregación de ticks (marca UTC absoluta) a velas OHLC es exacta."""

    def test_single_second_midpoint_ohlc(self) -> None:
        candles = aggregate_to_ohlc([_row_at(0, 1.09120, 1.09130)], EURUSD_HOUR_START)
        assert len(candles) == 1
        assert candles[0].time == EURUSD_HOUR_START
        assert candles[0].open == pytest.approx(1.09125)

    def test_open_high_low_close_from_mids(self) -> None:
        # sec0: mid 1.09125 · sec1: mids 1.09135 y 1.09110 (close = último)
        candles = aggregate_to_ohlc(
            [
                _row_at(0, 1.09120, 1.09130),
                _row_at(1, 1.09120, 1.09150),
                _row_at(1, 1.09110, 1.09110),
            ],
            EURUSD_HOUR_START,
        )
        assert len(candles) == 2
        assert candles[0].time == EURUSD_HOUR_START
        assert candles[0].open == pytest.approx(1.09125)
        assert candles[1].time == EURUSD_HOUR_START + 1
        assert candles[1].open == pytest.approx(1.09135)
        assert candles[1].high == pytest.approx(1.09135)
        assert candles[1].low == pytest.approx(1.09110)
        assert candles[1].close == pytest.approx(1.09110)

    def test_ticks_out_of_order_do_not_break_ohlc(self) -> None:
        candles = aggregate_to_ohlc(
            [_row_at(2, 1.09000, 1.10000), _row_at(0, 1.00000, 1.00000)],
            EURUSD_HOUR_START,
        )
        assert [c.time for c in candles] == [EURUSD_HOUR_START, EURUSD_HOUR_START + 2]

    def test_ticks_outside_hour_are_ignored(self) -> None:
        # Un tick del segundo -1 (hora anterior) o del 3600 queda fuera del rango.
        candles = aggregate_to_ohlc(
            [_row_at(-1, 1.09000, 1.09000), _row_at(0, 1.09120, 1.09130), _row_at(3600, 1.0, 1.0)],
            EURUSD_HOUR_START,
        )
        assert candles == [
            Candle(time=EURUSD_HOUR_START, open=1.09125, high=1.09125, low=1.09125, close=1.09125)
        ]

    def test_empty_hour_yields_no_candles(self) -> None:
        assert aggregate_to_ohlc([], EURUSD_HOUR_START) == []


class TestHourStartEpoch:
    """El epoch del inicio de hora mantiene la semántica UTC de TASK-002."""

    def test_known_epoch(self) -> None:
        assert hour_start_epoch(2026, 7, 11, 10) == EURUSD_HOUR_START

    def test_zero_based_month(self) -> None:
        assert hour_start_epoch(2026, 0, 1, 0) == 1767225600
        assert hour_start_epoch(2026, 1, 1, 0) == 1767225600 + 31 * 86400


class TestFreeservClient:
    """El cliente respeta la interfaz ``download_hour`` y delega en la librería."""

    def test_download_hour_aggregates_fetched_ticks(self) -> None:
        df = _tick_df(
            [
                _row_at(0, 1.09120, 1.09130),
                _row_at(1, 1.09120, 1.09150),
                _row_at(1, 1.09110, 1.09110),
            ]
        )
        client = FreeservClient(fetcher=_fetcher_for(df))
        candles = client.download_hour("EURUSD", 2026, 7, 11, 10)
        assert [c.time for c in candles] == [EURUSD_HOUR_START, EURUSD_HOUR_START + 1]
        assert candles[0].open == pytest.approx(1.09125)
        assert candles[1].close == pytest.approx(1.09110)

    def test_passes_expected_instrument_and_range(self) -> None:
        seen: list[object] = []

        def fetcher(
            instrument: str,
            interval: str,
            offer_side: str,
            start: datetime,
            end: datetime,
            limit: int | None = None,
        ) -> pd.DataFrame:
            seen.extend([instrument, interval, offer_side, start, end, limit])
            return _tick_df([])

        client = FreeservClient(fetcher=fetcher)  # type: ignore[arg-type]
        client.download_hour("XAUUSD", 2026, 7, 11, 10)

        assert seen[0] == "XAU/USD"
        assert seen[1] == "TICK"
        assert seen[2] == "B"
        assert seen[3] == datetime.fromtimestamp(EURUSD_HOUR_START, tz=UTC)
        assert seen[4] == datetime.fromtimestamp(EURUSD_HOUR_START, tz=UTC) + pd.Timedelta(hours=1)
        assert seen[5] is None

    def test_rejects_non_dataframe_result(self) -> None:
        client = FreeservClient(fetcher=lambda *_: "no es un DataFrame")  # type: ignore[arg-type]
        with pytest.raises(TypeError, match="DataFrame"):
            client.download_hour("EURUSD", 2026, 7, 11, 10)

    def test_unknown_symbol_is_rejected(self) -> None:
        client = FreeservClient(fetcher=_fetcher_for(_tick_df([])))
        with pytest.raises(KeyError, match="no está en el catálogo"):
            client.download_hour("BTCUSD", 2026, 7, 11, 10)

    def test_integration_optativa(self) -> None:
        """Test real contra la API chart freeserv (solo con RUN_DUKASCOPY_INTEGRATION=1)."""
        if os.environ.get("RUN_DUKASCOPY_INTEGRATION") != "1":
            pytest.skip("Requiere RUN_DUKASCOPY_INTEGRATION=1 (red real a Dukascopy)")
        client = FreeservClient()
        candles = client.download_hour("EURUSD", 2026, 7, 11, 10)
        assert candles
        for candle in candles:
            assert 0.5 <= candle.open <= 2.0
            assert EURUSD_HOUR_START <= candle.time < EURUSD_HOUR_START + 3600
