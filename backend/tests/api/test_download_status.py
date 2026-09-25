"""Tests del endpoint GET /downloads/{task_id} (TASK-006, RF-001/HU-002).

DoD: el GET devuelve el estado (encolada/éxito/parcial/fallo) y las filas
obtenidas. La consulta de estado se sustituye por un stub en memoria para no
depender del broker (mismo patrón que POST /downloads con la cola fake).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from fxtrad.api import create_app
from fxtrad.ingest import DownloadInfo

_TASK_ID = "mock-task-006"


class _FakeStatusQuery:
    """Stub de DownloadStatusQuery con resultados por task_id."""

    def __init__(self, records: dict[str, DownloadInfo]) -> None:
        self._records = records

    def get(self, task_id: str) -> DownloadInfo:
        if task_id in self._records:
            return self._records[task_id]
        return DownloadInfo(task_id=task_id, estado="encolada", filas=0)


class _FakeQueue:
    """Stub mínimo de DownloadQueue necesario para crear la aplicación."""

    def enqueue(self, request: object) -> str:
        return _TASK_ID


@pytest.fixture()
def client() -> TestClient:
    """Cliente HTTP montado sobre la app con un stub de consulta de estado."""
    records = {
        _TASK_ID: DownloadInfo(task_id=_TASK_ID, estado="parcial", filas=12_000),
    }
    app = create_app(_FakeQueue(), _FakeStatusQuery(records))
    return TestClient(app)


class TestGetDownloadStatus:
    """DoD: el GET devuelve estado y filas obtenidas de la descarga."""

    def test_returns_200_with_state_and_rows(self, client: TestClient) -> None:
        response = client.get(f"/downloads/{_TASK_ID}")
        assert response.status_code == 200
        assert response.json() == {
            "task_id": _TASK_ID,
            "estado": "parcial",
            "filas": 12_000,
        }

    def test_reports_encolada_for_unknown_task(self, client: TestClient) -> None:
        response = client.get("/downloads/task-sin-registrar")
        assert response.status_code == 200
        assert response.json() == {
            "task_id": "task-sin-registrar",
            "estado": "encolada",
            "filas": 0,
        }

    def test_estado_comes_from_the_query(self, client: TestClient) -> None:
        for state in ("encolada", "exito", "parcial", "fallo"):
            status_query = _FakeStatusQuery(
                {_TASK_ID: DownloadInfo(task_id=_TASK_ID, estado=state, filas=0)}
            )
            app = create_app(_FakeQueue(), status_query)
            response = TestClient(app).get(f"/downloads/{_TASK_ID}")
            assert response.json()["estado"] == state

    def test_rows_are_zero_while_enqueued(self, client: TestClient) -> None:
        status_query = _FakeStatusQuery(
            {_TASK_ID: DownloadInfo(task_id=_TASK_ID, estado="encolada", filas=0)}
        )
        app = create_app(_FakeQueue(), status_query)
        response = TestClient(app).get(f"/downloads/{_TASK_ID}")
        assert response.json()["filas"] == 0


class TestRouting:
    """El recurso solo responde al path y método definidos."""

    def test_trailing_slash_redirects_to_history(self, client: TestClient) -> None:
        response = client.get("/downloads/", follow_redirects=False)
        assert response.status_code == 307
        assert response.headers["location"].endswith("/downloads")

    def test_post_status_path_is_not_allowed(self, client: TestClient) -> None:
        response = client.post(f"/downloads/{_TASK_ID}")
        assert response.status_code == 405
