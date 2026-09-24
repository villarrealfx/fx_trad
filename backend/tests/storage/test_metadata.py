"""Tests de la tabla de metadatos de descarga (TASK-018, RI-002/RF-006).

DoD: se crea la tabla DuckDB ``download_metadata``, se insertan registros de
descarga y se leen (historial ordenado por fecha). Aislamiento con ``tmp_path``.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

import duckdb
import pytest
from pydantic import ValidationError

from fxtrad.storage import DownloadMetadata, DownloadMetadataStore

_BASE_TIME = 1786442400  # 2026-08-11T10:00:00Z
_BASE_DATE = datetime.fromtimestamp(_BASE_TIME, tz=UTC)


def _record(
    activo: str = "EURUSD",
    inicio: int = _BASE_TIME,
    fin: int = _BASE_TIME + 3600,
    estado: str = "exito",
    fecha: datetime = _BASE_DATE,
    filas: int = 3600,
) -> DownloadMetadata:
    """Registro base con un activo y rango descargables."""
    return DownloadMetadata(
        activo=activo,
        inicio=inicio,
        fin=fin,
        estado=estado,
        fecha_descarga=fecha,
        filas=filas,
    )


class TestSchema:
    """La inicialización crea la tabla DuckDB con el esquema de RI-002."""

    def test_creates_database_file_and_table(self, tmp_path: Path) -> None:
        DownloadMetadataStore(tmp_path)

        assert (tmp_path / "downloads.duckdb").is_file()
        with duckdb.connect(str(tmp_path / "downloads.duckdb")) as connection:
            (tables,) = connection.execute(
                "SELECT COUNT(*) FROM information_schema.tables"
                " WHERE table_name = 'download_metadata'"
            ).fetchone()
        assert tables == 1

    def test_columns_have_expected_types(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        store.save(_record())

        with duckdb.connect(str(tmp_path / "downloads.duckdb")) as connection:
            column_types = dict(
                connection.execute(
                    "SELECT column_name, data_type FROM information_schema.columns"
                    " WHERE table_name = 'download_metadata'"
                ).fetchall()
            )

        assert column_types["activo"] == "VARCHAR"
        assert column_types["inicio"] == "BIGINT"
        assert column_types["fin"] == "BIGINT"
        assert column_types["estado"] == "VARCHAR"
        assert column_types["fecha_descarga"] == "TIMESTAMP"
        assert column_types["filas"] == "BIGINT"

    def test_primary_key_covers_asset_and_range(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)

        assert store.count() == 0


class TestSave:
    """save inserta registros y es idempotente por rango (RF-006)."""

    def test_save_then_history_returns_record(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        record = _record()

        store.save(record)
        saved = store.history()

        assert len(saved) == 1
        assert saved[0] == record

    def test_save_replaces_same_range_without_duplicating(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        store.save(_record(estado="parcial", filas=1200))
        store.save(_record(estado="exito", filas=3600))

        assert store.count() == 1
        (saved,) = store.history()
        assert saved.estado == "exito"
        assert saved.filas == 3600

    def test_save_keeps_distinct_ranges(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        store.save(_record(inicio=_BASE_TIME, fin=_BASE_TIME + 3600))
        store.save(_record(inicio=_BASE_TIME + 3600, fin=_BASE_TIME + 7200))

        assert store.count() == 2

    def test_save_updates_download_date(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        later = _BASE_DATE + timedelta(days=1)
        store.save(_record())
        store.save(_record(fecha=later))

        (saved,) = store.history()
        assert saved.fecha_descarga == later

    def test_save_rejects_unknown_asset(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)

        with pytest.raises(ValueError, match="Símbolo inválido"):
            store.save(_record(activo="my;asset"))


class TestHistory:
    """history devuelve el historial ordenado por fecha de descarga."""

    def _seed(self, store: DownloadMetadataStore) -> None:
        day = timedelta(days=1)
        store.save(_record(fecha=_BASE_DATE))
        store.save(_record(activo="XAUUSD", fecha=_BASE_DATE + day))
        store.save(_record(activo="USOIL", fecha=_BASE_DATE + 2 * day))

    def test_orders_newest_first_by_default(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        self._seed(store)

        activos = [record.activo for record in store.history()]

        assert activos == ["USOIL", "XAUUSD", "EURUSD"]

    def test_orders_oldest_first_when_requested(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        self._seed(store)

        activos = [record.activo for record in store.history(newest_first=False)]

        assert activos == ["EURUSD", "XAUUSD", "USOIL"]

    def test_limit_truncates_result(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        self._seed(store)

        recent = store.history(limit=2)

        assert [record.activo for record in recent] == ["USOIL", "XAUUSD"]

    def test_empty_history(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)

        assert store.history() == []


class TestGet:
    """get recupera el registro de un rango concreto."""

    def test_get_returns_record_for_range(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        store.save(_record())

        record = store.get("EURUSD", _BASE_TIME, _BASE_TIME + 3600)

        assert record is not None
        assert record == _record()

    def test_get_returns_none_for_unknown_range(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)
        store.save(_record())

        assert store.get("EURUSD", _BASE_TIME + 999, _BASE_TIME + 1999) is None

    def test_get_returns_none_when_empty(self, tmp_path: Path) -> None:
        store = DownloadMetadataStore(tmp_path)

        assert store.get("EURUSD", _BASE_TIME, _BASE_TIME + 3600) is None


class TestModelValidation:
    """El modelo rechaza rangos invertidos (RI-002)."""

    def test_rejects_end_before_start(self) -> None:
        with pytest.raises(ValidationError, match="fin anterior a inicio"):
            _record(inicio=_BASE_TIME + 3600, fin=_BASE_TIME)

    def test_rejects_negative_timestamps(self) -> None:
        with pytest.raises(ValidationError):
            _record(inicio=-1, fin=-1)
