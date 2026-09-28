"""Tests de la persistencia de la descarga (TASK-050, RF-006, RI-002).

DoD: una descarga concluida deja filas en el Parquet del activo y un registro
en ``download_metadata``, y una descarga incremental completa la base sin
duplicar ni borrar (KPI-4). Se usa ``tmp_path`` para aislar cada test y
Parquet/DuckDB reales: el valor está en que el contrato se cumpla sobre disco.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.pipeline.persist import DownloadPersister, build_persister
from fxtrad.storage import DownloadMetadataStore, ParquetSeriesStore

_START = 1772409600  # 2026-03-02T00:00:00Z (lunes)
_HOUR = 3600


def _candle(time: int, price: float = 1.1) -> Candle:
    """Construye una vela plana para simplificar aserciones."""
    return Candle(time=time, open=price, high=price, low=price, close=price)


def _candles(start: int, count: int) -> list[Candle]:
    """Serie de velas consecutivas de 1 m desde ``start``."""
    return [_candle(start + offset) for offset in range(count)]


def _persister(tmp_path: Path) -> DownloadPersister:
    """Persistidor real sobre un directorio vacío."""
    return build_persister(tmp_path)


def _stored_times(store: ParquetSeriesStore, symbol: str = "EURUSD") -> list[int]:
    """Devuelve los ``time`` almacenados en la serie 1m del activo."""
    return [candle.time for candle in store.read_range(symbol, 0, 2**31 - 1)]


class TestFirstDownload:
    """La primera descarga crea el Parquet del activo y su metadato (RI-002)."""

    def test_persists_candles_into_the_asset_parquet(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)

        rows = persister.persist(
            "EURUSD", _candles(_START, 3), start=_START, end=_START + 2, status="exito"
        )

        store = ParquetSeriesStore(tmp_path)
        assert rows == 3
        assert store.has_series("EURUSD")
        assert _stored_times(store) == [_START, _START + 1, _START + 2]
        assert store.coverage("EURUSD") == (_START, _START + 2)

    def test_records_metadata_with_obtained_rows(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)
        when = datetime(2026, 3, 2, 12, 0, tzinfo=UTC)

        persister.persist(
            "EURUSD", _candles(_START, 3), start=_START, end=_START + 2, status="exito", now=when
        )

        record = DownloadMetadataStore(tmp_path).history()[0]
        assert record.activo == "EURUSD"
        assert (record.inicio, record.fin) == (_START, _START + 2)
        assert record.estado == "exito"
        assert record.filas == 3
        assert record.fecha_descarga == when

    def test_partial_download_is_recorded_with_its_state(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)

        persister.persist(
            "EURUSD", _candles(_START, 2), start=_START, end=_START + _HOUR, status="parcial"
        )

        record = DownloadMetadataStore(tmp_path).history()[0]
        assert record.estado == "parcial"
        assert record.filas == 2
        assert _stored_times(ParquetSeriesStore(tmp_path)) == [_START, _START + 1]


class TestIncrementalDownload:
    """RF-006: la descarga incremental completa la base sin duplicar (KPI-4)."""

    def test_second_download_completes_the_range(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)
        persister.persist(
            "EURUSD", _candles(_START, 2), start=_START, end=_START + 1, status="exito"
        )

        rows = persister.persist(
            "EURUSD",
            _candles(_START + 2, 2),
            start=_START + 2,
            end=_START + 3,
            status="exito",
        )

        assert rows == 4
        assert _stored_times(ParquetSeriesStore(tmp_path)) == [
            _START,
            _START + 1,
            _START + 2,
            _START + 3,
        ]

    def test_overlapping_download_does_not_duplicate_times(self, tmp_path: Path) -> None:
        """KPI-4: 0 filas duplicadas al volver a descargar un rango ya cubierto."""
        persister = _persister(tmp_path)
        persister.persist(
            "EURUSD", _candles(_START, 3), start=_START, end=_START + 2, status="exito"
        )

        rows = persister.persist(
            "EURUSD", _candles(_START, 3), start=_START, end=_START + 2, status="exito"
        )

        times = _stored_times(ParquetSeriesStore(tmp_path))
        assert rows == 3
        assert len(times) == len(set(times))
        assert times == [_START, _START + 1, _START + 2]

    def test_each_range_keeps_its_own_metadata_record(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)
        persister.persist(
            "EURUSD", _candles(_START, 2), start=_START, end=_START + 1, status="exito"
        )
        persister.persist(
            "EURUSD",
            _candles(_START + _HOUR, 2),
            start=_START + _HOUR,
            end=_START + _HOUR + 1,
            status="exito",
        )

        history = DownloadMetadataStore(tmp_path).history(newest_first=False)
        assert [(r.inicio, r.filas) for r in history] == [(_START, 2), (_START + _HOUR, 2)]

    def test_repeated_same_range_is_idempotent_in_metadata(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)
        for _ in range(2):
            persister.persist(
                "EURUSD", _candles(_START, 2), start=_START, end=_START + 1, status="exito"
            )

        assert len(DownloadMetadataStore(tmp_path).history()) == 1


class TestEmptyDownload:
    """Una descarga sin velas no inventa un activo vacío en el catálogo (RF-007)."""

    def test_no_parquet_is_created_without_candles(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)

        rows = persister.persist("EURUSD", [], start=_START, end=_START + _HOUR, status="fallo")

        store = ParquetSeriesStore(tmp_path)
        assert rows == 0
        assert not store.has_series("EURUSD")
        with pytest.raises(FileNotFoundError):
            store.read_range("EURUSD", _START, _START + _HOUR)

    def test_failure_is_still_recorded_for_the_history(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)

        persister.persist("EURUSD", [], start=_START, end=_START + _HOUR, status="fallo")

        record = DownloadMetadataStore(tmp_path).history()[0]
        assert (record.estado, record.filas) == ("fallo", 0)

    def test_empty_download_does_not_touch_existing_series(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)
        persister.persist(
            "EURUSD", _candles(_START, 2), start=_START, end=_START + 1, status="exito"
        )

        persister.persist(
            "EURUSD", [], start=_START + _HOUR, end=_START + 2 * _HOUR, status="fallo"
        )

        assert _stored_times(ParquetSeriesStore(tmp_path)) == [_START, _START + 1]


class TestRefreshIntegration:
    """TASK-049: la persistencia refresca los derivados y no traga sus fallos."""

    def test_persisting_regenerates_the_derived_series(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)
        persister.persist(
            "EURUSD", _candles(_START, 3), start=_START, end=_START + 2, status="exito"
        )

        store = ParquetSeriesStore(tmp_path)
        assert store.has_series("EURUSD", "1h")
        assert store.read_range("EURUSD", 0, 2**31 - 1, "1h") == [
            Candle(time=_START, open=1.1, high=1.1, low=1.1, close=1.1)
        ]

    def test_refresh_failure_propagates_and_skips_metadata(
        self, tmp_path: Path, monkeypatch: object
    ) -> None:
        """Servir velas derivadas viejas es peor que reportar el fallo (RF-009)."""
        persister = _persister(tmp_path)
        persister.persist("EURUSD", _candles(_START, 1), start=_START, end=_START, status="exito")
        metadata = DownloadMetadataStore(tmp_path)
        before = metadata.count()

        def _boom(*_args: object, **_kwargs: object) -> None:
            raise RuntimeError("parquet derivado corrupto")

        monkeypatch.setattr(  # type: ignore[attr-defined]
            persister._refresher, "refresh", _boom  # noqa: SLF001
        )
        later = _START + _HOUR
        with pytest.raises(RuntimeError, match="corrupto"):
            persister.persist("EURUSD", _candles(later, 1), start=later, end=later, status="exito")

        assert metadata.count() == before

    def test_no_refresher_leaves_derived_series_untouched(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        persister = DownloadPersister(store, DownloadMetadataStore(tmp_path))

        persister.persist("EURUSD", _candles(_START, 1), start=_START, end=_START, status="exito")

        assert _stored_times(store) == [_START]
        assert not store.has_series("EURUSD", "1h")


class TestBuildPersister:
    """La factoría resuelve el directorio de datos como el resto del backend."""

    def test_uses_the_explicit_directory(self, tmp_path: Path) -> None:
        persister = build_persister(tmp_path)
        persister.persist("EURUSD", _candles(_START, 1), start=_START, end=_START, status="exito")
        assert (tmp_path / "EURUSD.1m.parquet").exists()

    def test_falls_back_to_the_data_dir_variable(self, tmp_path: Path, monkeypatch: object) -> None:
        monkeypatch.setenv("FXTRAD_DATA_DIR", str(tmp_path))  # type: ignore[attr-defined]

        persister = build_persister()
        persister.persist("EURUSD", _candles(_START, 1), start=_START, end=_START, status="exito")

        assert (tmp_path / "EURUSD.1m.parquet").exists()

    def test_default_directory_is_data(self, monkeypatch: object) -> None:
        monkeypatch.delenv("FXTRAD_DATA_DIR", raising=False)  # type: ignore[attr-defined]
        persister = build_persister()
        assert isinstance(persister, DownloadPersister)
        assert isinstance(persister._series_store, ParquetSeriesStore)  # noqa: SLF001


class TestInvalidInput:
    """El storage sigue siendo la frontera que valida los símbolos."""

    def test_unsafe_symbol_is_rejected(self, tmp_path: Path) -> None:
        persister = _persister(tmp_path)
        with pytest.raises(ValueError, match="inválido"):
            persister.persist(
                "../evil", _candles(_START, 1), start=_START, end=_START, status="exito"
            )
        assert not (tmp_path / "EURUSD.1m.parquet").exists()
