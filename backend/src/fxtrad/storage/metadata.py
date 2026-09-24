"""Metadatos de descarga en tabla DuckDB persistente (TASK-018, RI-002/RF-006).

RI-002 exige registrar cada descarga (activo, rango solicitado, estado y fecha)
para soportar incrementales sin duplicar (RF-006) y alimentar el historial del
frontend (``components.md`` -> GET /downloads, TASK-047). ADR-004 ubica estos
metadatos en una tabla DuckDB separada de las series OHLC.

``DownloadMetadataStore`` mantiene un archivo ``downloads.duckdb`` con la tabla
``download_metadata``, clave ``(activo, inicio, fin)``; ``save`` es idempotente
por rango (INSERT OR REPLACE) y ``history`` sirve el historial ordenado por
fecha. El worker de Celery (ADR-006) escribe aquí al concluir cada descarga.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal, Self

import duckdb
import structlog
from pydantic import BaseModel, ConfigDict, Field, NonNegativeInt, model_validator

logger = structlog.get_logger()

DownloadStatus = Literal["exito", "parcial", "fallo"]
"""Estado final de una descarga almacenada (solo estados al concluir).

Se alinea con ``ingest.status.DownloadStatus`` excluyendo ``encolada``: el
registro solo se persiste cuando la descarga termina (RI-002).
"""

_ASSET_PATTERN = re.compile(r"^[A-Z0-9]{1,16}$")
_COLUMNS = "activo, inicio, fin, estado, fecha_descarga, filas"
_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS download_metadata (
    activo VARCHAR,
    inicio BIGINT,
    fin BIGINT,
    estado VARCHAR,
    fecha_descarga TIMESTAMP,
    filas BIGINT,
    PRIMARY KEY (activo, inicio, fin)
)
"""


class DownloadMetadata(BaseModel):
    """Registro de metadatos de una descarga completada (RI-002).

    Attributes:
        activo: Símbolo del activo descargado (RF-001).
        inicio: Inicio del rango solicitado en segundos UTC (RNF-004).
        fin: Fin del rango solicitado en segundos UTC (RNF-004).
        estado: Resultado de la descarga (exito/parcial/fallo).
        fecha_descarga: Momento UTC en que concluyó la descarga.
        filas: Velas OHLC obtenidas por la descarga.

    Raises:
        ValidationError: si ``fin < inicio`` o el activo no es un símbolo válido.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    activo: str = Field(description="Símbolo del activo descargado (RF-001).")
    inicio: NonNegativeInt = Field(description="Inicio del rango solicitado en segundos UTC.")
    fin: NonNegativeInt = Field(description="Fin del rango solicitado en segundos UTC.")
    estado: DownloadStatus = Field(description="Resultado de la descarga.")
    fecha_descarga: datetime = Field(description="Momento UTC en que concluyó la descarga.")
    filas: NonNegativeInt = Field(description="Velas OHLC obtenidas por la descarga.")

    @model_validator(mode="after")
    def _validate_range(self) -> Self:
        """Rechaza registros cuyo fin sea anterior al inicio."""
        if self.fin < self.inicio:
            raise ValueError("El rango es inválido: fin anterior a inicio")
        return self


class DownloadMetadataStore:
    """Almacén de metadatos de descarga en una tabla DuckDB persistente.

    Un archivo ``{base_dir}/downloads.duckdb`` guarda la tabla
    ``download_metadata`` (ADR-004). Cada operación abre y cierra su conexión;
    DuckDB persiste el archivo para que el worker de Celery (ADR-006) y la API
    compartan el mismo historial.
    """

    def __init__(self, base_dir: Path) -> None:
        """Crea el almacén y se asegura de que la tabla exista."""
        self._path = Path(base_dir) / "downloads.duckdb"
        self._initialize()

    def _initialize(self) -> None:
        """Crea el directorio base y la tabla si aún no existe."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        connection = duckdb.connect(str(self._path))
        try:
            connection.execute(_CREATE_TABLE)
        finally:
            connection.close()

    def save(self, record: DownloadMetadata) -> None:
        """Persiste el registro de forma idempotente por rango.

        Args:
            record: Registro a guardar; reemplaza uno previo con la misma
                combinación (activo, inicio, fin) sin duplicar filas.

        Raises:
            ValueError: si el activo no es un identificador de almacén seguro.
        """
        if not _ASSET_PATTERN.match(record.activo):
            raise ValueError(f"Símbolo inválido para metadatos: '{record.activo}'")
        connection = duckdb.connect(str(self._path))
        try:
            connection.execute(
                "INSERT OR REPLACE INTO download_metadata VALUES (?, ?, ?, ?, ?, ?)",
                [
                    record.activo,
                    record.inicio,
                    record.fin,
                    record.estado,
                    self._to_db_timestamp(record.fecha_descarga),
                    record.filas,
                ],
            )
        finally:
            connection.close()
        logger.info(
            "metadatos_descarga_guardados",
            activo=record.activo,
            inicio=record.inicio,
            fin=record.fin,
            estado=record.estado,
            filas=record.filas,
        )

    def history(
        self, limit: int | None = None, newest_first: bool = True
    ) -> list[DownloadMetadata]:
        """Devuelve el historial de descargas ordenado por fecha.

        Args:
            limit: Número máximo de registros (None = todos).
            newest_first: True ordena de más reciente a más antiguo (vista de
                historial); False de más antiguo a más reciente.

        Returns:
            Registros de descarga en el orden solicitado.
        """
        order = "DESC" if newest_first else "ASC"
        query = f"SELECT {_COLUMNS} FROM download_metadata ORDER BY fecha_descarga {order}"
        params: list[object] = []
        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)
        connection = duckdb.connect(str(self._path))
        try:
            rows = connection.execute(query, params).fetchall()
        finally:
            connection.close()
        logger.info("metadatos_descarga_consultados", registros=len(rows))
        return [self._to_record(row) for row in rows]

    def get(self, activo: str, inicio: int, fin: int) -> DownloadMetadata | None:
        """Devuelve el registro del rango indicado, o None si no existe."""
        connection = duckdb.connect(str(self._path))
        try:
            row = connection.execute(
                f"SELECT {_COLUMNS} FROM download_metadata"
                " WHERE activo = ? AND inicio = ? AND fin = ?",
                [activo, inicio, fin],
            ).fetchone()
        finally:
            connection.close()
        if row is None:
            return None
        return self._to_record(row)

    def count(self) -> int:
        """Devuelve el número de registros almacenados."""
        connection = duckdb.connect(str(self._path))
        try:
            row = connection.execute("SELECT COUNT(*) FROM download_metadata").fetchone()
        finally:
            connection.close()
        if row is None:
            return 0
        (count,) = row
        return int(count)

    @staticmethod
    def _to_db_timestamp(value: datetime) -> datetime:
        """Convierte a naive-UTC para evitar la conversión local de DuckDB.

        DuckDB trata los datetimes con timezone como ``TIMESTAMPTZ`` y los
        convierte a la zona del proceso antes de guardar un ``TIMESTAMP``; se
        pasa el valor como naive-UTC para persistir los segundos exactos.
        """
        return value.astimezone(UTC).replace(tzinfo=None)

    @staticmethod
    def _to_record(row: tuple[Any, ...]) -> DownloadMetadata:
        """Construye el modelo desde una fila de DuckDB (UTC en ``fecha_descarga``)."""
        activo, inicio, fin, estado, fecha_descarga, filas = row
        return DownloadMetadata(
            activo=activo,
            inicio=inicio,
            fin=fin,
            estado=estado,
            fecha_descarga=fecha_descarga.replace(tzinfo=UTC),
            filas=filas,
        )


__all__ = ["DownloadMetadata", "DownloadMetadataStore", "DownloadStatus"]
