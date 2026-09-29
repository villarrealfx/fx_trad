"""Catálogo de activos con cobertura y estado (TASK-020, RF-007).

Compone el catálogo canónico de ``ingest`` (``ASSET_CATALOG``) con la
cobertura realmente almacenada en el Parquet 1s (``storage.series``) y el
último estado de descarga registrado (``storage.metadata``, RI-002/TASK-018).
La API expone el resultado en el contrato CMP-006 del frontend (SCR-001):

``[{symbol, type, coverage_start, coverage_end, status}]``

Solo se listan activos con datos almacenados: la biblioteca de la interfaz
(RF-007) muestra activos guardados, no catálogo sin descargar.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from fxtrad.ingest import ASSET_CATALOG, AssetType
from fxtrad.storage import DownloadMetadataStore, ParquetSeriesStore

AssetStatus = Literal["completo", "parcial", "sin_datos"]
"""Estado de cobertura de un activo (CMP-006).

- ``completo``: la última descarga registrada terminó con éxito.
- ``parcial``: la última descarga quedó parcial o fallida (interaction-specs).
- ``sin_datos``: el activo está en el catálogo canónico pero no tiene datos
  almacenados (solo aparece con ``scope=all``, para el formulario de descarga).
"""

CatalogScope = Literal["stored", "all"]
"""Alcance del catálogo: solo activos con datos (biblioteca) o todo el canónico."""


class AssetRow(BaseModel):
    """Fila del catálogo de activos con datos almacenados (CMP-006).

    Attributes:
        symbol: Identificador canónico del activo (RF-001).
        type: Categoría del activo (forex, metal u oil).
        coverage_start: Inicio de la cobertura en segundos UTC; ``None`` sin datos.
        coverage_end: Fin de la cobertura en segundos UTC; ``None`` sin datos.
        status: Estado de la cobertura (completo/parcial/sin_datos).
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    symbol: str = Field(description="Identificador canónico del activo (RF-001).")
    type: AssetType = Field(description="Categoría del activo (forex, metal u oil).")
    coverage_start: int | None = Field(description="Inicio de la cobertura en segundos UTC.")
    coverage_end: int | None = Field(description="Fin de la cobertura en segundos UTC.")
    status: AssetStatus = Field(description="Estado de la cobertura (completo/parcial/sin_datos).")


class CatalogQuery:
    """Consulta del catálogo de activos con cobertura y estado.

    Args:
        series_store: Almacén Parquet del que se deriva la cobertura 1s de
            cada activo (RF-005/ADR-004).
        metadata_store: Almacén de metadatos de descarga del que se deriva el
            último estado por activo (RI-002/TASK-018).
    """

    def __init__(
        self,
        series_store: ParquetSeriesStore,
        metadata_store: DownloadMetadataStore,
    ) -> None:
        self._series_store = series_store
        self._metadata_store = metadata_store

    def list(self, scope: CatalogScope = "stored") -> list[AssetRow]:
        """Devuelve las filas del catálogo en orden canónico (CMP-006).

        Con ``scope="stored"`` (biblioteca, SCR-001) incluye solo activos con
        cobertura almacenada. Con ``scope="all"`` (formulario de descarga,
        SCR-002) incluye todo el catálogo canónico; los activos sin datos llevan
        ``coverage_start``/``coverage_end`` a ``None`` y ``status="sin_datos"``.
        El ``status`` con datos se deriva del último registro de descarga:
        ``exito`` -> ``completo``; ``parcial``/``fallo`` -> ``parcial``; sin
        registro previo -> ``completo``.

        Args:
            scope: ``stored`` (solo con datos) o ``all`` (catálogo completo).

        Returns:
            Filas de activos ordenadas según ``ASSET_CATALOG``.
        """
        latest_by_asset = self._latest_state_by_asset()
        rows: list[AssetRow] = []
        for asset in ASSET_CATALOG:
            coverage = self._series_store.coverage(asset.symbol)
            if coverage is None:
                if scope == "all":
                    rows.append(
                        AssetRow(
                            symbol=asset.symbol,
                            type=asset.type,
                            coverage_start=None,
                            coverage_end=None,
                            status="sin_datos",
                        )
                    )
                continue
            rows.append(
                AssetRow(
                    symbol=asset.symbol,
                    type=asset.type,
                    coverage_start=coverage[0],
                    coverage_end=coverage[1],
                    status=latest_by_asset.get(asset.symbol, "completo"),
                )
            )
        return rows

    def _latest_state_by_asset(self) -> dict[str, AssetStatus]:
        """Devuelve el ``status`` derivado del último registro por activo.

        El historial llega ordenado de más reciente a más antiguo, de modo que
        la primera aparición de cada activo es su último estado. Un ``fallo``
        cuenta como ``parcial`` para la biblioteca (interaction-specs).
        """
        states: dict[str, AssetStatus] = {}
        for record in self._metadata_store.history():
            if record.activo in states:
                continue
            states[record.activo] = (
                "parcial" if record.estado in ("parcial", "fallo") else "completo"
            )
        return states


__all__ = ["AssetRow", "AssetStatus", "CatalogQuery", "CatalogScope"]
