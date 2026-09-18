"""Tests del modelo de request de descarga (TASK-001, RF-001/HU-001).

Verifica que ``DownloadRequest`` valida activo y rango según el criterio de
aceptación de HU-001: un rango inválido (fin anterior a inicio) o un activo
desconocido se rechazan con error de validación.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from fxtrad.ingest import DownloadRequest

_START = 1772409600  # 2026-03-02T00:00:00Z
_END = 1773100800  # 2026-03-10T00:00:00Z


class TestValidRequest:
    """El request válido se construye y serializa correctamente."""

    def test_valid_request_is_accepted(self) -> None:
        request = DownloadRequest(asset="EURUSD", start=_START, end=_END)
        assert request.asset == "EURUSD"
        assert request.start == _START
        assert request.end == _END

    def test_single_second_range_is_accepted(self) -> None:
        request = DownloadRequest(asset="XAUUSD", start=_START, end=_START)
        assert request.end == request.start

    def test_round_trip_json_preserves_values(self) -> None:
        request = DownloadRequest(asset="WTI", start=_START, end=_END)
        exported = request.model_dump(mode="json")
        assert exported == {"asset": "WTI", "start": _START, "end": _END}
        assert DownloadRequest.model_validate(exported) == request


class TestInvalidRange:
    """Criterio HU-001: un rango con fin anterior a inicio se rechaza."""

    def test_end_before_start_is_rejected(self) -> None:
        with pytest.raises(ValidationError):
            DownloadRequest(asset="EURUSD", start=_END, end=_START)

    def test_negative_timestamp_is_rejected(self) -> None:
        with pytest.raises(ValidationError):
            DownloadRequest(asset="EURUSD", start=-1, end=_END)


class TestInvalidAsset:
    """Un activo fuera del catálogo se rechaza sin encolar nada."""

    def test_unknown_asset_is_rejected(self) -> None:
        with pytest.raises(ValidationError):
            DownloadRequest(asset="BTCUSD", start=_START, end=_END)

    def test_empty_asset_is_rejected(self) -> None:
        with pytest.raises(ValidationError):
            DownloadRequest(asset="", start=_START, end=_END)


class TestShape:
    """El modelo no acepta campos ni mutaciones fuera del contrato."""

    def test_extra_fields_are_rejected(self) -> None:
        with pytest.raises(ValidationError):
            DownloadRequest(asset="EURUSD", start=_START, end=_END, fuerza_bruta=True)

    def test_request_is_immutable(self) -> None:
        request = DownloadRequest(asset="EURUSD", start=_START, end=_END)
        with pytest.raises(ValidationError):
            request.end = _END + 1
