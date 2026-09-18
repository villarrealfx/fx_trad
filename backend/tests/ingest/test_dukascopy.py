"""Tests del cliente Dukascopy (TASK-002, RF-001/RF-002/RX-001).

Cubre el mapeo de instrumentos, la construcción de la URL (mes 0-based), la
agregación OHLC de 1 segundo y la "hora conocida" de la DoD: una hora concreta
descodificada de un fixture LZMA y verificada contra valores exactos.
"""

from __future__ import annotations

import lzma
import os
import struct
from urllib.request import Request

import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest import DukascopyClient
from fxtrad.ingest.dukascopy import (
    TICK_FORMAT,
    aggregate_to_ohlc,
    build_hour_url,
    decode_bi5,
    hour_start_epoch,
    instrument_id_for,
    point_value_for,
)

EURUSD_POINT = 100000
EURUSD_HOUR_START = 1786442400  # 2026-08-11 10:00 UTC


def _bi5_payload(*records: tuple[int, int, int, float, float]) -> bytes:
    raw = b"".join(struct.pack(TICK_FORMAT, *record) for record in records)
    return lzma.compress(raw, format=lzma.FORMAT_ALONE)


class TestInstrumentMapping:
    """El catálogo canónico se mapea a ids Dukascopy y point values."""

    def test_forex_ids(self) -> None:
        assert instrument_id_for("EURUSD") == "eurusd"
        assert instrument_id_for("GBPUSD") == "gbpusd"
        assert instrument_id_for("USDJPY") == "usdjpy"

    def test_metal_ids(self) -> None:
        assert instrument_id_for("XAUUSD") == "xauusd"
        assert instrument_id_for("XAGUSD") == "xagusd"

    def test_oil_ids(self) -> None:
        # Petróleo Dukascopy usa ids de commodity CFD (no ``wti``/``brent``).
        assert instrument_id_for("WTI") == "lightcmdusd"
        assert instrument_id_for("BRENT") == "brentcmdusd"

    def test_point_values(self) -> None:
        assert point_value_for("EURUSD") == 100000
        assert point_value_for("USDJPY") == 1000
        assert point_value_for("XAUUSD") == 100
        assert point_value_for("WTI") == 1000

    def test_unknown_symbol_is_rejected(self) -> None:
        with pytest.raises(KeyError, match="no está en el catálogo"):
            instrument_id_for("BTCUSD")
        with pytest.raises(KeyError):
            point_value_for("BTCUSD")


class TestUrlBuilding:
    """La ruta bi5 sigue el patrón documentado con mes 0-based."""

    def test_build_hour_url_pattern(self) -> None:
        url = build_hour_url("EURUSD", 2026, 7, 11, 10)
        assert url == "https://datafeed.dukascopy.com/datafeed/eurusd/2026/07/11/10h_ticks.bi5"

    def test_month_is_zero_based(self) -> None:
        # 2026-08 → month_index 7; el epoch resultante es el de agosto.
        url = build_hour_url("EURUSD", 2026, 7, 11, 10)
        assert "/2026/07/" in url
        assert hour_start_epoch(2026, 7, 11, 10) == EURUSD_HOUR_START

    def test_hour_and_day_are_padded(self) -> None:
        url = build_hour_url("EURUSD", 2026, 0, 3, 5)
        assert "/2026/00/03/05h_ticks.bi5" in url

    def test_hour_start_epoch_known(self) -> None:
        # 2026-01-01 00:00 UTC = 1767225600; +31 días → 2026-02-01.
        assert hour_start_epoch(2026, 0, 1, 0) == 1767225600
        assert hour_start_epoch(2026, 1, 1, 0) == 1767225600 + 31 * 86400

    def test_wti_url_uses_commodity_id(self) -> None:
        url = build_hour_url("WTI", 2026, 7, 11, 10)
        assert "/lightcmdusd/2026/07/11/10h_ticks.bi5" in url


class TestAggregation:
    """La agregación de ticks a velas OHLC de 1 segundo es exacta."""

    def test_single_second_midpoint_ohlc(self) -> None:
        # bid 1.09120 → 109120; ask 1.09130 → 109130; mid 109125 → 1.09125
        ticks = decode_bi5(_bi5_payload((0, 109130, 109120, 0.5, 0.5)))
        candles = aggregate_to_ohlc(ticks, EURUSD_HOUR_START, EURUSD_POINT)
        assert candles == [
            Candle(
                time=EURUSD_HOUR_START,
                open=1.09125,
                high=1.09125,
                low=1.09125,
                close=1.09125,
            )
        ]

    def test_open_high_low_close_from_mids(self) -> None:
        # sec0: mid 1.09125 · sec1: mids 1.09135 y 1.09110 (close = último)
        ticks = decode_bi5(
            _bi5_payload(
                (0, 109130, 109120, 0.5, 0.5),
                (1000, 109150, 109120, 0.5, 0.5),
                (1500, 109120, 109100, 0.5, 0.5),
            )
        )
        candles = aggregate_to_ohlc(ticks, EURUSD_HOUR_START, EURUSD_POINT)
        assert candles == [
            Candle(time=EURUSD_HOUR_START, open=1.09125, high=1.09125, low=1.09125, close=1.09125),
            Candle(
                time=EURUSD_HOUR_START + 1,
                open=1.09135,
                high=1.09135,
                low=1.09110,
                close=1.09110,
            ),
        ]

    def test_ticks_out_of_order_do_not_break_ohlc(self) -> None:
        ticks = decode_bi5(
            _bi5_payload((2000, 110000, 109000, 0.5, 0.5), (0, 100000, 100000, 0.5, 0.5))
        )
        candles = aggregate_to_ohlc(ticks, EURUSD_HOUR_START, EURUSD_POINT)
        assert [c.time for c in candles] == [EURUSD_HOUR_START, EURUSD_HOUR_START + 2]

    def test_empty_hour_yields_no_candles(self) -> None:
        assert aggregate_to_ohlc([], EURUSD_HOUR_START, EURUSD_POINT) == []


class TestHttpAdapter:
    """El adaptador de red inyecta cabecera y lee el cuerpo de la respuesta."""

    def test_fetcher_injects_user_agent_and_reads_body(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import fxtrad.ingest.dukascopy as dukascopy_module

        captured: list[str] = []

        class _FakeResponse:
            def __enter__(self) -> _FakeResponse:
                return self

            def __exit__(self, *exc: object) -> None:
                return None

            def read(self) -> bytes:
                return b"contenido-bi5"

        def fake_urlopen(req: object) -> _FakeResponse:
            assert isinstance(req, Request)
            user_agent = "fxtrad/0.1 (uso personal, datos públicos de mercado)"
            assert req.get_header("User-agent") == user_agent
            captured.append(req.full_url)
            return _FakeResponse()

        monkeypatch.setattr(dukascopy_module, "urlopen", fake_urlopen)
        assert dukascopy_module._fetch_bytes("https://example.com/h.bi5") == b"contenido-bi5"
        assert captured == ["https://example.com/h.bi5"]


class TestKnownHourDoD:
    """DoD: una hora conocida se descarga y decodifica a OHLC sin error."""

    def test_download_known_hour_via_fetcher(self) -> None:
        payload = _bi5_payload(
            (0, 109130, 109120, 0.5, 0.5),
            (1000, 109150, 109120, 0.5, 0.5),
            (1500, 109120, 109100, 0.5, 0.5),
            (2000, 109090, 109080, 0.5, 0.5),
        )
        captured: list[str] = []

        def fetcher(url: str) -> bytes:
            captured.append(url)
            assert url.endswith("/eurusd/2026/07/11/10h_ticks.bi5")
            return payload

        client = DukascopyClient(fetcher=fetcher)
        candles = client.download_hour("EURUSD", 2026, 7, 11, 10)

        expected_times = [EURUSD_HOUR_START, EURUSD_HOUR_START + 1, EURUSD_HOUR_START + 2]
        assert [c.time for c in candles] == expected_times
        assert candles[0].open == 1.09125
        assert candles[2].close == 1.09085
        assert candles[2].high == 1.09085
        assert len(captured) == 1

    def test_integration_optativa(self) -> None:
        """Test real contra datafeed (solo con RUN_DUKASCOPY_INTEGRATION=1),
        fuera de CI por el rate-limit de Dukascopy (AR-1, TASK-005)."""
        if os.environ.get("RUN_DUKASCOPY_INTEGRATION") != "1":
            pytest.skip("Requiere RUN_DUKASCOPY_INTEGRATION=1 (red real a Dukascopy)")
        client = DukascopyClient()
        candles = client.download_hour("EURUSD", 2026, 7, 11, 10)
        assert candles
        for candle in candles:
            assert 0.5 <= candle.open <= 2.0
            assert EURUSD_HOUR_START <= candle.time < EURUSD_HOUR_START + 3600
