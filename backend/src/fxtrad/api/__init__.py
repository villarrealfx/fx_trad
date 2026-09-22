"""Módulo api: exposición REST del backend (ADR-002).

Concentra las rutas HTTP consumidas por el frontend. Expone ``POST /downloads``
(TASK-003, RF-001), ``GET /downloads/{task_id}`` (TASK-006) y ``GET /series``
(TASK-021, RX-002); el resto de endpoints llega en fases posteriores del
pipeline SDD.
"""

from __future__ import annotations

from fxtrad.api.app import create_app

__all__ = ["create_app"]
