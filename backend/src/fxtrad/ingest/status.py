"""Estado de una descarga consultable por la API (RF-001, TASK-006).

``DownloadStatusQuery`` define el contrato que la API usa para consultar el
estado de una descarga encolada por su ``task_id`` (TASK-003): sin este
contrato el endpoint no depende de Celery. La implementación de producción
(``CeleryDownloadStatus``, TASK-004) lee el resultado de la tarea; las pruebas
inyectan un sustituto sin broker.

Los cuatro estados del dominio (DoD TASK-006) son: ``encolada`` (tarea no
terminada), ``exito``, ``parcial`` y ``fallo``. El valor ``parcial`` se toma del
resumen de la descarga (TASK-005: alguna hora falló tras reintentos).
"""

from __future__ import annotations

from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, NonNegativeInt

DownloadStatus = Literal["encolada", "exito", "parcial", "fallo"]
"""Estado del ciclo de vida de una descarga visto por la API (DoD TASK-006)."""


class DownloadInfo(BaseModel):
    """Estado consultable de una descarga.

    Attributes:
        task_id: Identificador de la tarea en la cola (TASK-003).
        estado: Fase actual de la descarga (encolada/éxito/parcial/fallo).
        filas: Velas OHLC obtenidas hasta el momento (0 si aún no termina).
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    task_id: str = Field(description="Identificador único de la tarea encolada.")
    estado: DownloadStatus = Field(description="Fase actual de la descarga.")
    filas: NonNegativeInt = Field(description="Velas OHLC obtenidas por la descarga.")


class DownloadStatusQuery(Protocol):
    """Consulta de estado de una descarga encolada en la cola asíncrona."""

    def get(self, task_id: str) -> DownloadInfo:
        """Devuelve el estado y las filas obtenidas de la tarea indicada.

        Args:
            task_id: Identificador de la tarea cuya descarga se consulta.

        Returns:
            Estado de la descarga (encolada/éxito/parcial/fallo) y filas.
        """
        ...


__all__ = ["DownloadInfo", "DownloadStatus", "DownloadStatusQuery"]
