"""Tests del factory de producción de la app (TASK-038, ADR-009).

``create_default_app`` es el punto de entrada sin argumentos que usa Uvicorn en
el compose: compone la cola real de Celery y las consultas por defecto. Se
verifica sin broker ni datos reales, aislando ``FXTRAD_DATA_DIR`` en ``tmp_path``.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import FastAPI

from fxtrad.api.app import create_default_app


class TestDefaultAppFactory:
    """El factory de producción construye la app con las rutas de la API."""

    def test_builds_the_app_with_the_public_routes(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("FXTRAD_DATA_DIR", str(tmp_path))

        app = create_default_app()

        assert isinstance(app, FastAPI)
        paths = set(app.openapi()["paths"])
        assert {"/downloads", "/downloads/{task_id}", "/assets", "/series"} <= paths

    def test_uses_the_configured_data_directory(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("FXTRAD_DATA_DIR", str(tmp_path))

        create_default_app()

        assert (tmp_path / "downloads.duckdb").is_file()
