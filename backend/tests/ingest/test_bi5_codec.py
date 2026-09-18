"""Tests del codec de archivos bi5 de Dukascopy (TASK-002, RX-001).

Verifica la decodificación binaria: descriptor ``>IIIff`` de 20 bytes big-endian,
descompresión LZMA raw y ordenamiento de ticks por milisegundo.
"""

from __future__ import annotations

import lzma
import struct

import pytest

from fxtrad.ingest.dukascopy import TICK_FORMAT, RawTick, decode_bi5


def _compress(raw: bytes) -> bytes:
    """Comprime con LZMA en formato alone (como los archivos reales)."""
    return lzma.compress(raw, format=lzma.FORMAT_ALONE)


def _encode(*records: tuple[int, int, int, float, float]) -> bytes:
    raw = b"".join(struct.pack(TICK_FORMAT, *record) for record in records)
    return _compress(raw)


class TestDecodeTicks:
    """La descompresión y el descriptor producen los ticks esperados."""

    def test_decodes_big_endian_fields(self) -> None:
        payload = _encode((1500, 109130, 109120, 0.5, 0.25))
        assert decode_bi5(payload) == [
            RawTick(ms=1500, ask=109130, bid=109120, ask_volume=0.5, bid_volume=0.25)
        ]

    def test_decodes_multiple_records(self) -> None:
        payload = _encode((0, 100, 99, 1.0, 1.0), (1000, 101, 100, 2.0, 2.0))
        ticks = decode_bi5(payload)
        assert [t.ms for t in ticks] == [0, 1000]
        assert ticks[0].ask == 100
        assert ticks[1].bid == 100

    def test_sorts_ticks_by_milliseconds(self) -> None:
        payload = _encode((5000, 1, 1, 0.0, 0.0), (0, 2, 2, 0.0, 0.0), (1000, 3, 3, 0.0, 0.0))
        ticks = decode_bi5(payload)
        assert [t.ms for t in ticks] == [0, 1000, 5000]

    def test_empty_payload_yields_no_ticks(self) -> None:
        assert decode_bi5(b"") == []

    def test_rejects_payload_not_aligning_to_records(self) -> None:
        raw = struct.pack(TICK_FORMAT, 0, 1, 1, 0.0, 0.0) + b"\x00\x00"
        with pytest.raises(ValueError, match="no alinean"):
            decode_bi5(_compress(raw))

    def test_rejects_non_lzma_payload(self) -> None:
        with pytest.raises(lzma.LZMAError):
            decode_bi5(b"esto no es un archivo bi5" * 10)
