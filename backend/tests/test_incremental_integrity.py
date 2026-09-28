"""Verificación de upsert incremental y metadatos tras el cambio de base (TASK-068).

DoD: fusionar un periodo nuevo sobre la base existente no duplica ``time``
(KPI-4) y deja el metadato de cada descarga (RF-105, RI-002), todo sobre la base
1 m (ADR-012).
"""

from __future__ import annotations

from pathlib import Path

import duckdb

from fxtrad.contracts.ohlc import Candle
from fxtrad.pipeline.persist import build_persister
from fxtrad.storage import DownloadMetadataStore, ParquetSeriesStore

_START = 1772409600  # 2026-03-02T00:00:00Z (lunes)
_MINUTE = 60


def _minute_candles(start: int, count: int, price: float = 1.0) -> list[Candle]:
    """Serie 1 m alineada al epoch."""
    return [
        Candle(
            time=start + i * _MINUTE,
            open=price + i,
            high=price + i,
            low=price + i,
            close=price + i,
        )
        for i in range(count)
    ]


def _counts(tmp_path: Path, symbol: str = "EURUSD") -> tuple[int, int]:
    """Devuelve ``(filas, filas_distintas)`` de ``time`` en el Parquet base."""
    path = ParquetSeriesStore(tmp_path).path_for(symbol, "1m")
    with duckdb.connect() as connection:
        rows, distinct = connection.execute(
            "SELECT count(*), count(DISTINCT time) FROM read_parquet(?)", [str(path)]
        ).fetchone()
    return int(rows), int(distinct)


class TestIncrementalIntegrity:
    """El merge incremental completa la base sin duplicar ``time`` (KPI-4)."""

    def test_overlapping_periods_do_not_duplicate(self, tmp_path: Path) -> None:
        persister = build_persister(tmp_path)
        persister.persist(
            "EURUSD",
            _minute_candles(_START, 2),
            start=_START,
            end=_START + 119,
            status="exito",
        )
        # Segundo periodo solapa en un minuto e incorpora uno nuevo.
        persister.persist(
            "EURUSD",
            _minute_candles(_START + 60, 2, price=2.0),
            start=_START + 60,
            end=_START + 179,
            status="exito",
        )

        rows, distinct = _counts(tmp_path)
        stored = ParquetSeriesStore(tmp_path).read_range("EURUSD", 0, 2**31 - 1)

        assert rows == distinct  # KPI-4: 0 duplicados
        assert [candle.time for candle in stored] == [_START, _START + 60, _START + 120]

    def test_base_file_uses_one_minute_naming(self, tmp_path: Path) -> None:
        persister = build_persister(tmp_path)

        persister.persist(
            "EURUSD", _minute_candles(_START, 2), start=_START, end=_START + 119, status="exito"
        )

        assert (tmp_path / "EURUSD.1m.parquet").is_file()


class TestMetadata:
    """Cada descarga deja su metadato con el rango y las filas (RI-002)."""

    def test_each_download_records_metadata(self, tmp_path: Path) -> None:
        persister = build_persister(tmp_path)

        persister.persist(
            "EURUSD", _minute_candles(_START, 2), start=_START, end=_START + 119, status="exito"
        )
        persister.persist(
            "EURUSD",
            _minute_candles(_START + 120, 2),
            start=_START + 120,
            end=_START + 239,
            status="exito",
        )

        history = DownloadMetadataStore(tmp_path).history(newest_first=False)
        assert [(r.inicio, r.fin, r.filas, r.estado) for r in history] == [
            (_START, _START + 119, 2, "exito"),
            (_START + 120, _START + 239, 2, "exito"),
        ]
