"""Tests de la descomposición del rango en tandas de 6–12 meses (TASK-064, RF-104).

DoD: un rango de 2 años genera 2 tandas; cada tanda reporta sus bloques
(completados/total) y las tandas cubren el rango de forma contigua.
"""

from __future__ import annotations

from itertools import pairwise

import pytest

from fxtrad.ingest import MAX_BATCH_SECONDS, plan_batches, planned_candles

_DAY = 86_400
_YEAR = 365 * _DAY
_START = 1_772_409_600  # 2026-03-02T00:00:00Z (lunes)


class TestBatchDecomposition:
    """El rango se parte en tandas de ~6–12 meses (ADR-015)."""

    def test_two_years_yields_two_batches(self) -> None:
        batches = plan_batches(_START, _START + 2 * _YEAR)

        assert len(batches) == 2

    def test_eighteen_months_yields_two_batches(self) -> None:
        batches = plan_batches(_START, _START + _YEAR + _YEAR // 2)

        assert len(batches) == 2

    def test_thirteen_months_yields_two_batches(self) -> None:
        batches = plan_batches(_START, _START + _YEAR + _YEAR // 12)

        assert len(batches) == 2

    def test_six_months_yields_one_batch(self) -> None:
        batches = plan_batches(_START, _START + _YEAR // 2)

        assert len(batches) == 1

    def test_single_day_yields_one_batch(self) -> None:
        batches = plan_batches(_START, _START + _DAY)

        assert len(batches) == 1

    def test_inverted_range_is_rejected(self) -> None:
        with pytest.raises(ValueError, match="Rango inválido"):
            plan_batches(_START + 1, _START)


class TestBatchCoverage:
    """Las tandas son contiguas, no se solapan y respetan el tamaño máximo."""

    def test_batches_are_contiguous_and_non_overlapping(self) -> None:
        batches = plan_batches(_START, _START + 2 * _YEAR)

        for previous, current in pairwise(batches):
            assert previous.end + 1 == current.start

    def test_first_and_last_cover_the_range(self) -> None:
        end = _START + 2 * _YEAR

        batches = plan_batches(_START, end)

        assert batches[0].start == _START
        assert batches[-1].end == end

    def test_multi_batches_within_min_and_max(self) -> None:
        batches = plan_batches(_START, _START + 2 * _YEAR)

        for batch in batches:
            assert batch.duration <= MAX_BATCH_SECONDS

    def test_planned_candles_partition_the_range(self) -> None:
        end = _START + 2 * _YEAR

        batches = plan_batches(_START, end)
        total = sum(block.planned_candles for batch in batches for block in batch.blocks)

        assert total == planned_candles(_START, end)


class TestBatchProgress:
    """Cada tanda reporta sus bloques (total) para el progreso."""

    def test_each_batch_reports_its_total_blocks(self) -> None:
        batches = plan_batches(_START, _START + 2 * _YEAR)

        for batch in batches:
            assert batch.total_blocks == len(batch.blocks)
            assert batch.total_blocks > 0

    def test_two_years_total_blocks_matches_calendar_estimate(self) -> None:
        end = _START + 2 * _YEAR

        batches = plan_batches(_START, end)
        planned = sum(block.planned_candles for batch in batches for block in batch.blocks)

        assert planned == planned_candles(_START, end)
