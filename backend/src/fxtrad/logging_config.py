"""Configuración de logging estructurado y correlación (TASK-041, ADR-008).

Centraliza en un solo punto la configuración de ``structlog`` que el contrato
``_docs/logging-contract.md`` exige: formato JSON en producción (o texto en
desarrollo), nivel por entorno, ``service``, ``timestamp`` ISO-8601 UTC y el
``module`` del punto de emisión. Además conecta las señales de Celery para
correlacionar todos los logs de una tarea con su ``task_id`` sin tener que
bindearlo a mano en cada llamada.

Variables de entorno:

- ``LOG_JSON``: ``1/true/yes/on`` activa la salida JSON (por defecto, texto).
- ``LOG_LEVEL``: nivel mínimo (``DEBUG``…``CRITICAL``; por defecto ``INFO``).
- ``SERVICE_NAME``: campo ``service`` de cada evento (por defecto
  ``fxtrad-backend``).
"""

from __future__ import annotations

import logging
import os
from collections.abc import Callable
from typing import Any

import structlog
from structlog.processors import CallsiteParameter, CallsiteParameterAdder
from structlog.typing import EventDict, WrappedLogger

DEFAULT_SERVICE = "fxtrad-backend"
"""Nombre de servicio por defecto del campo ``service`` (logging-contract)."""

DEFAULT_LEVEL = "INFO"
"""Nivel de log por defecto si ``LOG_LEVEL`` no está definido."""

_SIGNALS_CONNECTED = False
"""Evita reconectar las señales de Celery en llamadas repetidas."""


def _env_bool(name: str, default: bool) -> bool:
    """Lee una variable de entorno como booleano (1/true/yes/on)."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def _level_value(name: str) -> int:
    """Traduce un nombre de nivel a su valor numérico (fallback a INFO)."""
    value = logging.getLevelName(name.upper())
    return value if isinstance(value, int) else logging.INFO


def _add_service(service: str) -> Callable[[WrappedLogger, str, EventDict], EventDict]:
    """Crea un procesador que añade el campo ``service`` si falta."""

    def processor(logger: WrappedLogger, method_name: str, event_dict: EventDict) -> EventDict:
        event_dict.setdefault("service", service)
        return event_dict

    return processor


def configure_logging(
    *,
    json: bool | None = None,
    level: str | None = None,
    service: str | None = None,
) -> None:
    """Configura ``structlog`` según el contrato de logging (ADR-008).

    Args:
        json: Fuerza salida JSON; si es ``None`` se lee ``LOG_JSON``.
        level: Nivel mínimo; si es ``None`` se lee ``LOG_LEVEL`` (default INFO).
        service: Campo ``service``; si es ``None`` se lee ``SERVICE_NAME``.
    """
    use_json = json if json is not None else _env_bool("LOG_JSON", False)
    level_name = level or os.getenv("LOG_LEVEL") or DEFAULT_LEVEL
    service_name = service or os.getenv("SERVICE_NAME") or DEFAULT_SERVICE
    renderer: Any = (
        structlog.processors.JSONRenderer()
        if use_json
        else structlog.dev.ConsoleRenderer(colors=False)
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True, key="timestamp"),
            CallsiteParameterAdder([CallsiteParameter.MODULE]),
            _add_service(service_name),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.EventRenamer("message"),
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(_level_value(level_name)),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=False,
        context_class=dict,
    )


def _bind_task_context(task_id: str | None = None, **kwargs: object) -> None:
    """Bindea ``task_id`` y ``correlation_id`` al contexto de la tarea Celery."""
    if task_id:
        structlog.contextvars.bind_contextvars(task_id=task_id, correlation_id=task_id)


def _clear_task_context(**kwargs: object) -> None:
    """Limpia la correlación al terminar (o fallar) la tarea Celery."""
    structlog.contextvars.unbind_contextvars("task_id", "correlation_id")


def connect_celery_signals() -> None:
    """Conecta las señales de Celery que correlacionan los logs de una tarea.

    ``task_prerun`` bindea el ``task_id`` (y lo replica como ``correlation_id``)
    en las ``contextvars`` de structlog; ``task_postrun`` y ``task_failure`` lo
    limpian. Idempotente: reconectar no duplica receptores.
    """
    global _SIGNALS_CONNECTED
    if _SIGNALS_CONNECTED:
        return
    # Import local: evita el coste de importar Celery si no hay worker.
    from celery import signals  # type: ignore[import-untyped]

    signals.task_prerun.connect(_bind_task_context, weak=False)
    signals.task_postrun.connect(_clear_task_context, weak=False)
    signals.task_failure.connect(_clear_task_context, weak=False)
    _SIGNALS_CONNECTED = True


__all__ = ["configure_logging", "connect_celery_signals", "DEFAULT_LEVEL", "DEFAULT_SERVICE"]
