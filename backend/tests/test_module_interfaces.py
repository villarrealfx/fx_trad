"""Tests de las interfaces y fronteras de módulos (TASK-042, RF-016, ADR-001).

Verifican que cada módulo expone una interfaz pública importable y documentada,
que las dependencias directas respetan las direcciones de `architecture.md` §4 y
que las implementaciones concretas cumplen los `Protocol` de sus fronteras.
"""

from __future__ import annotations

import ast
import importlib
from pathlib import Path
from typing import Protocol

import pytest

MODULES = ["contracts", "storage", "pipeline", "ingest", "api"]
"""Módulos con interfaz pública documentada (`_docs/module-interfaces.md`)."""

ALLOWED_DEPS: dict[str, set[str]] = {
    "contracts": set(),
    "storage": {"contracts"},
    "pipeline": {"contracts", "storage"},
    "ingest": {"contracts", "pipeline"},
    "api": {"contracts", "ingest", "storage"},
}
"""Dependencias directas permitidas entre módulos (ADR-001)."""

TRANSVERSAL = {"logging_config"}
"""Módulos transversales importables desde cualquier otro (ADR-008)."""

SRC_ROOT = Path(__file__).resolve().parents[1] / "src" / "fxtrad"


def direct_fxtrad_imports(module: str) -> set[str]:
    """Devuelve las dependencias `fxtrad.*` directas de un módulo (vía AST)."""
    edges: set[str] = set()
    for path in (SRC_ROOT / module).rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and (node.module or "").startswith("fxtrad."):
                edges.add(node.module.split(".")[1])
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.startswith("fxtrad."):
                        edges.add(alias.name.split(".")[1])
    edges.discard(module)
    return edges - TRANSVERSAL


def protocol_methods(protocol: type) -> set[str]:
    """Nombres de los métodos públicos declarados por un Protocol."""
    names: set[str] = set()
    for klass in protocol.__mro__:
        for name, value in vars(klass).items():
            if not name.startswith("_") and callable(value):
                names.add(name)
    return names


@pytest.fixture(scope="module")
def implementations() -> dict[str, tuple[type, type]]:
    """Protocol ↔ implementación concreta de cada frontera del backend."""
    from fxtrad.api import DownloadMetadataReader
    from fxtrad.ingest import (
        CeleryDownloadQueue,
        CeleryDownloadStatus,
        DownloadQueue,
        DownloadStatusQuery,
    )
    from fxtrad.storage import (
        CachedSeriesQuery,
        DownloadMetadataStore,
        SeriesQuery,
        SeriesReader,
    )

    return {
        "DownloadQueue": (CeleryDownloadQueue, DownloadQueue),
        "DownloadStatusQuery": (CeleryDownloadStatus, DownloadStatusQuery),
        "SeriesQuery": (SeriesQuery, SeriesReader),
        "CachedSeriesQuery": (CachedSeriesQuery, SeriesReader),
        "DownloadMetadataReader": (DownloadMetadataStore, DownloadMetadataReader),
    }


class TestPublicInterface:
    """La interfaz pública de cada módulo es importable y está documentada."""

    @pytest.mark.parametrize("module", MODULES)
    def test_module_exposes_a_documented_public_interface(self, module: str) -> None:
        mod = importlib.import_module(f"fxtrad.{module}")

        assert mod.__doc__ is not None and mod.__doc__.strip()
        names = getattr(mod, "__all__", None)
        assert names, f"fxtrad.{module} no declara __all__"
        assert len(names) == len(set(names)), f"__all__ de {module} tiene duplicados"
        for name in names:
            assert getattr(mod, name, None) is not None, f"fxtrad.{module}.{name} no resuelve"

    @pytest.mark.parametrize("module", MODULES)
    def test_import_graph_respects_module_boundaries(self, module: str) -> None:
        edges = direct_fxtrad_imports(module)

        forbidden = edges - ALLOWED_DEPS[module]
        assert not forbidden, f"fxtrad.{module} importa módulos no permitidos: {forbidden}"


class TestProtocols:
    """Las implementaciones concretas cumplen los Protocols de sus fronteras."""

    def test_implementations_satisfy_their_protocol(
        self, implementations: dict[str, tuple[type, type]]
    ) -> None:
        for label, (concrete, protocol) in implementations.items():
            assert issubclass(protocol, Protocol)
            missing = {
                name
                for name in protocol_methods(protocol)
                if not callable(getattr(concrete, name, None))
            }
            assert not missing, f"{concrete.__name__} no implementa {label}: {missing}"
