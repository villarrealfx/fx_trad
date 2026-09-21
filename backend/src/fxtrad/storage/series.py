"""Persistencia de series OHLC en Parquet por activo (TASK-015, RF-005/RI-001).

Implementa la decisión ADR-004: cada activo se guarda como un archivo Parquet
de columnas ``time`` (BIGINT, segundos UTC, único por activo) y
``open/high/low/close`` (DOUBLE), consultable con DuckDB. La escritura es
atómica y rechaza ``time`` duplicados (RI-001). El merge incremental entre
periodos descargados es responsabilidad de TASK-019.
"""

from __future__ import annotations

import os
import re
from collections.abc import Sequence
from pathlib import Path

import duckdb
import structlog

from fxtrad.contracts.ohlc import Candle

logger = structlog.get_logger()

_SYMBOL_PATTERN = re.compile(r"^[A-Z0-9]{1,16}$")
_COLUMNS = "time, open, high, low, close"
_CREATE_TABLE = (
    "CREATE TABLE series (time BIGINT, open DOUBLE, high DOUBLE, low DOUBLE, close DOUBLE)"
)


class DuplicateTimeError(ValueError):
    """La serie contiene ``time`` repetidos: viola la unicidad de RI-001."""


class ParquetSeriesStore:
    """Almacén de series OHLC en un Parquet por activo, consultable con DuckDB.

    Un archivo ``{base_dir}/{SYMBOL}.parquet`` por activo (ADR-004). La clase
    no conoce el catálogo de activos (frontera de módulos): solo valida que el
    símbolo sea un identificador seguro para usarlo como nombre de archivo.
    """

    def __init__(self, base_dir: Path) -> None:
        """Crea el almacén con el directorio base donde residen los Parquet."""
        self._base_dir = Path(base_dir)

    def path_for(self, symbol: str) -> Path:
        """Devuelve la ruta del Parquet del activo, validando el símbolo.

        Raises:
            ValueError: si el símbolo no es un identificador seguro (evita
                path traversal al construir el nombre de archivo).
        """
        if not _SYMBOL_PATTERN.match(symbol):
            raise ValueError(f"Símbolo inválido para almacenamiento: '{symbol}'")
        return self._base_dir / f"{symbol}.parquet"

    def has_series(self, symbol: str) -> bool:
        """Indica si el activo ya tiene una serie Parquet almacenada."""
        return self.path_for(symbol).is_file()

    def write(self, symbol: str, candles: Sequence[Candle]) -> int:
        """Escribe la serie del activo en su Parquet de forma atómica.

        Args:
            symbol: Símbolo del activo (nombre de archivo).
            candles: Velas a persistir; se ordenan por ``time``.

        Returns:
            Número de filas escritas.

        Raises:
            DuplicateTimeError: si ``candles`` contiene ``time`` repetidos
                (RI-001). La escritura reemplaza el archivo del activo.
        """
        path = self.path_for(symbol)
        self._reject_duplicate_times(candles)
        rows = sorted((c.time, c.open, c.high, c.low, c.close) for c in candles)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = path.with_suffix(".parquet.tmp")
        connection = duckdb.connect()
        try:
            connection.execute(_CREATE_TABLE)
            if rows:
                connection.executemany("INSERT INTO series VALUES (?, ?, ?, ?, ?)", rows)
            connection.execute(f"COPY series TO '{tmp_path}' (FORMAT PARQUET)")
        finally:
            connection.close()
        os.replace(tmp_path, path)
        logger.info("serie_escrita", activo=symbol, velas=len(rows), ruta=str(path))
        return len(rows)

    def read_range(self, symbol: str, start: int, end: int) -> list[Candle]:
        """Devuelve las velas del rango inclusivo ``[start, end]`` ordenadas.

        Args:
            symbol: Símbolo del activo almacenado.
            start: Inicio del rango en segundos UTC (inclusivo).
            end: Fin del rango en segundos UTC (inclusivo).

        Returns:
            Velas del rango ordenadas ascendentemente por ``time``.

        Raises:
            FileNotFoundError: si el activo no tiene serie almacenada.
        """
        path = self.path_for(symbol)
        if not path.is_file():
            raise FileNotFoundError(f"El activo '{symbol}' no tiene serie almacenada")
        connection = duckdb.connect()
        try:
            rows = connection.execute(
                f"SELECT {_COLUMNS} FROM read_parquet(?)"
                " WHERE time BETWEEN ? AND ? ORDER BY time",
                [str(path), start, end],
            ).fetchall()
        finally:
            connection.close()
        logger.info("serie_consultada", activo=symbol, inicio=start, fin=end, velas=len(rows))
        return [
            Candle(time=int(time), open=open_, high=high, low=low, close=close)
            for time, open_, high, low, close in rows
        ]

    @staticmethod
    def _reject_duplicate_times(candles: Sequence[Candle]) -> None:
        """Lanza ``DuplicateTimeError`` si hay ``time`` repetidos (RI-001)."""
        times = [candle.time for candle in candles]
        if len(set(times)) != len(times):
            raise DuplicateTimeError("La serie contiene 'time' duplicados (RI-001)")


__all__ = ["DuplicateTimeError", "ParquetSeriesStore"]
