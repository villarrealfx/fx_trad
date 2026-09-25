"""Caché in-memory de ventanas de serie OHLC (TASK-044, ADR-007).

Implementa el nivel 1 de la caché Karst (ADR-007): la ventana visible del
activo+timeframe actual se materializa una vez y se sirve en memoria para las
cargas repetidas del mismo rango, sin volver a consultar DuckDB (RNF-001,
RNF-002, KPI-3). El nivel 2 (Parquet pre-resampling por timeframe) ya lo resuelve
``ParquetSeriesStore`` (TASK-017).

La caché es por ventana y acotada: ADR-007 descarta explícitamente cachear las
~18M filas por activo ("bastan ventanas por rango"), así que solo se retienen
``max_windows`` ventanas de hasta ``max_candles`` velas cada una, con evicción
LRU. La invalidación por descarga incremental (tras un ``merge`` de TASK-019)
es TASK-045; hasta entonces la ventana cacheada de un activo no se expulsa sola.
"""

from __future__ import annotations

import threading
from collections import OrderedDict
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

import structlog

from fxtrad.contracts.ohlc import Candle, Timeframe

logger = structlog.get_logger()

#: Límite por defecto de ventanas retenidas a la vez.
DEFAULT_MAX_WINDOWS = 8
#: Límite por defecto de velas por ventana (protege la RAM, RNF-002).
DEFAULT_MAX_CANDLES = 200_000

#: Cota superior canónica para un rango sin cota (``end=None``).
_UNBOUNDED_TIME = 2**63 - 1

type WindowKey = tuple[str, str, int, int]
"""Clave canónica de ventana: símbolo, timeframe, inicio y fin (segundos UTC)."""


class SeriesReader(Protocol):
    """Contrato mínimo de lectura de series que consume la API (TASK-016)."""

    def read(
        self,
        symbol: str,
        timeframe: Timeframe = "1s",
        start: int | None = None,
        end: int | None = None,
    ) -> list[Candle]:
        """Devuelve las velas del activo en el rango inclusivo ``[start, end]``."""
        ...


@dataclass(frozen=True, slots=True)
class CacheStats:
    """Aciertos y fallos de la caché desde su creación (observabilidad KPI-3)."""

    hits: int
    misses: int


def window_key(
    symbol: str,
    timeframe: Timeframe,
    start: int | None,
    end: int | None,
) -> WindowKey:
    """Normaliza una consulta a la clave canónica de su ventana.

    Los rangos sin cota se traducen a ``[0, 2**63 - 1]`` para que dos llamadas
    sin límites distintos compartan la misma ventana en lugar de duplicarla.

    Args:
        symbol: Símbolo del activo.
        timeframe: Granularidad canónica (RF-009).
        start: Inicio en segundos UTC o ``None`` si no hay cota inferior.
        end: Fin en segundos UTC o ``None`` si no hay cota superior.

    Returns:
        Tupla ``(symbol, timeframe, start, end)`` comparable y hasheable.
    """
    return (
        symbol,
        timeframe,
        0 if start is None else start,
        _UNBOUNDED_TIME if end is None else end,
    )


class SeriesWindowCache:
    """LRU acotado de ventanas de serie ya materializadas (ADR-007, TASK-044).

    Guarda tuplas inmutables de ``Candle`` (modelo congelado, RNF-008) y está
    pensada para el acceso concurrente de las rutas síncronas de FastAPI, que
    se ejecutan en un threadpool.

    Args:
        max_windows: Máximo de ventanas retenidas simultáneamente.
        max_candles: Máximo de velas por ventana; una ventana mayor no se cachea.

    Raises:
        ValueError: si algún límite es menor que 1.
    """

    def __init__(
        self,
        max_windows: int = DEFAULT_MAX_WINDOWS,
        max_candles: int = DEFAULT_MAX_CANDLES,
    ) -> None:
        if max_windows < 1:
            raise ValueError("max_windows debe ser >= 1")
        if max_candles < 1:
            raise ValueError("max_candles debe ser >= 1")
        self._max_windows = max_windows
        self._max_candles = max_candles
        self._windows: OrderedDict[WindowKey, tuple[Candle, ...]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: WindowKey) -> tuple[Candle, ...] | None:
        """Devuelve la ventana cacheada y la marca como recién usada.

        Args:
            key: Clave canónica de la ventana.

        Returns:
            Tupla de velas cacheada, o ``None`` si no había esa ventana.
        """
        with self._lock:
            candles = self._windows.get(key)
            if candles is None:
                return None
            self._windows.move_to_end(key)
            return candles

    def put(self, key: WindowKey, candles: Sequence[Candle]) -> bool:
        """Cachea la ventana y expulsa las más antiguas si excede el límite.

        Args:
            key: Clave canónica de la ventana.
            candles: Velas materializadas de la ventana.

        Returns:
            ``True`` si la ventana quedó cacheada; ``False`` si supera
            ``max_candles`` y se sirve sin cachear.
        """
        symbol, timeframe, start, end = key
        if len(candles) > self._max_candles:
            logger.info(
                "cache_ventana_descartada",
                activo=symbol,
                timeframe=timeframe,
                inicio=start,
                fin=end,
                velas=len(candles),
                tope_ventas=self._max_candles,
            )
            return False
        with self._lock:
            self._windows[key] = tuple(candles)
            self._windows.move_to_end(key)
            evicted = self._evict_locked()
            retained = len(self._windows)
        logger.info(
            "serie_cacheada",
            activo=symbol,
            timeframe=timeframe,
            inicio=start,
            fin=end,
            velas=len(candles),
            ventanas=retained,
            expulsadas=evicted,
        )
        return True

    def __len__(self) -> int:
        """Devuelve cuántas ventanas hay retenidas ahora mismo."""
        with self._lock:
            return len(self._windows)

    def _evict_locked(self) -> int:
        """Expulsa ventanas por LRU hasta respetar el límite (con lock tomado)."""
        evicted = 0
        while len(self._windows) > self._max_windows:
            self._windows.popitem(last=False)
            evicted += 1
        return evicted


class CachedSeriesQuery:
    """Sirve la serie desde la caché in-memory y delega el fallo en el almacén.

    Decorador de cualquier ``SeriesReader`` (``SeriesQuery`` de TASK-016): en un
    acierto devuelve la copia de la ventana sin tocar DuckDB, y en un fallo
    materializa la ventana, la cachea si cabe en los límites y la devuelve.

    Args:
        reader: Lectura de series que resuelve los fallos de caché.
        cache: Caché de ventanas; por defecto una con los límites de ADR-007.
    """

    def __init__(self, reader: SeriesReader, cache: SeriesWindowCache | None = None) -> None:
        self._reader = reader
        self._cache = cache if cache is not None else SeriesWindowCache()
        self._hits = 0
        self._misses = 0
        self._lock = threading.Lock()

    def read(
        self,
        symbol: str,
        timeframe: Timeframe = "1s",
        start: int | None = None,
        end: int | None = None,
    ) -> list[Candle]:
        """Devuelve las velas del rango, desde memoria si la ventana está cacheada.

        Args:
            symbol: Símbolo del activo (identificador del catálogo).
            timeframe: Granularidad canónica (RF-009).
            start: Inicio del rango en segundos UTC (inclusivo) o ``None``.
            end: Fin del rango en segundos UTC (inclusivo) o ``None``.

        Returns:
            Velas del rango ordenadas por ``time``; en un acierto de caché es una
            copia, de modo que el llamante nunca puede mutar la ventana cacheada.
        """
        key = window_key(symbol, timeframe, start, end)
        cached = self._cache.get(key)
        if cached is not None:
            self._count(hit=True)
            logger.debug(
                "cache_ventana_servida",
                activo=symbol,
                timeframe=timeframe,
                inicio=key[2],
                fin=key[3],
                velas=len(cached),
            )
            return list(cached)
        self._count(hit=False)
        candles = self._reader.read(symbol, timeframe=timeframe, start=start, end=end)
        self._cache.put(key, candles)
        return candles

    @property
    def stats(self) -> CacheStats:
        """Contadores de aciertos y fallos de caché desde la creación."""
        with self._lock:
            return CacheStats(hits=self._hits, misses=self._misses)

    def _count(self, *, hit: bool) -> None:
        """Suma un acierto o un fallo en los contadores de observabilidad."""
        with self._lock:
            if hit:
                self._hits += 1
            else:
                self._misses += 1


__all__ = [
    "DEFAULT_MAX_CANDLES",
    "DEFAULT_MAX_WINDOWS",
    "CacheStats",
    "CachedSeriesQuery",
    "SeriesReader",
    "SeriesWindowCache",
    "window_key",
]
