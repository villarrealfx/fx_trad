"""Consulta y contrato HTTP del historial de descargas (TASK-047, RI-002).

El endpoint expone los metadatos persistidos por ``DownloadMetadataStore`` en
el contrato consumido por el frontend: ``date``, ``active``, ``range``,
``status`` y ``rows``. La conversión mantiene el orden más reciente primero
definido por la capa de almacenamiento.
"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol, Self

import structlog
from pydantic import BaseModel, ConfigDict, Field, NonNegativeInt, model_validator

from fxtrad.storage import DownloadMetadata, DownloadStatus

logger = structlog.get_logger()


class DownloadRange(BaseModel):
    """Rango solicitado para una descarga, expresado en segundos UTC.

    Attributes:
        start: Inicio del rango en segundos UTC.
        end: Fin del rango en segundos UTC.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    start: NonNegativeInt = Field(description="Inicio del rango en segundos UTC.")
    end: NonNegativeInt = Field(description="Fin del rango en segundos UTC.")

    @model_validator(mode="after")
    def _validate_order(self) -> Self:
        """Rechaza rangos cuyo fin sea anterior al inicio."""
        if self.end < self.start:
            raise ValueError("El rango es inválido: fin anterior a inicio")
        return self


class DownloadHistoryRow(BaseModel):
    """Fila del historial de descargas expuesta por la API.

    Attributes:
        date: Fecha UTC de conclusión de la descarga.
        active: Símbolo del activo descargado.
        range: Rango solicitado en segundos UTC.
        status: Estado final de la descarga.
        rows: Número de velas obtenidas.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    date: datetime = Field(description="Fecha UTC de conclusión de la descarga.")
    active: str = Field(description="Símbolo del activo descargado.")
    range: DownloadRange = Field(description="Rango solicitado en segundos UTC.")
    status: DownloadStatus = Field(description="Estado final de la descarga.")
    rows: NonNegativeInt = Field(description="Número de velas obtenidas.")


class DownloadMetadataReader(Protocol):
    """Contrato mínimo del almacén que alimenta el historial de descargas."""

    def history(self) -> list[DownloadMetadata]:
        """Devuelve los registros ordenados del más reciente al más antiguo."""
        ...


class DownloadHistoryQuery:
    """Adapta metadatos de almacenamiento al contrato de la API.

    Args:
        metadata_store: Fuente de metadatos de descarga (ADR-004/TASK-018).
    """

    def __init__(self, metadata_store: DownloadMetadataReader) -> None:
        self._metadata_store = metadata_store

    def list(self) -> list[DownloadHistoryRow]:
        """Devuelve el historial convertido al contrato de TASK-047.

        Returns:
            Filas del historial en orden descendente por fecha de descarga.
        """
        records = self._metadata_store.history()
        logger.debug("historial_descargas_leido", records=len(records))
        return [self._to_row(record) for record in records]

    @staticmethod
    def _to_row(record: DownloadMetadata) -> DownloadHistoryRow:
        """Convierte un registro interno en una fila del contrato HTTP."""
        return DownloadHistoryRow(
            date=record.fecha_descarga,
            active=record.activo,
            range=DownloadRange(start=record.inicio, end=record.fin),
            status=record.estado,
            rows=record.filas,
        )


__all__ = [
    "DownloadHistoryQuery",
    "DownloadHistoryRow",
    "DownloadMetadataReader",
    "DownloadRange",
]
