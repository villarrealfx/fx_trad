"""Tests del cliente Dukascopy vía API chart freeserv (TASK-053, RF-101/RX-101).

Cubre el mapeo de instrumentos, la conversión del DataFrame OHLC de
``dukascopy_python.fetch`` a velas canónicas y la descarga por rango a 1 minuto
(BID). El test real contra la API es optativo (``RUN_DUKASCOPY_INTEGRATION=1``).
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
    candles_from_ohlc,
    instrument_id_for,
)

EURUSD_HOUR_START = 1786442400  # 2026-08-11 10:00 UTC (referencia de los tests)


def _ohlc_df(rows: list[tuple[int, float, float, float, float]]) -> pd.DataFrame:
    """DataFrame OHLC con la forma de ``dukascopy_python.fetch`` (intervalos OHLC).

    Args:
        rows: Tuplas (epoch s UTC, open, high, low, close).
    """
    records = [
        {
            "timestamp": pd.to_datetime(ts, unit="s", utc=True),
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": 1.0,
        }
        for ts, open_, high, low, close in rows
    ]
    if not records:
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume"]).set_index(
            pd.DatetimeIndex([], name="timestamp")
        )
    return pd.DataFrame(records).set_index("timestamp")


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


class TestCandlesFromOhlc:
    """El mapeo OHLC no transforma precios y descarta el volumen (TASK-053)."""

    def test_maps_columns_without_transformation(self) -> None:
        df = _ohlc_df([(EURUSD_HOUR_START, 1.1, 1.2, 1.0, 1.15)])

        candles = candles_from_ohlc(df)

        assert candles == [Candle(time=EURUSD_HOUR_START, open=1.1, high=1.2, low=1.0, close=1.15)]

    def test_none_returns_empty(self) -> None:
        assert candles_from_ohlc(None) == []

    def test_empty_dataframe_returns_empty(self) -> None:
        assert candles_from_ohlc(_ohlc_df([])) == []

    def test_rejects_non_dataframe(self) -> None:
        with pytest.raises(TypeError, match="DataFrame"):
            candles_from_ohlc("no es un DataFrame")


class TestDownloadRange:
    """``download_range`` pide 1 m BID al fetcher y devuelve velas canónicas."""

    def test_returns_one_minute_candles(self) -> None:
        df = _ohlc_df(
            [
                (EURUSD_HOUR_START, 1.09125, 1.09140, 1.09100, 1.09130),
                (EURUSD_HOUR_START + 60, 1.09130, 1.09150, 1.09120, 1.09145),
            ]
        )
        client = FreeservClient(fetcher=_fetcher_for(df))
        start = datetime.fromtimestamp(EURUSD_HOUR_START - 60, tz=UTC)
        end = datetime.fromtimestamp(EURUSD_HOUR_START + 60, tz=UTC)

        candles = client.download_range("EURUSD", start, end)

        assert [c.time for c in candles] == [EURUSD_HOUR_START, EURUSD_HOUR_START + 60]
        assert candles[0].open == pytest.approx(1.09125)
        assert candles[1].close == pytest.approx(1.09145)

    def test_passes_min_1_interval_and_bid(self) -> None:
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
            return _ohlc_df([])

        client = FreeservClient(fetcher=fetcher)  # type: ignore[arg-type]
        start = datetime.fromtimestamp(EURUSD_HOUR_START, tz=UTC)
        end = datetime.fromtimestamp(EURUSD_HOUR_START + 3600, tz=UTC)

        client.download_range("XAUUSD", start, end)

        assert seen[0] == "XAU/USD"
        assert seen[1] == "1MIN"
        assert seen[2] == "B"
        assert seen[3] == start
        assert seen[4] == end
        assert seen[5] is None

    def test_naive_datetimes_are_assumed_utc(self) -> None:
        seen: list[object] = []

        def fetcher(
            instrument: str,
            interval: str,
            offer_side: str,
            start: datetime,
            end: datetime,
            limit: int | None = None,
        ) -> pd.DataFrame:
            seen.append(start)
            return _ohlc_df([])

        client = FreeservClient(fetcher=fetcher)  # type: ignore[arg-type]
        naive_start = datetime(2026, 8, 11, 10, 0, 0)  # mismo reloj que el epoch UTC

        client.download_range("EURUSD", naive_start, naive_start)

        assert seen[0] == datetime(2026, 8, 11, 10, 0, 0, tzinfo=UTC)

    def test_unknown_symbol_is_rejected(self) -> None:
        client = FreeservClient(fetcher=_fetcher_for(_ohlc_df([])))
        start = datetime.fromtimestamp(EURUSD_HOUR_START, tz=UTC)

        with pytest.raises(KeyError, match="no está en el catálogo"):
            client.download_range("BTCUSD", start, start)


@pytest.mark.skipif(
    os.environ.get("RUN_DUKASCOPY_INTEGRATION") != "1",
    reason="Requiere RUN_DUKASCOPY_INTEGRATION=1 (red real a Dukascopy)",
)
def test_real_download_range() -> None:
    """Test real contra la API chart freeserv (optativo, requiere red)."""
    client = FreeservClient()
    start = datetime.fromtimestamp(EURUSD_HOUR_START, tz=UTC)
    end = datetime.fromtimestamp(EURUSD_HOUR_START + 600, tz=UTC)

    candles = client.download_range("EURUSD", start, end)

    assert candles
    for candle in candles:
        assert 0.5 <= candle.open <= 2.0
