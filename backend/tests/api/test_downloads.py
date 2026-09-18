"""Tests del endpoint POST /downloads (TASK-003, RF-001/HU-001).

DoD: el POST responde 202 + task_id; el broker se mockea con un stub en
memoria y se verifica que una solicitud inválida nunca encola nada
(criterio de aceptación de HU-001).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from fxtrad.api import create_app
from fxtrad.ingest import DownloadRequest

_START = 1772409600  # 2026-03-02T00:00:00Z
_END = 1773100800  # 2026-03-10T00:00:00Z
_TASK_ID = "mock-task-001"


class _FakeQueue:
    """Stub de DownloadQueue que registra las solicitudes recibidas."""

    def __init__(self) -> None:
        self.enqueued: list[DownloadRequest] = []

    def enqueue(self, request: DownloadRequest) -> str:
        self.enqueued.append(request)
        return _TASK_ID


@pytest.fixture()
def queue_client() -> tuple[_FakeQueue, TestClient]:
    """Devuelve el broker stub y el cliente HTTP montado sobre él."""
    fake_queue = _FakeQueue()
    client = TestClient(create_app(fake_queue))
    return fake_queue, client


class TestEnqueueDownload:
    """DoD: POST responde 202 + task_id encolando la solicitud."""

    def test_returns_202_with_task_id(self, queue_client: tuple[_FakeQueue, TestClient]) -> None:
        _, client = queue_client
        response = client.post(
            "/downloads",
            json={"asset": "EURUSD", "start": _START, "end": _END},
        )
        assert response.status_code == 202
        assert response.json() == {"task_id": _TASK_ID}

    def test_enqueues_the_validated_request(
        self, queue_client: tuple[_FakeQueue, TestClient]
    ) -> None:
        fake_queue, client = queue_client
        client.post("/downloads", json={"asset": "XAUUSD", "start": _START, "end": _END})
        assert len(fake_queue.enqueued) == 1
        enqueued = fake_queue.enqueued[0]
        assert enqueued.asset == "XAUUSD"
        assert enqueued.start == _START
        assert enqueued.end == _END

    def test_task_id_comes_from_the_broker(
        self, queue_client: tuple[_FakeQueue, TestClient]
    ) -> None:
        _, client = queue_client
        response = client.post("/downloads", json={"asset": "WTI", "start": _START, "end": _END})
        assert response.json()["task_id"] == _TASK_ID


class TestRejectedWithoutEnqueuing:
    """HU-001: una solicitud inválida recibe error sin encolar nada."""

    def test_unknown_asset_is_rejected(self, queue_client: tuple[_FakeQueue, TestClient]) -> None:
        fake_queue, client = queue_client
        response = client.post(
            "/downloads",
            json={"asset": "BTCUSD", "start": _START, "end": _END},
        )
        assert response.status_code == 422
        assert fake_queue.enqueued == []

    def test_reversed_range_is_rejected(self, queue_client: tuple[_FakeQueue, TestClient]) -> None:
        fake_queue, client = queue_client
        response = client.post(
            "/downloads",
            json={"asset": "EURUSD", "start": _END, "end": _START},
        )
        assert response.status_code == 422
        assert fake_queue.enqueued == []

    def test_extra_field_is_rejected(self, queue_client: tuple[_FakeQueue, TestClient]) -> None:
        fake_queue, client = queue_client
        response = client.post(
            "/downloads",
            json={"asset": "EURUSD", "start": _START, "end": _END, "nivel": "alto"},
        )
        assert response.status_code == 422
        assert fake_queue.enqueued == []

    def test_wrong_types_are_rejected(self, queue_client: tuple[_FakeQueue, TestClient]) -> None:
        fake_queue, client = queue_client
        response = client.post(
            "/downloads",
            json={"asset": "EURUSD", "start": "ayer", "end": _END},
        )
        assert response.status_code == 422
        assert fake_queue.enqueued == []

    def test_missing_body_is_rejected(self, queue_client: tuple[_FakeQueue, TestClient]) -> None:
        fake_queue, client = queue_client
        response = client.post("/downloads", json={})
        assert response.status_code == 422
        assert fake_queue.enqueued == []


class TestRouting:
    """El path solo responde al método y recurso definidos."""

    def test_unknown_path_returns_404(self, queue_client: tuple[_FakeQueue, TestClient]) -> None:
        _, client = queue_client
        response = client.post("/otra-ruta", json={"asset": "EURUSD"})
        assert response.status_code == 404

    def test_health_check_available(self, queue_client: tuple[_FakeQueue, TestClient]) -> None:
        _, client = queue_client
        assert client.get("/docs").status_code == 200
