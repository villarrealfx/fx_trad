"""Tests de la validación de ventana de descarga ≤ 2 años (TASK-008, RNF-003).

DoD: una solicitud > 2 años se rechaza con mensaje; test unitario. Se inyecta
``now`` en los tests de la función pura para que el límite sea determinista y
se verifica la integración con ``DownloadRequest`` (rechazo 422 sin encolar).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from fxtrad.ingest import MAX_WINDOW_SECONDS, DownloadRequest, validate_request_window

_REFERENCE = datetime(2026, 9, 21, 8, 0, 0, tzinfo=UTC)
_REFERENCE_EPOCH = 1789977600  # 2026-09-21T08:00:00Z
_START = 1772409600  # 2026-03-02T00:00:00Z
_END = 1773100800  # 2026-03-10T00:00:00Z


class TestValidateRequestWindow:
    """La función pura rechaza la antigüedad > 2 años con mensaje explícito."""

    def test_window_older_than_two_years_is_rejected(self) -> None:
        start = _REFERENCE_EPOCH - MAX_WINDOW_SECONDS - 1

        with pytest.raises(ValueError, match="2 años"):
            validate_request_window(start, _END, now=_REFERENCE)

    def test_window_exactly_two_years_is_accepted(self) -> None:
        start = _REFERENCE_EPOCH - MAX_WINDOW_SECONDS

        validate_request_window(start, _END, now=_REFERENCE)  # no se lanza

    def test_window_within_two_years_is_accepted(self) -> None:
        start = _REFERENCE_EPOCH - MAX_WINDOW_SECONDS // 2

        validate_request_window(start, _END, now=_REFERENCE)  # no se lanza

    def test_recent_window_is_accepted(self) -> None:
        validate_request_window(_START, _END, now=_REFERENCE)  # no se lanza

    def test_default_now_uses_utc_now(self) -> None:
        validate_request_window(_START, _END)  # no se lanza


class TestDownloadRequestIntegration:
    """Un rango > 2 años se rechaza en el modelo sin construir la solicitud."""

    def test_request_older_than_two_years_is_rejected(self) -> None:
        start = _REFERENCE_EPOCH - MAX_WINDOW_SECONDS - 1

        with pytest.raises(ValidationError, match="2 años"):
            DownloadRequest(asset="EURUSD", start=start, end=_END)

    def test_request_within_two_years_is_accepted(self) -> None:
        request = DownloadRequest(asset="EURUSD", start=_START, end=_END)
        assert request.start == _START
        assert request.end == _END

    def test_window_limit_exact_is_accepted(self) -> None:
        start = int(datetime.now(UTC).timestamp()) - MAX_WINDOW_SECONDS
        end = start + 3600

        request = DownloadRequest(asset="XAUUSD", start=start, end=end)
        assert request.start == start


class TestWindowConstant:
    """La constante de ventana se define como 2 años en segundos (RNF-003)."""

    def test_window_is_two_years(self) -> None:
        assert timedelta(days=730).total_seconds() == MAX_WINDOW_SECONDS
