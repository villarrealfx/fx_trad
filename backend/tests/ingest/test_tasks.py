"""Tests de la cola Celery y la tarea download_asset (TASK-004/TASK-056, ADR-006).

DoD: la tarea se registra, se encola vía ``CeleryDownloadQueue`` y se ejecuta de
extremo a extremo. En CI se ejecuta en modo eager con broker ``memory``
(síncrono, sin RabbitMQ); la integración con un broker amqp real y descarga
contra Dukascopy es optativa (``RUN_CELERY_INTEGRATION=1``).

TASK-056 integra el planificador de bloques (TASK-052), el pacing (TASK-054) y
el retry por bloque (TASK-055) en ``run_download_range``: el rango se descarga en
bloques de ≤ 30.000 velas y un bloque fallido no aborta el rango. TASK-050
mantiene que la tarea deje la descarga en la base local (persistidor inyectado);
todos los tests escriben en ``tmp_path``, nunca en ``backend/data``.
"""

from __future__ import annotations

import os
from collections.abc import Sequence
from datetime import datetime
from pathlib import Path
from typing import cast

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
from fxtrad.pipeline.persist import DownloadPersister, build_persister
from fxtrad.storage import DownloadMetadataStore, ParquetSeriesStore

_START = 1772409600  # 2026-03-02T00:00:00Z (lunes)
_END = _START + 2 * 3600  # 2026-03-02T02:00:00Z
_MINUTES_3H = 121  # velas de 1 m del rango _START.._END (inclusivo)


def _ohlc_df(rows: list[tuple[int, float, float, float, float]]) -> pd.DataFrame:
    """DataFrame OHLC con la forma de ``dukascopy_python.fetch`` (intervalos OHLC)."""
    records = [
        {
            "timestamp": pd.to_datetime(ts, unit="s", utc=True),
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
        }
        for ts, open_, high, low, close in rows
    ]
    if not records:
        return pd.DataFrame(columns=["open", "high", "low", "close"]).set_index(
            pd.DatetimeIndex([], name="timestamp")
        )
    return pd.DataFrame(records).set_index("timestamp")


def _minute_fetcher():
    """Fetcher que devuelve una vela de 1 m por minuto del rango solicitado."""

    def fetch(
        instrument: str,
        interval: str,
        offer_side: str,
        start: datetime,
        end: datetime,
        limit: int | None = None,
    ) -> pd.DataFrame:
        start_s = int(start.timestamp())
        end_s = int(end.timestamp())
        return _ohlc_df([(second, 1.0, 1.0, 1.0, 1.0) for second in range(start_s, end_s + 1, 60)])

    return fetch


def _all_candles(store: ParquetSeriesStore, symbol: str) -> list[Candle]:
    """Lee la serie completa del activo (independiente de la aritmética del rango)."""
    return store.read_range(symbol, 0, 2**31 - 1)


@pytest.fixture()
def eager_app(tmp_path: Path):
    """Celery en modo eager con broker memory: no requiere RabbitMQ.

    Se sustituyen las dos factorías de la app (TASK-050): el cliente por el
    fetcher OHLC de 1 m de arriba y el persistidor por uno real sobre
    ``tmp_path``. Sin esto la tarea escribiría en ``backend/data``.
    """
    celery_app.conf.update(
        task_always_eager=True,
        broker_url="memory://",
        result_backend="cache+memory://",
        task_default_queue="test",
        fxtrad_client_factory=lambda: FreeservClient(fetcher=_minute_fetcher()),
        fxtrad_persister_factory=lambda: build_persister(tmp_path),
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

    def test_persister_factory_is_wired(self) -> None:
        """La app lleva la factoría real; no se invoca para no crear data/."""
        assert create_celery_app().conf.fxtrad_persister_factory is build_persister


class TestRegistration:
    """La tarea queda registrada con su nombre canónico."""

    def test_download_asset_is_registered(self, eager_app: object) -> None:
        assert TASK_NAME in eager_app.tasks

    def test_task_accepts_json_serializable_signature(self) -> None:
        assert download_asset.name == TASK_NAME


class TestHourIteration:
    """``iter_hours`` se conserva hasta TASK-057; el rango sigue siendo UTC."""

    def test_inclusive_hours(self) -> None:
        assert iter_hours(_START, _START + 7200) == [
            (2026, 2, 2, 0),
            (2026, 2, 2, 1),
            (2026, 2, 2, 2),
        ]

    def test_single_second_range_yields_one_hour(self) -> None:
        assert iter_hours(_START, _START) == [(2026, 2, 2, 0)]


class TestEndToEndEager:
    """DoD: la tarea se ejecuta de extremo a extremo descargando el rango."""

    def test_task_downloads_range_and_returns_summary(self, eager_app: object) -> None:
        result = (
            eager_app.tasks[TASK_NAME]
            .apply_async(kwargs={"symbol": "EURUSD", "start": _START, "end": _END})
            .get()
        )
        expected = {
            "activo": "EURUSD",
            "bloques": 1,
            "velas": _MINUTES_3H,
            "inicio": _START,
            "fin": _END,
            "estado": "exito",
            "bloques_fallidos": 0,
            "fallos_detalle": [],
        }
        assert result == expected

    def test_run_download_range_with_stub_client(self) -> None:
        client = FreeservClient(fetcher=_minute_fetcher())
        request = DownloadRequest(asset="EURUSD", start=_START, end=_END)
        summary = run_download_range(client, request, task_id="t-1")
        assert summary["bloques"] == 1 and summary["velas"] == _MINUTES_3H

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


class _FailingRangeClient:
    """Cliente de rango que siempre falla (para descargas vacías)."""

    def download_range(self, symbol: str, start: datetime, end: datetime) -> list[Candle]:
        raise ConnectionError("HTTP 503 simulado")


class _FailingPersister:
    """Doble que simula un fallo de disco al guardar la descarga."""

    def persist(
        self,
        symbol: str,
        candles: Sequence[Candle],
        *,
        start: int,
        end: int,
        status: str,
        now: datetime | None = None,
    ) -> int:
        raise OSError("disco lleno (simulado)")


class TestDownloadPersistence:
    """TASK-050/TASK-056: la tarea deja la descarga en la base local (RF-006)."""

    def test_task_stores_candles_and_metadata(self, eager_app: object, tmp_path: Path) -> None:
        task_id = CeleryDownloadQueue(eager_app).enqueue(
            DownloadRequest(asset="EURUSD", start=_START, end=_END)
        )
        info = CeleryDownloadStatus(eager_app).get(task_id)

        store = ParquetSeriesStore(tmp_path)
        stored = _all_candles(store, "EURUSD")
        assert len(stored) == _MINUTES_3H
        assert info.estado == "exito"
        record = DownloadMetadataStore(tmp_path).history()[0]
        assert (record.activo, record.filas, record.estado) == ("EURUSD", _MINUTES_3H, "exito")
        assert (record.inicio, record.fin) == (_START, _END)

    def test_repeated_download_completes_the_base(self, eager_app: object, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        queue = CeleryDownloadQueue(eager_app)
        queue.enqueue(DownloadRequest(asset="EURUSD", start=_START, end=_START + 3599))
        first = len(_all_candles(store, "EURUSD"))

        queue.enqueue(DownloadRequest(asset="EURUSD", start=_START + 3600, end=_END))
        total = len(_all_candles(store, "EURUSD"))

        assert (first, total) == (60, 121)  # KPI-4: 0 filas duplicadas
        assert len(DownloadMetadataStore(tmp_path).history()) == 2

    def test_failed_download_records_metadata_without_creating_asset(self, tmp_path: Path) -> None:
        """Descarga vacía: no inventamos el activo, pero el intento queda."""
        client = _FailingRangeClient()
        persister = build_persister(tmp_path)
        policy = RetryPolicy(max_attempts=2, backoff_seconds=0.0, sleep=lambda _s: None)

        summary = run_download_range(
            client,
            DownloadRequest(asset="EURUSD", start=_START, end=_END),
            task_id="t-vacia",
            policy=policy,
            persister=persister,
        )

        assert summary["estado"] == "fallo"
        assert not ParquetSeriesStore(tmp_path).has_series("EURUSD")
        record = DownloadMetadataStore(tmp_path).history()[0]
        assert (record.estado, record.filas) == ("fallo", 0)

    def test_storage_failure_degrades_the_summary_without_raising(self) -> None:
        """Un fallo de escritura se reporta en el resumen, no rompe la tarea."""
        summary = run_download_range(
            FreeservClient(fetcher=_minute_fetcher()),
            DownloadRequest(asset="EURUSD", start=_START, end=_START + 3599),
            task_id="t-error-disco",
            persister=cast(DownloadPersister, _FailingPersister()),
        )

        assert summary["estado"] == "fallo"
        assert summary["velas"] == 60  # la descarga sí se hizo

    def test_task_also_refreshes_the_derived_timeframes(
        self, eager_app: object, tmp_path: Path
    ) -> None:
        """TASK-049: la tarea deja los Parquets derivados al día (RF-009)."""
        CeleryDownloadQueue(eager_app).enqueue(
            DownloadRequest(asset="EURUSD", start=_START, end=_END)
        )
        store = ParquetSeriesStore(tmp_path)

        hourly = store.read_range("EURUSD", 0, 2**31 - 1, "1h")

        assert [candle.time for candle in hourly] == [_START, _START + 3600, _START + 7200]

    def test_without_persister_nothing_is_written(self, tmp_path: Path) -> None:
        """Sin persistidor la función solo descarga (contrato de TASK-004)."""
        summary = run_download_range(
            FreeservClient(fetcher=_minute_fetcher()),
            DownloadRequest(asset="EURUSD", start=_START, end=_START + 3599),
        )

        assert summary["estado"] == "exito"
        assert summary["velas"] == 60
        assert not ParquetSeriesStore(tmp_path).has_series("EURUSD")
        assert DownloadMetadataStore(tmp_path).history() == []


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
        assert info.filas == _MINUTES_3H

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
def test_live_broker_roundtrip(tmp_path: Path) -> None:
    """Integración optativa: RabbitMQ real + descarga de una hora de Dukascopy."""
    celery_app.conf.update(
        task_always_eager=True,
        broker_url="amqp://guest:guest@localhost:5672//",
        fxtrad_persister_factory=lambda: build_persister(tmp_path),
    )
    queue = CeleryDownloadQueue(celery_app)
    start = 1786006800  # 2026-08-11T10:00:00Z
    request = DownloadRequest(asset="EURUSD", start=start, end=start + 3600)
    task_id = queue.enqueue(request)
    assert len(task_id) == 36
