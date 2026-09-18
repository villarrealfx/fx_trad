"""Cola de descargas de datos (RF-001, ADR-006).

La API encola la descarga y responde 202 Accepted inmediatamente; un worker
procesa la tarea en segundo plano. ``DownloadQueue`` es el contrato que la
implementación de Celery (TASK-004) cumplirá; aquí se define como única vía
de acoplamiento del endpoint ``POST /downloads`` (TASK-003) con la cola.
"""

from __future__ import annotations

from typing import Protocol

from fxtrad.ingest.requests import DownloadRequest


class DownloadQueue(Protocol):
    """Cola asíncrona que registra descargas y devuelve su identificador."""

    def enqueue(self, request: DownloadRequest) -> str:
        """Encola una descarga validada y devuelve el ``task_id``.

        Args:
            request: Solicitud de descarga ya validada (TASK-001).

        Returns:
            Identificador único de la tarea encolada (p. ej. el de Celery).
        """
        ...


__all__ = ["DownloadQueue"]
