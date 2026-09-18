"""Modelo de request de descarga de datos (RF-001, HU-001).

``DownloadRequest`` valida la entrada de una descarga: activo del catálogo y
rango temporal en segundos UTC. Si el rango es inválido (fin anterior a inicio)
o el activo es desconocido, la validación falla y la tarea nunca se encola
(criterio de aceptación de HU-001).
"""

from __future__ import annotations

from typing import Self

import structlog
from pydantic import BaseModel, ConfigDict, Field, NonNegativeInt, model_validator

from fxtrad.ingest.catalog import is_known_asset

logger = structlog.get_logger()


class DownloadRequest(BaseModel):
    """Solicitud de descarga de datos históricos de un activo.

    Attributes:
        asset: Símbolo canónico del activo del catálogo (RF-001).
        start: Inicio del rango en segundos UTC (RNF-004).
        end: Fin del rango en segundos UTC (RNF-004).

    Raises:
        ValidationError: si el activo no está en el catálogo o ``end < start``.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    asset: str = Field(description="Símbolo canónico del activo del catálogo.")
    start: NonNegativeInt = Field(description="Inicio del rango en segundos UTC.")
    end: NonNegativeInt = Field(description="Fin del rango en segundos UTC.")

    @model_validator(mode="after")
    def _validate_asset_and_range(self) -> Self:
        """Rechaza activos desconocidos y rangos con fin anterior a inicio."""
        if not is_known_asset(self.asset):
            raise ValueError(f"Activo desconocido para descarga: '{self.asset}'")
        if self.end < self.start:
            raise ValueError("El rango es inválido: fin anterior a inicio")
        logger.debug(
            "request_descarga_validado",
            activo=self.asset,
            inicio=self.start,
            fin=self.end,
        )
        return self


__all__ = ["DownloadRequest"]
