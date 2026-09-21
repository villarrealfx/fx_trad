"""Tests de la cola Celery y la tarea download_asset (TASK-004, ADR-006).

DoD: la tarea se registra, se encola vía ``CeleryDownloadQueue`` y se ejecuta
de extremo a extremo. En CI se ejecuta en modo eager con broker ``memory``
(síncrono, sin RabbitMQ); la integración con un broker amqp real y descarga
contra Dukascopy es optativa (``RUN_CELERY_INTEGRATION=1``).
"""

from __future__ import annotations

import os
from datetime import datetime

import pandas as pd
import pytest
from pydantic import ValidationError

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest import CeleryDownloadQueue, DownloadRequest, FreeservClient, download_asset
from fxtrad.ingest.tasks import (
    TASK_NAME,
    CeleryDownloadStatus,
    RetryPolicy,
    build_client,
    celery_app,
    create_celery_app,
    iter_hours,
    run_download_range,
)

_START = 1772409600  # 2026-03-02T00:00:00Z (lunes)
_END = _START + 2 * 3600  # 2026-03-02T02:00:00Z → 3 horas inclusive


def _tick_hour_df(start_ms: int) -> pd.DataFrame:
    """DataFrame de una hora con 3 ticks en los segundos 0/1/2 (forma fetch)."""
    records = [
        {
            "timestamp": pd.to_datetime(start_ms + second * 1000, unit="ms", utc=True),
            "bidPrice": 1.09120 + second / 10000,
            "askPrice": 1.09130 + second / 10000,
            "bidVolume": 1_000_000.0,
            "askVolume": 1_000_000.0,
        }
        for second in range(3)
    ]
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df.set_index("timestamp")


def _fetcher_for():
    """Devuelve un fetcher que genera 3 ticks en la hora que recibe."""

    def fetch(
        instrument: str,
        interval: str,
        offer_side: str,
        start: datetime,
        end: datetime,
        limit: int | None = None,
    ) -> pd.DataFrame:
        return _tick_hour_df(int(start.timestamp() * 1000))

    return fetch


@pytest.fixture()
def eager_app():
    """Celery en modo eager con broker memory: no requiere RabbitMQ."""
    celery_app.conf.update(
        task_always_eager=True,
        broker_url="memory://",
        result_backend="cache+memory://",
        task_default_queue="test",
        fxtrad_client_factory=lambda: FreeservClient(fetcher=_fetcher_for()),
    )
    yield celery_app


class TestConfiguration:
    """La app expone configuración por defecto coherente con ADR-006."""

    def test_default_broker_is_amqp_local(self) -> None:
        app = create_celery_app()
        assert app.conf.broker_url == "amqp://guest:guest@localhost:5672//"

    def test_result_backend_is_rpc_with_amqp_broker(self) -> None:
        app = create_celery_app()
        assert app.conf.result_backend == "rpc://"

    def test_result_backend_is_memory_with_memory_broker(self, monkeypatch: object) -> None:
        monkeypatch.setenv("FXTRAD_BROKER_URL", "memory://")
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
        assert isinstance(build_client(), FreeservClient)


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
            "estado": "exito",
            "horas_fallidas": 0,
            "fallos_detalle": [],
        }
        assert result == expected

    def test_run_download_range_with_stub_client(self) -> None:
        client = FreeservClient(fetcher=_fetcher_for())
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


class _SelectiveFailClient:
    """Cliente que falla siempre las horas indicadas (fallo HTTP simulado)."""

    def __init__(self, failing_hours: set[int]) -> None:
        self.failing_hours = failing_hours
        self.calls = 0

    def download_hour(
        self, symbol: str, year: int, month_index: int, day: int, hour: int
    ) -> list[Candle]:
        self.calls += 1
        if hour in self.failing_hours:
            raise ConnectionError("HTTP 503 simulado")
        return [
            Candle(
                time=1_772_409_600 + hour * 3600,
                open=1.0912,
                high=1.0913,
                low=1.0911,
                close=1.09125,
            )
        ]


class TestPartialFailures:
    """DoD TASK-005: el estado del resumen queda parcial/fallo con metadatos."""

    @staticmethod
    def _policy() -> RetryPolicy:
        return RetryPolicy(max_attempts=3, backoff_seconds=0.0, sleep=lambda _seconds: None)

    def test_one_failing_hour_yields_partial(self) -> None:
        client = _SelectiveFailClient(failing_hours={1})
        request = DownloadRequest(asset="EURUSD", start=_START, end=_END)
        summary = run_download_range(client, request, task_id="t-partial", policy=self._policy())
        assert summary["estado"] == "parcial"
        assert summary["horas"] == 3
        assert summary["horas_fallidas"] == 1
        assert summary["fallos_detalle"] == [{"year": 2026, "month_index": 2, "day": 2, "hour": 1}]

    def test_all_hours_failing_yields_fallo(self) -> None:
        client = _SelectiveFailClient(failing_hours={0, 1, 2})
        request = DownloadRequest(asset="EURUSD", start=_START, end=_END)
        summary = run_download_range(client, request, task_id="t-fallo", policy=self._policy())
        assert summary["estado"] == "fallo"
        assert summary["horas_fallidas"] == 3
        assert summary["velas"] == 0

    def test_failing_hour_is_retried_before_marking_partial(self) -> None:
        client = _SelectiveFailClient(failing_hours={1})
        request = DownloadRequest(asset="EURUSD", start=_START, end=_END)
        run_download_range(client, request, task_id="t-retry", policy=self._policy())
        assert client.calls == 5  # 2 horas OK + 3 intentos de la hora fallida

    def test_all_successful_hours_yield_exito(self) -> None:
        client = _SelectiveFailClient(failing_hours=set())
        request = DownloadRequest(asset="EURUSD", start=_START, end=_END)
        summary = run_download_range(client, request, task_id="t-ok", policy=self._policy())
        assert summary["estado"] == "exito"
        assert summary["horas_fallidas"] == 0


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


class TestCeleryDownloadStatus:
    """DoD TASK-006: el estado se mapea desde el resultado de Celery."""

    def test_successful_task_reports_exito_with_rows(self, eager_app: object) -> None:
        task_id = CeleryDownloadQueue(eager_app).enqueue(
            DownloadRequest(asset="EURUSD", start=_START, end=_END)
        )
        info = CeleryDownloadStatus(eager_app).get(task_id)
        assert info.estado == "exito"
        assert info.filas == 9  # 3 horas × 3 velas del fetcher stub

    def test_failed_task_reports_fallo_with_zero_rows(self, eager_app: object) -> None:
        task_id = (
            eager_app.tasks[TASK_NAME]
            .apply_async(kwargs={"symbol": "BTCUSD", "start": _START, "end": _END})
            .id
        )
        info = CeleryDownloadStatus(eager_app).get(task_id)
        assert info.estado == "fallo"
        assert info.filas == 0

    def test_unknown_task_reports_encolada_with_zero_rows(self, eager_app: object) -> None:
        info = CeleryDownloadStatus(eager_app).get("no-existe-tarea")
        assert info.estado == "encolada"
        assert info.filas == 0

    def test_echoes_the_queryed_task_id(self, eager_app: object) -> None:
        task_id = (
            eager_app.tasks[TASK_NAME]
            .apply_async(kwargs={"symbol": "EURUSD", "start": _START, "end": _END})
            .id
        )
        info = CeleryDownloadStatus(eager_app).get(task_id)
        assert info.task_id == task_id


@pytest.mark.skipif(
    os.getenv("RUN_CELERY_INTEGRATION") != "1",
    reason="Requerido: broker amqp en localhost:5672 + RUN_CELERY_INTEGRATION=1",
)
def test_live_broker_roundtrip() -> None:
    """Integración optativa: RabbitMQ real + descarga de una hora de Dukascopy.

    Reproduce el modo E2E de dev: se encola una hora conocida (EURUSD 2026-08-11
    10:00 UTC) procesada contra la API chart freeserv (ADR-010). La validación
    de esa hora ya está cubierta por TASK-002; aquí se verifica el camino
    completo del broker.
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
