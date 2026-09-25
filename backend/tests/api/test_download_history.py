"""Tests de ``GET /downloads`` para el historial RI-002 (TASK-047)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from fxtrad.api import create_app
from fxtrad.api.downloads import DownloadHistoryQuery, DownloadRange
from fxtrad.storage import DownloadMetadata, DownloadMetadataStore

_START = 1772409600
_END = 1772496000
_DATE = datetime(2026, 3, 2, 12, 0, tzinfo=UTC)


class _FakeQueue:
    """Stub mínimo de la cola necesario para construir la aplicación."""

    def enqueue(self, request: object) -> str:
        """Devuelve un identificador de tarea estable."""
        return "fake-task"


class _FakeMetadataStore:
    """Store en memoria que devuelve registros en el orden recibido."""

    def __init__(self, records: list[DownloadMetadata]) -> None:
        self._records = records

    def history(self) -> list[DownloadMetadata]:
        """Devuelve los registros precargados."""
        return self._records


def _record(
    active: str = "EURUSD",
    start: int = _START,
    end: int = _END,
    status: str = "exito",
    date: datetime = _DATE,
    rows: int = 3600,
) -> DownloadMetadata:
    """Construye un registro de metadatos para las pruebas."""
    return DownloadMetadata(
        activo=active,
        inicio=start,
        fin=end,
        estado=status,
        fecha_descarga=date,
        filas=rows,
    )


def _client(records: list[DownloadMetadata] | None = None) -> TestClient:
    """Construye un cliente con un historial de metadatos inyectado."""
    query = DownloadHistoryQuery(_FakeMetadataStore(records or []))
    return TestClient(create_app(_FakeQueue(), download_history_query=query))


class TestDownloadHistoryContract:
    """Verifica el contrato HTTP y el mapping de los metadatos."""

    def test_returns_frontend_history_shape(self) -> None:
        client = _client([_record()])

        response = client.get("/downloads")

        assert response.status_code == 200
        assert response.json() == [
            {
                "date": "2026-03-02T12:00:00Z",
                "active": "EURUSD",
                "range": {"start": _START, "end": _END},
                "status": "exito",
                "rows": 3600,
            }
        ]

    def test_preserves_range_and_row_count(self) -> None:
        client = _client([_record(start=_END, end=_END + 60, rows=0)])

        row = client.get("/downloads").json()[0]

        assert row["range"] == {"start": _END, "end": _END + 60}
        assert row["rows"] == 0

    @pytest.mark.parametrize("status", ["exito", "parcial", "fallo"])
    def test_preserves_each_final_status(self, status: str) -> None:
        client = _client([_record(status=status)])

        row = client.get("/downloads").json()[0]

        assert row["status"] == status

    def test_returns_empty_list_without_history(self) -> None:
        response = _client().get("/downloads")

        assert response.status_code == 200
        assert response.json() == []


class TestDownloadHistoryStoreIntegration:
    """Comprueba el endpoint con la tabla DuckDB real de TASK-018."""

    def test_returns_records_newest_first(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        store.save(_record(active="EURUSD", date=_DATE))
        store.save(_record(active="XAUUSD", date=_DATE + timedelta(days=1)))
        query = DownloadHistoryQuery(store)
        client = TestClient(create_app(_FakeQueue(), download_history_query=query))

        response = client.get("/downloads")

        assert response.status_code == 200
        assert [row["active"] for row in response.json()] == ["XAUUSD", "EURUSD"]


class TestDownloadRange:
    """El contrato conserva la validación de rangos de la capa de dominio."""

    def test_rejects_reversed_range(self) -> None:
        with pytest.raises(ValidationError, match="fin anterior a inicio"):
            DownloadRange(start=_END, end=_START)
