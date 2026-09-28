"""Tareas Celery de descarga de datos (RF-001, RF-006, RX-001; ADR-006).

TASK-004 implementa con Celery + RabbitMQ el contrato ``DownloadQueue`` que el
endpoint ``POST /downloads`` (TASK-003) usa como única vía de acoplamiento:
se encola ``download_asset`` y se devuelve el ``task_id`` inmediatamente; el
worker descarga el rango por bloques (TASK-052/054/056) y devuelve un resumen.
TASK-055 aporta el retry/backoff de 20 s por bloque (R-001) y el resumen queda
en estado ``exito``/``parcial``/``fallo``.

TASK-050 cierra el ciclo: al concluir, las velas descargadas se guardan en la
base local (fusión incremental) y la descarga queda registrada en los metadatos,
que es lo que exige RF-006. La persistencia se inyecta como puerto
(``DownloadPersister``, módulo ``pipeline``) siguiendo la misma vía de
acoplamiento que el cliente de descarga: ``ingest`` no importa ``storage``
(``architecture.md`` §4), solo consume el persistidor.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Any, cast

import structlog
from celery import Celery  # type: ignore[import-untyped]
from celery.result import AsyncResult  # type: ignore[import-untyped]
from structlog.typing import FilteringBoundLogger

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest.batches import plan_batches
from fxtrad.ingest.freeserv import FreeservClient
from fxtrad.ingest.pacing import DEFAULT_PAUSE_SECONDS, download_blocks
from fxtrad.ingest.planner import DownloadBlock
from fxtrad.ingest.requests import DownloadRequest
from fxtrad.ingest.resume import pending_ranges
from fxtrad.ingest.retry import (
    BlockDownloadError,
    DownloadStatus,
    RetryPolicy,
    download_status,
    retry_download_block,
)
from fxtrad.ingest.status import DownloadInfo
from fxtrad.logging_config import configure_logging, connect_celery_signals
from fxtrad.pipeline.persist import DownloadPersister, build_persister

logger = structlog.get_logger()

TASK_NAME = "ingest.download_asset"
"""Nombre canónico de la tarea de descarga (vía ``send_task`` o worker)."""

_DEFAULT_BROKER_URL = "amqp://guest:guest@localhost:5672//"


def _env_bool(name: str, default: bool) -> bool:
    """Lee una variable de entorno como booleano (valores 1/true/yes/on)."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def build_client() -> FreeservClient:
    """Construye el cliente de descarga real; inyectable en las pruebas."""
    return FreeservClient()


def _default_result_backend(broker_url: str) -> str:
    """Devuelve el result backend coherente con el broker indicado.

    Con ``amqp`` (RabbitMQ) se usa ``rpc://``: el worker y la API corren en
    procesos distintos y deben compartir resultados para el GET de estado
    (TASK-006). Con transportes en memoria (tests/CI) basta ``cache+memory``.
    """
    if broker_url.startswith("amqp"):
        return "rpc://"
    return "cache+memory://"


def create_celery_app() -> Celery:
    """Crea la aplicación Celery configurada por variables de entorno.

    ``FXTRAD_BROKER_URL`` define el broker amqp (default RabbitMQ local).
    ``FXTRAD_RESULT_BACKEND`` define dónde se guardan los resultados (default
    ``rpc://`` con RabbitMQ —compartido entre worker y API para TASK-006—; si no,
    ``cache+memory`` para tests).
    ``FXTRAD_TASK_ALWAYS_EAGER=1`` ejecuta las tareas síncronas, útil en tests
    y CI donde no hay broker levantado.

    ``fxtrad_client_factory`` y ``fxtrad_persister_factory`` son las dos factorías
    inyectables: la primera construye el cliente de Dukascopy y la segunda el
    persistidor sobre ``FXTRAD_DATA_DIR`` (TASK-050). Los tests sustituyen ambas
    por dobles sin tocar la red ni el disco del repositorio.
    """
    broker_url = os.getenv("FXTRAD_BROKER_URL", _DEFAULT_BROKER_URL)
    app = Celery("fxtrad", broker=broker_url)
    app.conf.update(
        result_backend=os.getenv("FXTRAD_RESULT_BACKEND", _default_result_backend(broker_url)),
        task_always_eager=_env_bool("FXTRAD_TASK_ALWAYS_EAGER", False),
        task_store_eager_result=True,
        task_track_started=True,
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        fxtrad_client_factory=build_client,
        fxtrad_persister_factory=build_persister,
    )
    return app


celery_app = create_celery_app()
"""Instancia única de la aplicación Celery del módulo ingest."""

configure_logging()
"""Configura el logging estructurado al importar el worker (TASK-041)."""

connect_celery_signals()
"""Correlaciona los logs de cada tarea con su ``task_id`` (TASK-041)."""


def _persist_download(
    persister: DownloadPersister,
    request: DownloadRequest,
    candles: list[Candle],
    status: DownloadStatus,
    scoped: FilteringBoundLogger,
) -> DownloadStatus:
    """Guarda la descarga y degrada el estado si el almacenamiento falla.

    Un fallo al escribir no puede quedarse en silencio: se registra en el log y
    el resumen pasa a ``fallo``, que es lo que ven tanto
    ``GET /downloads/{task_id}`` como el historial (RF-006, RI-002).

    Args:
        persister: Puerto de persistencia inyectado en la tarea.
        request: Solicitud de la descarga, para el rango del metadato.
        candles: Velas de 1 m obtenidas por la descarga.
        status: Estado de la descarga según los bloques descargados.
        scoped: Logger enlazado al ``task_id`` para correlación.

    Returns:
        El estado persistido, o ``fallo`` si la escritura no se pudo completar.
    """
    try:
        persister.persist(
            request.asset,
            candles,
            start=request.start,
            end=request.end,
            status=status,
        )
    except Exception as error:  # se reporta y degrada el estado; no se propaga
        scoped.error(
            "persistencia_fallida",
            activo=request.asset,
            inicio=request.start,
            fin=request.end,
            error=str(error),
        )
        return "fallo"
    return status


def run_download_range(
    client: FreeservClient,
    request: DownloadRequest,
    task_id: str | None = None,
    policy: RetryPolicy | None = None,
    persister: DownloadPersister | None = None,
) -> dict[str, object]:
    """Descarga el rango por bloques, lo persiste y devuelve el resumen.

    El rango se planifica en **tandas** de 6–12 meses (TASK-064, ADR-015); cada
    tanda se parte en bloques de ≤ 30.000 velas (TASK-052) y cada bloque se
    descarga con reintentos y backoff (TASK-055), con el pacing de 20 s entre
    bloques (TASK-054). Un bloque que agota los reintentos no aborta el rango: se
    registra en ``fallos_detalle`` y el resumen queda en ``parcial`` o ``fallo``
    (ADR-013). El resumen reporta, por tanda, bloques completados/total.

    Con ``persister`` (lo inyecta la tarea Celery) el resultado se guarda en la
    base local al concluir: fusión incremental de la serie más el registro de
    metadatos, que es lo que exige RF-006. Sin persistidor la función solo
    descarga, que es lo que necesitan las pruebas de la cola (TASK-004).

    Args:
        client: Cliente Dukascopy (en producción llega de la factoría).
        request: Solicitud validada de la descarga.
        task_id: Id de la tarea Celery, para correlación en los logs.
        policy: Política de reintentos y pacing; por defecto ``RetryPolicy()``.
        persister: Puerto de persistencia; ``None`` no guarda nada.

    Returns:
        Resumen con activo, tandas (progreso), bloques, velas, rango, estado y
        bloques fallidos.
    """
    retry_policy = policy if policy is not None else RetryPolicy()
    scoped = logger.bind(task_id=task_id) if task_id else logger
    scoped.info(
        "descarga_rango_iniciada",
        activo=request.asset,
        inicio=request.start,
        fin=request.end,
    )
    batches = plan_batches(request.start, request.end)
    candles: list[Candle] = []
    all_failures: list[DownloadBlock] = []
    reports: list[dict[str, int | str]] = []
    total_blocks = 0
    for batch in batches:
        blocks = list(batch.blocks)
        failures: list[DownloadBlock] = []

        def download_block(
            block: DownloadBlock, _failures: list[DownloadBlock] = failures
        ) -> list[Candle]:
            """Descarga un bloque con reintentos; registra el fallo sin abortar."""
            try:
                return retry_download_block(client, request.asset, block, retry_policy)
            except BlockDownloadError:
                _failures.append(block)
                return []

        candles.extend(
            download_blocks(
                blocks,
                download_block,
                pause_seconds=DEFAULT_PAUSE_SECONDS,
                sleep=retry_policy.sleep,
            )
        )
        all_failures.extend(failures)
        total_blocks += len(blocks)
        reports.append(
            {
                "inicio": batch.start,
                "fin": batch.end,
                "bloques": len(blocks),
                "bloques_fallidos": len(failures),
                "estado": download_status(len(blocks), len(failures)),
            }
        )

    status = download_status(total_blocks, len(all_failures))
    failures_detail = [{"inicio": block.start, "fin": block.end} for block in all_failures]
    scoped.info(
        "descarga_rango_completada",
        activo=request.asset,
        tandas=len(batches),
        bloques=total_blocks,
        velas=len(candles),
        estado=status,
        bloques_fallidos=len(all_failures),
    )
    if all_failures:
        scoped.warning(
            "descarga_rango_parcial",
            activo=request.asset,
            bloques_fallidos=len(all_failures),
            detalle=failures_detail,
        )
    if persister is not None:
        status = _persist_download(persister, request, candles, status, scoped)
    return {
        "activo": request.asset,
        "tandas": reports,
        "bloques": total_blocks,
        "velas": len(candles),
        "inicio": request.start,
        "fin": request.end,
        "estado": status,
        "bloques_fallidos": len(all_failures),
        "fallos_detalle": failures_detail,
    }


def resume_download(
    client: FreeservClient,
    request: DownloadRequest,
    previous_summary: Mapping[str, object],
    policy: RetryPolicy | None = None,
    persister: DownloadPersister | None = None,
) -> dict[str, object]:
    """Descarga los rangos pendientes de una descarga parcial y los fusiona.

    Los pendientes salen de ``fallos_detalle`` del resumen previo (TASK-056),
    recortados al rango solicitado y coalescidos (TASK-065). Cada rango se
    descarga con ``run_download_range`` (tandas/bloques/pacing/retry) y se fusiona
    con el persistidor (upsert por ``time``, KPI-4), por lo que reanudar no
    duplica filas ya almacenadas. Si no hay pendientes, no se descarga ni escribe.

    Args:
        client: Cliente Dukascopy (en producción llega de la factoría).
        request: Solicitud original de la descarga.
        previous_summary: Resumen de la descarga previa (con ``fallos_detalle``).
        policy: Política de reintentos y pacing; por defecto ``RetryPolicy()``.
        persister: Puerto de persistencia; ``None`` no guarda nada.

    Returns:
        Resumen agregado con ``reanudado`` (si hubo pendientes), ``pendientes``,
        ``tandas``, ``bloques``, ``velas``, ``estado`` y ``fallos_detalle``.
    """
    pending = pending_ranges(previous_summary, request.start, request.end)
    if not pending:
        logger.info(
            "reanudacion_sin_pendientes",
            activo=request.asset,
            inicio=request.start,
            fin=request.end,
        )
        return {
            "activo": request.asset,
            "reanudado": False,
            "pendientes": [],
            "tandas": [],
            "bloques": 0,
            "velas": 0,
            "inicio": request.start,
            "fin": request.end,
            "estado": "exito",
            "bloques_fallidos": 0,
            "fallos_detalle": [],
        }
    total_blocks = 0
    total_failures = 0
    total_candles = 0
    tandas: list[dict[str, int | str]] = []
    fallos_detalle: list[dict[str, int]] = []
    for start, end in pending:
        summary = run_download_range(
            client,
            DownloadRequest(asset=request.asset, start=start, end=end),
            policy=policy,
            persister=persister,
        )
        total_blocks += cast(int, summary["bloques"])
        total_failures += cast(int, summary["bloques_fallidos"])
        total_candles += cast(int, summary["velas"])
        tandas.extend(cast(list[dict[str, int | str]], summary["tandas"]))
        fallos_detalle.extend(cast(list[dict[str, int]], summary["fallos_detalle"]))
    status = download_status(total_blocks, total_failures)
    logger.info(
        "reanudacion_completada",
        activo=request.asset,
        pendientes=len(pending),
        velas=total_candles,
        estado=status,
    )
    return {
        "activo": request.asset,
        "reanudado": True,
        "pendientes": [{"inicio": start, "fin": end} for start, end in pending],
        "tandas": tandas,
        "bloques": total_blocks,
        "velas": total_candles,
        "inicio": request.start,
        "fin": request.end,
        "estado": status,
        "bloques_fallidos": total_failures,
        "fallos_detalle": fallos_detalle,
    }


@celery_app.task(name=TASK_NAME, bind=True)  # type: ignore[untyped-decorator]
def download_asset(self: Any, symbol: str, start: int, end: int) -> dict[str, object]:
    """Descarga el rango indicado, lo persiste y devuelve un resumen.

    Los argumentos son serializables (JSON: símbolo + segundos UTC) para que
    la tarea sobreviva al broker. Se re-valida el request en el worker: una
    solicitud inválida nunca se descarga (HU-001).

    El cliente y el persistidor salen de las factorías de la configuración, de
    modo que solo cruzan el broker los tres argumentos del rango (TASK-050).
    """
    request = DownloadRequest(asset=symbol, start=start, end=end)
    client = self.app.conf.fxtrad_client_factory()
    persister = self.app.conf.fxtrad_persister_factory()
    return run_download_range(client, request, task_id=self.request.id, persister=persister)


class CeleryDownloadQueue:
    """Cola de descargas respaldada por Celery (ADR-006, TASK-004).

    Cumple el protocolo ``DownloadQueue`` del endpoint ``POST /downloads``.
    """

    def __init__(self, app: Celery = celery_app) -> None:
        self._app = app

    def enqueue(self, request: DownloadRequest) -> str:
        """Encola ``download_asset`` y devuelve el ``task_id`` de Celery.

        Se usa ``apply_async`` de la tarea registrada (no ``send_task``, que
        ignora el modo eager): así los tests sin broker cubren la misma vía.
        Args:
            request: Solicitud validada de descarga.

        Returns:
            ``task_id`` generado por Celery (UUID como texto).
        """
        result = self._app.tasks[TASK_NAME].apply_async(
            kwargs={
                "symbol": request.asset,
                "start": request.start,
                "end": request.end,
            }
        )
        return str(result.id)


class CeleryDownloadStatus:
    """Consulta de estado de una descarga respaldada por Celery (TASK-006).

    Cumple el protocolo ``DownloadStatusQuery`` del endpoint
    ``GET /downloads/{task_id}``. Lee el ``AsyncResult`` de la tarea: mientras
    la tarea no termina el estado es ``encolada``; al completar, el estado y
    las filas provienen del resumen de la descarga (TASK-005).
    """

    def __init__(self, app: Celery = celery_app) -> None:
        self._app = app

    def get(self, task_id: str) -> DownloadInfo:
        """Devuelve el estado y las filas obtenidas de la tarea indicada.

        Args:
            task_id: Identificador de la tarea cuya descarga se consulta.

        Returns:
            ``DownloadInfo`` con el estado (encolada/éxito/parcial/fallo) y
            las filas obtenidas; una tarea aún no terminada reporta 0 filas.
        """
        result = AsyncResult(task_id, app=self._app)
        if result.state == "SUCCESS":
            payload = result.result or {}
            estado = payload.get("estado", "exito")
            filas = payload.get("velas", 0)
            return DownloadInfo(task_id=task_id, estado=estado, filas=filas)
        if result.state == "FAILURE":
            return DownloadInfo(task_id=task_id, estado="fallo", filas=0)
        return DownloadInfo(task_id=task_id, estado="encolada", filas=0)


__all__ = [
    "CeleryDownloadQueue",
    "CeleryDownloadStatus",
    "RetryPolicy",
    "TASK_NAME",
    "build_client",
    "build_persister",
    "celery_app",
    "create_celery_app",
    "download_asset",
    "run_download_range",
]
