"""Tests del planificador de bloques de descarga (TASK-052, RF-102/RNF-101).

DoD: la planificación es una función pura y determinista; un rango de 1 año
produce bloques de ≤ 30.000 velas y la suma de velas planificadas coincide con
la estimación del calendario de mercado.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from itertools import pairwise

import pytest

from fxtrad.ingest import (
    DEFAULT_MAX_BLOCK_CANDLES,
    plan_blocks,
    planned_candles,
    to_epoch_seconds,
)
from fxtrad.pipeline import MarketCalendar


def epoch(year: int, month: int, day: int, hour: int = 0, minute: int = 0, second: int = 0) -> int:
    """Construye el epoch UTC de una fecha/hora dada (helper de tests)."""
    return to_epoch_seconds(datetime(year, month, day, hour, minute, second, tzinfo=UTC))


_MONDAY_FULL = (epoch(2026, 1, 5), epoch(2026, 1, 5, 23, 59, 59))
_WEEK_OPEN = (epoch(2026, 1, 5), epoch(2026, 1, 9, 23, 59, 59))
_WEEKEND = (epoch(2026, 1, 10), epoch(2026, 1, 11, 23, 59, 59))
_ONE_YEAR = (epoch(2026, 1, 5), epoch(2026, 12, 31, 23, 59, 59))
_TWO_YEARS = (epoch(2025, 1, 6), epoch(2026, 12, 31, 23, 59, 59))


class TestPlannedCandles:
    """La estimación de velas respeta los días abiertos del calendario."""

    def test_full_week_of_open_days(self) -> None:
        start, end = _WEEK_OPEN

        assert planned_candles(start, end) == 5 * 1440

    def test_weekend_only_has_no_candles(self) -> None:
        start, end = _WEEKEND

        assert planned_candles(start, end) == 0

    def test_partial_day_counts_aligned_minutes(self) -> None:
        start = epoch(2026, 1, 5, 10, 0, 0)
        end = epoch(2026, 1, 5, 10, 4, 59)

        assert planned_candles(start, end) == 5

    def test_holiday_is_excluded(self) -> None:
        calendar = MarketCalendar(holidays=[date(2026, 1, 6)])
        start, end = _WEEK_OPEN

        assert planned_candles(start, end, calendar) == 4 * 1440

    def test_reversed_range_raises(self) -> None:
        with pytest.raises(ValueError, match="Rango inválido"):
            planned_candles(_MONDAY_FULL[1], _MONDAY_FULL[0])


class TestPlanBlocks:
    """El particionado respeta el máximo por bloque y cubre todo el rango."""

    def test_one_year_blocks_within_limit_and_sum_matches(self) -> None:
        start, end = _ONE_YEAR

        blocks = plan_blocks(start, end)

        assert len(blocks) > 1
        assert all(block.planned_candles <= DEFAULT_MAX_BLOCK_CANDLES for block in blocks)
        assert sum(block.planned_candles for block in blocks) == planned_candles(start, end)

    def test_custom_max_splits_into_smaller_blocks(self) -> None:
        start, end = _WEEK_OPEN

        blocks = plan_blocks(start, end, max_block_candles=3000)

        assert all(0 < block.planned_candles <= 3000 for block in blocks)
        assert sum(block.planned_candles for block in blocks) == planned_candles(start, end)

    def test_no_open_days_returns_empty(self) -> None:
        start, end = _WEEKEND

        assert plan_blocks(start, end) == []

    def test_single_open_day_returns_one_block(self) -> None:
        start, end = _MONDAY_FULL

        blocks = plan_blocks(start, end)

        assert len(blocks) == 1
        assert blocks[0].start == start
        assert blocks[0].end == end
        assert blocks[0].planned_candles == 1440

    def test_blocks_are_ordered_and_non_overlapping(self) -> None:
        start, end = _ONE_YEAR

        blocks = plan_blocks(start, end)

        for previous, current in pairwise(blocks):
            assert previous.end < current.start

    def test_two_years_sum_is_coherent(self) -> None:
        start, end = _TWO_YEARS

        blocks = plan_blocks(start, end)

        assert all(block.planned_candles <= DEFAULT_MAX_BLOCK_CANDLES for block in blocks)
        assert sum(block.planned_candles for block in blocks) == planned_candles(start, end)

    def test_max_below_one_day_raises(self) -> None:
        start, end = _WEEK_OPEN

        with pytest.raises(ValueError, match="día completo"):
            plan_blocks(start, end, max_block_candles=1439)

    def test_reversed_range_raises(self) -> None:
        with pytest.raises(ValueError, match="Rango inválido"):
            plan_blocks(_MONDAY_FULL[1], _MONDAY_FULL[0])
