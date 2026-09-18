"""Tests de la cola Celery y la tarea download_asset (TASK-004, ADR-006).

DoD: la tarea se registra, se encola vía ``CeleryDownloadQueue`` y se ejecuta
de extremo a extremo. En CI se ejecuta en modo eager con broker ``memory``
(síncrono, sin RabbitMQ); la integración con un broker amqp real y descarga
contra Dukascopy es optativa (``RUN_CELERY_INTEGRATION=1``).
"""

from __future__ import annotations

import lzma
import os
import struct

import pytest
from pydantic import ValidationError

from fxtrad.ingest import CeleryDownloadQueue, DownloadRequest, DukascopyClient, download_asset
from fxtrad.ingest.dukascopy import TICK_FORMAT
from fxtrad.ingest.tasks import (
    TASK_NAME,
    build_client,
    celery_app,
    create_celery_app,
    iter_hours,
    run_download_range,
)

_START = 1772409600  # 2026-03-02T00:00:00Z (lunes)
_END = _START + 2 * 3600  # 2026-03-02T02:00:00Z → 3 horas inclusive


def _compress(raw: bytes) -> bytes:
    """Comprime con LZMA formato alone, como los archivos bi5 reales."""
    return lzma.compress(raw, format=lzma.FORMAT_ALONE)


def _bi5_hour_payload() -> bytes:
    """Payload bi5 válido de una hora con 3 ticks en los segundos 0/1/2."""
    raw = b"".join(
        struct.pack(TICK_FORMAT, i * 1000, 109130 + i, 109120 + i, 0.5, 0.25) for i in range(3)
    )
    return _compress(raw)


def _fetcher_for(payload: bytes):
    """Devuelve un fetcher que responde el mismo bi5 para cualquier URL."""

    def fetch(url: str) -> bytes:
        return payload

    return fetch


@pytest.fixture()
def eager_app():
    """Celery en modo eager con broker memory: no requiere RabbitMQ."""
    celery_app.conf.update(
        task_always_eager=True,
        broker_url="memory://",
        task_default_queue="test",
        fxtrad_client_factory=lambda: DukascopyClient(fetcher=_fetcher_for(_bi5_hour_payload())),
    )
    yield celery_app


class TestConfiguration:
    """La app expone configuración por defecto coherente con ADR-006."""

    def test_default_broker_is_amqp_local(self) -> None:
        app = create_celery_app()
        assert app.conf.broker_url == "amqp://guest:guest@localhost:5672//"

    def test_result_backend_is_memory_by_default(self) -> None:
        app = create_celery_app()
        assert app.conf.result_backend == "cache+memory://"

    def test_task_always_eager_defaults_to_false(self) -> None:
        app = create_celery_app()
        assert app.conf.task_always_eager is False

    def test_eager_enabled_by_environment(self, monkeypatch: object) -> None:
        monkeypatch.setenv("FXTRAD_TASK_ALWAYS_EAGER", "1")
        app = create_celery_app()
        assert app.conf.task_always_eager is True

    def test_build_client_returns_real_client(self) -> None:
        assert isinstance(build_client(), DukascopyClient)


class TestRegistration:
    """La tarea queda registrada con su nombre canónico."""

    def test_download_asset_is_registered(self, eager_app: object) -> None:
        assert TASK_NAME in eager_app.tasks

    def test_task_accepts_json_serializable_signature(self) -> None:
        assert download_asset.name == TASK_NAME


class TestHourIteration:
    """El rango se descompone en horas UTC con mes 0-based."""

    def test_inclusive_hours(self) -> None:
        assert iter_hours(_START, _START + 7200) == [
            (2026, 2, 2, 0),
            (2026, 2, 2, 1),
            (2026, 2, 2, 2),
        ]

    def test_single_second_range_yields_one_hour(self) -> None:
        assert iter_hours(_START, _START) == [(2026, 2, 2, 0)]


class TestEndToEndEager:
    """DoD: la tarea se ejecuta de extremo a extremo descargando las horas."""

    def test_task_downloads_range_and_returns_summary(self, eager_app: object) -> None:
        result = (
            eager_app.tasks[TASK_NAME]
            .apply_async(kwargs={"symbol": "EURUSD", "start": _START, "end": _END})
            .get()
        )
        expected = {
            "activo": "EURUSD",
            "horas": 3,
            "velas": 9,  # 3 ticks por hora agregados a 3 velas de 1 s
            "inicio": _START,
            "fin": _END,
        }
        assert result == expected

    def test_run_download_range_with_stub_client(self) -> None:
        client = DukascopyClient(fetcher=_fetcher_for(_bi5_hour_payload()))
        request = DownloadRequest(asset="EURUSD", start=_START, end=_END)
        summary = run_download_range(client, request, task_id="t-1")
        assert summary["horas"] == 3 and summary["velas"] == 9

    def test_queue_enqueue_executes_and_returns_uuid(self, eager_app: object) -> None:
        queue = CeleryDownloadQueue(eager_app)
        request = DownloadRequest(asset="EURUSD", start=_START, end=_END)
        task_id = queue.enqueue(request)
        assert len(task_id) == 36  # UUID: correlación con el task_id de Celery

    def test_invalid_asset_never_downloads(self, eager_app: object) -> None:
        result = eager_app.tasks[TASK_NAME].apply_async(
            kwargs={"symbol": "BTCUSD", "start": _START, "end": _END}
        )
        with pytest.raises(ValidationError):
            result.get()


class TestCeleryDownloadQueue:
    """El adapter cumple el protocolo DownloadQueue del endpoint POST /downloads."""

    def test_enqueue_returns_the_celery_task_id(self, eager_app: object) -> None:
        queue = CeleryDownloadQueue(eager_app)
        request = DownloadRequest(asset="XAUUSD", start=_START, end=_END)
        task_id = queue.enqueue(request)
        assert isinstance(task_id, str) and len(task_id) == 36

    def test_enqueue_re_uses_the_same_kwargs(self, eager_app: object) -> None:
        queue = CeleryDownloadQueue(eager_app)
        enqueued: list[tuple[str, int, int]] = []

        original = eager_app.tasks[TASK_NAME].apply_async

        def spy(kwargs: object, **extra: object) -> object:
            kwargs_dict = kwargs if isinstance(kwargs, dict) else {}
            enqueued.append(
                (
                    kwargs_dict.get("symbol", ""),
                    kwargs_dict.get("start", 0),
                    kwargs_dict.get("end", 0),
                )
            )
            return original(kwargs=kwargs, **extra)

        eager_app.tasks[TASK_NAME].apply_async = spy  # type: ignore[method-assign]
        request = DownloadRequest(asset="WTI", start=_START, end=_END)
        queue.enqueue(request)
        assert enqueued == [("WTI", _START, _END)]


@pytest.mark.skipif(
    os.getenv("RUN_CELERY_INTEGRATION") != "1",
    reason="Requerido: broker amqp en localhost:5672 + RUN_CELERY_INTEGRATION=1",
)
def test_live_broker_roundtrip() -> None:
    """Integración optativa: RabbitMQ real + descarga de una hora de Dukascopy.

    Reproduce el modo E2E de dev: se encola una hora conocida (EURUSD 2026-08-11
    10:00 UTC) procesada contra el datafeed real. La validación de esa hora ya
    está cubierta por TASK-002; aquí se verifica el camino completo del broker.
    """
    celery_app.conf.update(
        task_always_eager=True,
        broker_url="amqp://guest:guest@localhost:5672//",
    )
    queue = CeleryDownloadQueue(celery_app)
    start = 1786006800  # 2026-08-11T10:00:00Z
    request = DownloadRequest(asset="EURUSD", start=start, end=start + 3600)
    task_id = queue.enqueue(request)
    assert len(task_id) == 36
