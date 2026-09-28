"""Verificación de la ventana de 2 años (TASK-071, RNF-003).

DoD: ``validate_request_window`` sigue rechazando inicios fuera de los 2 años.
Se comprueba, además, que un rango de 2 años se planifica en 2 tandas (ADR-015).
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from fxtrad.ingest import MAX_WINDOW_SECONDS, plan_batches, validate_request_window

_YEAR = 365 * 86_400
_NOW = datetime(2026, 9, 28, 12, 0, tzinfo=UTC)
_NOW_EPOCH = int(_NOW.timestamp())


class TestWindowTwoYears:
    """La antigüedad máxima sigue siendo de 2 años (RNF-003)."""

    def test_exactly_two_years_is_accepted(self) -> None:
        start = _NOW_EPOCH - MAX_WINDOW_SECONDS

        validate_request_window(start, _NOW_EPOCH, now=_NOW)  # no se lanza

    def test_older_than_two_years_is_rejected(self) -> None:
        start = _NOW_EPOCH - MAX_WINDOW_SECONDS - 1

        with pytest.raises(ValueError, match="2 años"):
            validate_request_window(start, _NOW_EPOCH, now=_NOW)

    def test_two_year_window_plans_two_batches(self) -> None:
        start = _NOW_EPOCH - 2 * _YEAR

        validate_request_window(start, _NOW_EPOCH, now=_NOW)
        batches = plan_batches(start, _NOW_EPOCH)

        assert len(batches) == 2
