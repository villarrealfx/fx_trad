"""Tests de normalización de timestamps a segundos UTC (TASK-007, RF-002/RNF-004).

DoD: un fixture con TZ no-UTC converge a epoch en segundos UTC. Se reutiliza el
instante conocido 2026-08-11 10:00 UTC (``1786442400``, EURUSD_HOUR_START de
TASK-002) y se expresa en varias zonas horarias para verificar la convergencia.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from fxtrad.ingest import to_epoch_seconds

KNOWN_EPOCH_UTC = 1786442400  # 2026-08-11 10:00:00 UTC
UTC_KNOWN = datetime(2026, 8, 11, 10, 0, 0, tzinfo=UTC)


def test_tz_non_utc_converges_to_epoch_seconds_utc() -> None:
    """Un datetime en Madrid (UTC+2, verano) converge al epoch UTC."""
    madrid = datetime(2026, 8, 11, 12, 0, 0, tzinfo=ZoneInfo("Europe/Madrid"))

    assert to_epoch_seconds(madrid) == KNOWN_EPOCH_UTC


def test_tz_non_utc_negative_offset_converges_to_epoch_seconds_utc() -> None:
    """Un datetime en Nueva York (UTC-4, verano) converge al epoch UTC."""
    new_york = datetime(2026, 8, 11, 6, 0, 0, tzinfo=ZoneInfo("America/New_York"))

    assert to_epoch_seconds(new_york) == KNOWN_EPOCH_UTC


def test_fixed_offset_converges_to_epoch_seconds_utc() -> None:
    """Un tzinfo con offset fijo +02:00 converge al epoch UTC."""
    fixed = datetime(2026, 8, 11, 12, 0, 0, tzinfo=timezone(timedelta(hours=2)))

    assert to_epoch_seconds(fixed) == KNOWN_EPOCH_UTC


def test_naive_datetime_is_assumed_utc() -> None:
    """Un datetime naive se interpreta como UTC y converge al epoch UTC."""
    naive = datetime(2026, 8, 11, 10, 0, 0)

    assert to_epoch_seconds(naive) == KNOWN_EPOCH_UTC


def test_utc_aware_datetime_is_identity() -> None:
    """Un datetime ya en UTC no se modifica: mismo epoch."""
    assert to_epoch_seconds(UTC_KNOWN) == KNOWN_EPOCH_UTC


def test_rejects_non_datetime_input() -> None:
    """Entradas que no son `datetime` se rechazan con TypeError."""
    with pytest.raises(TypeError):
        to_epoch_seconds(1786442400)  # type: ignore[arg-type]
