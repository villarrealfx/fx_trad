"""Persistencia de series OHLC en Parquet por activo (TASK-015, TASK-017).

Implementa la decisión ADR-004: cada activo se guarda como un archivo Parquet
de columnas ``time`` (BIGINT, segundos UTC, único por activo) y
``open/high/low/close`` (DOUBLE), consultable con DuckDB. La escritura es
atómica y rechaza ``time`` duplicados (RI-001). El merge incremental entre
periodos descargados (TASK-019, RF-006) fusiona por ``time`` sin duplicar ni
borrar filas (KPI-4).

TASK-017 (pre-resampling por timeframe, ADR-007/RNF-008): además de la base
``1s`` (``{simbolo}.parquet``), se puede persistir una serie agregada por
timeframe canónico en ``{simbolo}.{tf}.parquet``, de modo que la consulta de
un timeframe lee su Parquet sin recomputar el resampling (RF-009).
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

#: Timeframes canónicos de visualización (RF-009, contrato ``Timeframe``).
#: La base ``1s`` se persiste en ``{simbolo}.parquet``; el resto (pre-resampling
#: ADR-007) en ``{simbolo}.{tf}.parquet``.
CANONICAL_TIMEFRAMES: frozenset[str] = frozenset({"1s", "1m", "5m", "15m", "1h", "4h", "1d"})


class DuplicateTimeError(ValueError):
    """La serie contiene ``time`` repetidos: viola la unicidad de RI-001."""


class InvalidTimeframeError(ValueError):
    """El timeframe no pertenece al conjunto canónico (RF-009, ADR-007)."""


class ParquetSeriesStore:
    """Almacén de series OHLC en un Parquet por activo, consultable con DuckDB.

    Un archivo ``{base_dir}/{SYMBOL}.parquet`` por activo para la base ``1s``
    (ADR-004) y ``{base_dir}/{SYMBOL}.{tf}.parquet`` para el pre-resampling por
    timeframe (TASK-017, ADR-007). La clase no conoce el catálogo de activos
    (frontera de módulos): solo valida que el símbolo sea un identificador
    seguro para usarlo como nombre de archivo.
    """

    def __init__(self, base_dir: Path) -> None:
        """Crea el almacén con el directorio base donde residen los Parquet."""
        self._base_dir = Path(base_dir)

    def path_for(self, symbol: str, timeframe: str = "1s") -> Path:
        """Devuelve la ruta del Parquet del activo para el timeframe dado.

        Args:
            symbol: Identificador del activo (base del nombre de archivo).
            timeframe: Granularidad canónica (RF-009/ADR-007); ``1s`` usa
                ``{symbol}.parquet`` y el resto ``{symbol}.{tf}.parquet``.

        Raises:
            ValueError: si el símbolo no es un identificador seguro (evita
                path traversal al construir el nombre de archivo).
            InvalidTimeframeError: si el timeframe no es canónico.
        """
        if not _SYMBOL_PATTERN.match(symbol):
            raise ValueError(f"Símbolo inválido para almacenamiento: '{symbol}'")
        if timeframe not in CANONICAL_TIMEFRAMES:
            raise InvalidTimeframeError(
                f"Timeframe no canónico: {timeframe!r}. "
                f"Válidos: {', '.join(sorted(CANONICAL_TIMEFRAMES))}"
            )
        if timeframe == "1s":
            return self._base_dir / f"{symbol}.parquet"
        return self._base_dir / f"{symbol}.{timeframe}.parquet"

    def has_series(self, symbol: str, timeframe: str = "1s") -> bool:
        """Indica si el activo ya tiene una serie Parquet para el timeframe."""
        return self.path_for(symbol, timeframe).is_file()

    def coverage(self, symbol: str) -> tuple[int, int] | None:
        """Devuelve el rango ``[min(time), max(time)]`` de la base 1s del activo.

        Determina la cobertura almacenada del activo (RF-007, CMP-006): el rango
        completo de timestamps UTC persistidos en ``{symbol}.parquet``, sin
        importar si el Parquet pre-resampling por timeframe existe (TASK-017).
        Sirve al catálogo GET /assets (TASK-020).

        Args:
            symbol: Símbolo del activo (nombre de archivo de la base 1s).

        Returns:
            Tupla ``(inicio, fin)`` con el mínimo y el máximo ``time`` en
            segundos UTC, o ``None`` si el activo no tiene serie almacenada
            (o el Parquet está vacío).

        Raises:
            ValueError: si el símbolo no es un identificador seguro.
        """
        path = self.path_for(symbol)
        if not path.is_file():
            return None
        connection = duckdb.connect()
        try:
            row = connection.execute(
                "SELECT min(time), max(time) FROM read_parquet(?)", [str(path)]
            ).fetchone()
        finally:
            connection.close()
        if row is None or row[0] is None:
            return None
        return (int(row[0]), int(row[1]))

    def write(self, symbol: str, candles: Sequence[Candle], timeframe: str = "1s") -> int:
        """Escribe la serie del activo en su Parquet de forma atómica.

        Args:
            symbol: Símbolo del activo (nombre de archivo).
            candles: Velas a persistir; se ordenan por ``time``.
            timeframe: Granularidad de la serie (RF-009). ``1s`` escribe la
                base; cualquier canónico válido escribe el Parquet
                pre-resampling de ese timeframe (TASK-017, ADR-007).

        Returns:
            Número de filas escritas.

        Raises:
            DuplicateTimeError: si ``candles`` contiene ``time`` repetidos
                (RI-001). La escritura reemplaza el archivo del activo.
            InvalidTimeframeError: si ``timeframe`` no es canónico.
        """
        path = self.path_for(symbol, timeframe)
        self._reject_duplicate_times(candles)
        rows = sorted((c.time, c.open, c.high, c.low, c.close) for c in candles)
        self._write_parquet(path, rows)
        logger.info(
            "serie_escrita",
            activo=symbol,
            timeframe=timeframe,
            velas=len(rows),
            ruta=str(path),
        )
        return len(rows)

    def merge(self, symbol: str, candles: Sequence[Candle], timeframe: str = "1s") -> int:
        """Incrementa la serie sin duplicar ``time`` ni borrar filas (RF-006).

        Une las velas nuevas con las ya persistidas, priorizando la versión
        nueva cuando ambas comparten un ``time`` (upsert RI-001) y garantizando
        KPI-4 (0 filas duplicadas por descarga). El resultado se reescribe de
        forma atómica (respeta la misma mecánica que ``write``).

        Args:
            symbol: Símbolo del activo (nombre de archivo).
            candles: Velas del periodo nuevo a fusionar.
            timeframe: Granularidad de la serie (RF-009); puede ser cualquier
                canónico pre-resampling (TASK-017, ADR-007).

        Returns:
            Total de filas almacenadas tras el merge.

        Raises:
            DuplicateTimeError: si ``candles`` contiene ``time`` repetidos
                (RI-001).
            ValueError: si el símbolo no es un identificador seguro.
            InvalidTimeframeError: si ``timeframe`` no es canónico.
        """
        path = self.path_for(symbol, timeframe)
        self._reject_duplicate_times(candles)
        incoming = sorted((c.time, c.open, c.high, c.low, c.close) for c in candles)
        if not path.is_file():
            self._write_parquet(path, incoming)
            logger.info(
                "serie_escrita",
                activo=symbol,
                timeframe=timeframe,
                velas=len(incoming),
                ruta=str(path),
            )
            return len(incoming)
        existing = self._read_rows(path)
        merged = self._merge_rows(existing, incoming)
        self._write_parquet(path, merged)
        logger.info(
            "serie_incremental",
            activo=symbol,
            timeframe=timeframe,
            filas_previas=len(existing),
            filas_nuevas=len(incoming),
            filas_totales=len(merged),
        )
        return len(merged)

    def read_range(self, symbol: str, start: int, end: int, timeframe: str = "1s") -> list[Candle]:
        """Devuelve las velas del rango inclusivo ``[start, end]`` ordenadas.

        Args:
            symbol: Símbolo del activo almacenado.
            start: Inicio del rango en segundos UTC (inclusivo).
            end: Fin del rango en segundos UTC (inclusivo).
            timeframe: Granularidad a leer (RF-009). Se lee el Parquet
                pre-resampling correspondiente sin recomputar (TASK-017).

        Returns:
            Velas del rango ordenadas ascendentemente por ``time``.

        Raises:
            InvalidTimeframeError: si ``timeframe`` no es canónico.
            FileNotFoundError: si el activo no tiene serie para el timeframe.
        """
        path = self.path_for(symbol, timeframe)
        if not path.is_file():
            raise FileNotFoundError(
                f"El activo '{symbol}' no tiene serie almacenada " f"en timeframe '{timeframe}'"
            )
        connection = duckdb.connect()
        try:
            rows = connection.execute(
                f"SELECT {_COLUMNS} FROM read_parquet(?)"
                " WHERE time BETWEEN ? AND ? ORDER BY time",
                [str(path), start, end],
            ).fetchall()
        finally:
            connection.close()
        logger.info(
            "serie_consultada",
            activo=symbol,
            timeframe=timeframe,
            inicio=start,
            fin=end,
            velas=len(rows),
        )
        return [
            Candle(time=int(time), open=open_, high=high, low=low, close=close)
            for time, open_, high, low, close in rows
        ]

    @staticmethod
    def _write_parquet(path: Path, rows: Sequence[tuple[int, float, float, float, float]]) -> None:
        """Escribe ``rows`` ordenadas por ``time`` en el Parquet de forma atómica.

        Crea la tabla ``series`` en una conexión efímera, inserta las filas y
        copia a un archivo temporal que se renombra con ``os.replace`` para que
        la escritura sea atómica (patrón de ``write``/``merge``).
        """
        rows = sorted(rows)
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

    @staticmethod
    def _read_rows(path: Path) -> list[tuple[int, float, float, float, float]]:
        """Lee todas las filas del Parquet indicado (previo al merge)."""
        connection = duckdb.connect()
        try:
            rows = connection.execute(
                f"SELECT {_COLUMNS} FROM read_parquet(?)", [str(path)]
            ).fetchall()
        finally:
            connection.close()
        return [tuple(row) for row in rows]

    @staticmethod
    def _merge_rows(
        existing: Sequence[tuple[int, float, float, float, float]],
        incoming: Sequence[tuple[int, float, float, float, float]],
    ) -> list[tuple[int, float, float, float, float]]:
        """Fusiona ambas series por ``time``; la fila nueva gana en colisiones.

        El diccionario garantiza un único valor por clave: KPI-4 (0 filas
        duplicadas por descarga). El orden de inserción se corrige con el
        ordenamiento final por ``time`` (RI-001).
        """
        merged_by_time = {row[0]: row for row in existing}
        merged_by_time.update({row[0]: row for row in incoming})
        return sorted(merged_by_time.values())

    @staticmethod
    def _reject_duplicate_times(candles: Sequence[Candle]) -> None:
        """Lanza ``DuplicateTimeError`` si hay ``time`` repetidos (RI-001)."""
        times = [candle.time for candle in candles]
        if len(set(times)) != len(times):
            raise DuplicateTimeError("La serie contiene 'time' duplicados (RI-001)")


__all__ = [
    "CANONICAL_TIMEFRAMES",
    "DuplicateTimeError",
    "InvalidTimeframeError",
    "ParquetSeriesStore",
]
