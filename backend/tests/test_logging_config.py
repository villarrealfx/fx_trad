"""Tests del logging estructurado y la correlación Celery (TASK-041, ADR-008).

Verifican el contrato de `_docs/logging-contract.md` sobre la salida real:
formato JSON con `timestamp`, `level`, `service`, `module` y contexto, el
filtrado por nivel y la correlación del `task_id` de Celery en los logs.
"""

from __future__ import annotations

import json

import pytest
import structlog
from celery import signals

from fxtrad.logging_config import configure_logging, connect_celery_signals


def last_json(out: str) -> dict[str, object]:
    """Devuelve el último evento JSON emitido en la salida capturada."""
    lines = [line for line in out.strip().splitlines() if line.strip()]
    return json.loads(lines[-1])


class TestStructuredOutput:
    """El contrato de logging se cumple en la salida (RNF-007)."""

    def test_json_event_has_the_contract_fields(self, capsys: pytest.CaptureFixture[str]) -> None:
        configure_logging(json=True, level="INFO", service="fxtrad-test")

        structlog.get_logger().info("evento_prueba", activo="EURUSD", filas=3)

        payload = last_json(capsys.readouterr().out)
        assert payload["message"] == "evento_prueba"
        assert payload["level"] == "info"
        assert payload["service"] == "fxtrad-test"
        assert payload["activo"] == "EURUSD"
        assert payload["filas"] == 3
        assert str(payload["module"]).endswith("test_logging_config")
        assert str(payload["timestamp"]).startswith("20")

    def test_dev_output_is_plain_text(self, capsys: pytest.CaptureFixture[str]) -> None:
        configure_logging(json=False, level="INFO")

        structlog.get_logger().info("evento_dev")

        out = capsys.readouterr().out
        assert "evento_dev" in out
        assert not out.strip().startswith("{")

    def test_level_filters_lower_events(self, capsys: pytest.CaptureFixture[str]) -> None:
        configure_logging(json=True, level="WARNING")

        logger = structlog.get_logger()
        logger.info("no_emitido")
        logger.warning("si_emitido")

        out = capsys.readouterr().out
        assert "no_emitido" not in out
        assert "si_emitido" in out

    def test_environment_configures_service_and_level(
        self, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
    ) -> None:
        monkeypatch.setenv("LOG_JSON", "true")
        monkeypatch.setenv("LOG_LEVEL", "ERROR")
        monkeypatch.setenv("SERVICE_NAME", "fxtrad-api")

        configure_logging()
        logger = structlog.get_logger()
        logger.warning("filtrado")
        logger.error("emitido")

        out = capsys.readouterr().out
        assert "filtrado" not in out
        payload = last_json(out)
        assert payload["service"] == "fxtrad-api"
        assert payload["level"] == "error"


class TestCeleryCorrelation:
    """Los logs dentro de una tarea llevan su `task_id` sin bindear a mano."""

    def test_prerun_binds_task_id_and_postrun_clears_it(
        self, capsys: pytest.CaptureFixture[str]
    ) -> None:
        configure_logging(json=True, level="INFO")
        connect_celery_signals()
        logger = structlog.get_logger()

        signals.task_prerun.send(sender=None, task_id="task-123")
        logger.info("dentro_tarea")
        inside = last_json(capsys.readouterr().out)
        assert inside["task_id"] == "task-123"
        assert inside["correlation_id"] == "task-123"

        signals.task_postrun.send(sender=None, task_id="task-123")
        logger.info("fuera_tarea")
        outside = last_json(capsys.readouterr().out)
        assert "task_id" not in outside
        assert "correlation_id" not in outside

    def test_failure_clears_the_correlation(self, capsys: pytest.CaptureFixture[str]) -> None:
        configure_logging(json=True, level="INFO")
        connect_celery_signals()
        logger = structlog.get_logger()

        signals.task_prerun.send(sender=None, task_id="task-9")
        signals.task_failure.send(sender=None, task_id="task-9")
        logger.info("tras_fallo")

        payload = last_json(capsys.readouterr().out)
        assert "task_id" not in payload
