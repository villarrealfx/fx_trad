"""Persistencia de series OHLC en Parquet por activo (TASK-015, TASK-017).

Implementa la decisión ADR-004: cada activo se guarda como un archivo Parquet
de columnas ``time`` (BIGINT, segundos UTC, único por activo) y
``open/high/low/close`` (DOUBLE), consultable con DuckDB. La escritura es
atómica y rechaza ``time`` duplicados (RI-001). El merge incremental entre
periodos descargados (TASK-019, RF-006) fusiona por ``time`` sin duplicar ni
borrar filas (KPI-4).

TASK-017 (pre-resampling por timeframe, ADR-007/RNF-008): la base ``1m``
(``{simbolo}.1m.parquet``) y cada serie agregada por timeframe canónico
(``{simbolo}.{tf}.parquet``) permiten que la consulta de un timeframe lea su
Parquet sin recomputar el resampling (RF-009). La base es 1 m (ADR-012); ``1s``
ya no es un timeframe válido.
"""

from __future__ import annotations

import os
import re
from collections.abc import Sequence
from pathlib import Path

import duckdb
import structlog

from fxtrad.contracts.ohlc import Candle, Timeframe

logger = structlog.get_logger()

_SYMBOL_PATTERN = re.compile(r"^[A-Z0-9]{1,16}$")
_COLUMNS = "time, open, high, low, close"
_CREATE_TABLE = (
    "CREATE TABLE series (time BIGINT, open DOUBLE, high DOUBLE, low DOUBLE, close DOUBLE)"
)

#: Timeframe base canónico: la serie de origen de toda agregación (ADR-012).
BASE_TIMEFRAME: Timeframe = "1m"

#: Timeframes canónicos de visualización (RF-009, contrato ``Timeframe``): la
#: base ``1m`` y sus derivados por resampling (ADR-007/ADR-012). Cada timeframe
#: se persiste en ``{simbolo}.{tf}.parquet``; ``1s`` ya no es un valor válido.
CANONICAL_TIMEFRAMES: frozenset[str] = frozenset({"1m", "5m", "15m", "1h", "4h", "1d"})

#: Tamaño de lote de inserción en DuckDB (TASK-051). La inserción por lotes es
#: ~11× más rápida que fila a fila a volumen RNF-002 (~53 µs/vela frente a
#: ~589 µs/vela medidos en `scripts/benchmark_parquet.py`); lotes mayores no
#: mejoran (la sentencia `VALUES` crece demasiado).
_INSERT_BATCH_SIZE = 10_000


class DuplicateTimeError(ValueError):
    """La serie contiene ``time`` repetidos: viola la unicidad de RI-001."""


class InvalidTimeframeError(ValueError):
    """El timeframe no pertenece al conjunto canónico (RF-009, ADR-007)."""


class ParquetSeriesStore:
    """Almacén de series OHLC en un Parquet por activo, consultable con DuckDB.

    Un archivo ``{base_dir}/{SYMBOL}.{tf}.parquet`` por activo y timeframe: la
    base ``1m`` (ADR-012) y los derivados por resampling (TASK-017, ADR-007). La
    clase no conoce el catálogo de activos (frontera de módulos): solo valida que
    el símbolo sea un identificador seguro para usarlo como nombre de archivo.
    """

    def __init__(self, base_dir: Path) -> None:
        """Crea el almacén con el directorio base donde residen los Parquet."""
        self._base_dir = Path(base_dir)

    def path_for(self, symbol: str, timeframe: str = BASE_TIMEFRAME) -> Path:
        """Devuelve la ruta del Parquet del activo para el timeframe dado.

        Args:
            symbol: Identificador del activo (base del nombre de archivo).
            timeframe: Granularidad canónica (RF-009/ADR-007); la base ``1m`` y
                los derivados usan ``{symbol}.{tf}.parquet``.

        Raises:
            ValueError: si el símbolo no es un identificador seguro (evita
                path traversal al construir el nombre de archivo).
            InvalidTimeframeError: si el timeframe no es canónico (incluye
                ``1s``, que ya no es un valor válido).
        """
        if not _SYMBOL_PATTERN.match(symbol):
            raise ValueError(f"Símbolo inválido para almacenamiento: '{symbol}'")
        if timeframe not in CANONICAL_TIMEFRAMES:
            raise InvalidTimeframeError(
                f"Timeframe no canónico: {timeframe!r}. "
                f"Válidos: {', '.join(sorted(CANONICAL_TIMEFRAMES))}"
            )
        return self._base_dir / f"{symbol}.{timeframe}.parquet"

    def has_series(self, symbol: str, timeframe: str = BASE_TIMEFRAME) -> bool:
        """Indica si el activo ya tiene una serie Parquet para el timeframe."""
        return self.path_for(symbol, timeframe).is_file()

    def coverage(self, symbol: str) -> tuple[int, int] | None:
        """Devuelve el rango ``[min(time), max(time)]`` de la base 1m del activo.

        Determina la cobertura almacenada del activo (RF-007, CMP-006): el rango
        completo de timestamps UTC persistidos en ``{symbol}.1m.parquet``, sin
        importar si el Parquet pre-resampling por timeframe existe (TASK-017).
        Sirve al catálogo GET /assets (TASK-020).

        Args:
            symbol: Símbolo del activo (nombre de archivo de la base 1m).

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

    def version(self, symbol: str, timeframe: str = BASE_TIMEFRAME) -> str | None:
        """Devuelve un token de la versión almacenada del activo, o ``None``.

        El token combina ``st_mtime_ns`` y ``st_size`` del Parquet, así que
        cambia con cada ``write``/``merge`` (ambos renombran con ``os.replace``)
        y permite detectar que la serie de disco cambió sin abrir DuckDB
        (~1-2 µs). Lo consume la caché in-memory para invalidar la ventana del
        activo cuando una descarga incremental actualiza su base (TASK-045,
        ADR-007); al vivir el escritor en otro proceso (ADR-009), esta es la
        única forma de que la API detecte el cambio sin IPC.

        Args:
            symbol: Identificador del activo (nombre de archivo).
            timeframe: Granularidad canónica (RF-009); cada timeframe tiene su
                propio Parquet y por tanto su propio token.

        Returns:
            Token ``"{mtime_ns}:{size}"`` del Parquet, o ``None`` si el activo no
            tiene serie almacenada para ese timeframe.

        Raises:
            ValueError: si el símbolo no es un identificador seguro.
            InvalidTimeframeError: si ``timeframe`` no es canónico.
        """
        path = self.path_for(symbol, timeframe)
        try:
            stats = path.stat()
        except FileNotFoundError:
            return None
        return f"{stats.st_mtime_ns}:{stats.st_size}"

    def write(self, symbol: str, candles: Sequence[Candle], timeframe: str = BASE_TIMEFRAME) -> int:
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

    def merge(self, symbol: str, candles: Sequence[Candle], timeframe: str = BASE_TIMEFRAME) -> int:
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

    def read_range(
        self, symbol: str, start: int, end: int, timeframe: str = BASE_TIMEFRAME
    ) -> list[Candle]:
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
        """Escribe ``rows`` (ya ordenadas por ``time``) de forma atómica.

        Las filas se insertan **por lotes** con ``INSERT … SELECT`` (TASK-051):
        la inserción fila a fila de DuckDB degrada a ~600 µs/vela y no es viable
        a volumen RNF-002 (~18M filas). ``write``/``merge`` entregan las filas
        ordenadas por ``time``; la atomicidad la da el renombrado con
        ``os.replace`` del archivo temporal.
        """
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = path.with_suffix(".parquet.tmp")
        connection = duckdb.connect()
        try:
            connection.execute(_CREATE_TABLE)
            ParquetSeriesStore._insert_rows(connection, rows)
            connection.execute(f"COPY series TO '{tmp_path}' (FORMAT PARQUET)")
        finally:
            connection.close()
        os.replace(tmp_path, path)

    @staticmethod
    def _insert_rows(
        connection: duckdb.DuckDBPyConnection,
        rows: Sequence[tuple[int, float, float, float, float]],
    ) -> None:
        """Inserta las filas en lotes de ``_INSERT_BATCH_SIZE`` (TASK-051)."""
        for start in range(0, len(rows), _INSERT_BATCH_SIZE):
            chunk = rows[start : start + _INSERT_BATCH_SIZE]
            placeholders = ", ".join(["(?, ?, ?, ?, ?)"] * len(chunk))
            params = [value for row in chunk for value in row]
            connection.execute(f"INSERT INTO series SELECT * FROM (VALUES {placeholders})", params)

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
    "BASE_TIMEFRAME",
    "CANONICAL_TIMEFRAMES",
    "DuplicateTimeError",
    "InvalidTimeframeError",
    "ParquetSeriesStore",
]
