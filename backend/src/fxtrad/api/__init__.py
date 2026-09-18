"""Módulo api: exposición REST del backend (ADR-002).

Concentra las rutas HTTP consumidas por el frontend. En esta fase solo
expone ``POST /downloads`` (TASK-003, RF-001); el resto de endpoints
(RX-002) llega en fases posteriores del pipeline SDD.
"""

from __future__ import annotations

from fxtrad.api.app import create_app

__all__ = ["create_app"]
