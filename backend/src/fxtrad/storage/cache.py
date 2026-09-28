"""Caché in-memory de ventanas de serie OHLC (TASK-044, TASK-045, ADR-007).

Implementa el nivel 1 de la caché Karst (ADR-007): la ventana visible del
activo+timeframe actual se materializa una vez y se sirve en memoria para las
cargas repetidas del mismo rango, sin volver a consultar DuckDB (RNF-001,
RNF-002, KPI-3). El nivel 2 (Parquet pre-resampling por timeframe) ya lo resuelve
``ParquetSeriesStore`` (TASK-017).

La caché es por ventana y acotada: ADR-007 descarta explícitamente cachear las
~18M filas por activo ("bastan ventanas por rango"), así que solo se retienen
``max_windows`` ventanas de hasta ``max_candles`` velas cada una, con evicción
LRU.

TASK-045 añade la invalidación por descarga incremental, que es la consecuencia
negativa que ADR-007 declara ("caché de invalidación por activo actualizado"). El
escritor (worker Celery) vive en otro proceso (ADR-009), así que la invalidación
no puede propagarse por llamada directa: cada ventana guarda el token de versión
del Parquet de origen (TASK-019) y, si al leerlo ha cambiado, la ventana se
descarta y se recarga desde DuckDB. ``invalidate`` cubre además el caso del
mismo proceso, donde el merge sí es local.
"""

from __future__ import annotations

import threading
from collections import OrderedDict
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

import structlog

from fxtrad.contracts.ohlc import Candle, Timeframe
from fxtrad.storage.series import BASE_TIMEFRAME

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
        timeframe: Timeframe = BASE_TIMEFRAME,
        start: int | None = None,
        end: int | None = None,
    ) -> list[Candle]:
        """Devuelve las velas del activo en el rango inclusivo ``[start, end]``."""
        ...


class VersionedSeriesReader(SeriesReader, Protocol):
    """Lector que además expone la versión de la serie en disco (TASK-045).

    Exigirla en el decorador evita construir una caché que no puede detectar que
    la base del activo cambió con una descarga incremental y sirviera datos
    obsoletos (ADR-007).
    """

    def version(self, symbol: str, timeframe: Timeframe = BASE_TIMEFRAME) -> str | None:
        """Devuelve el token de versión de la serie, o ``None`` si no existe."""
        ...


@dataclass(frozen=True, slots=True)
class CachedWindow:
    """Ventana materializada junto al token de versión de su origen (TASK-045).

    El token es ``"{mtime_ns}:{size}"`` del Parquet (o ``""`` si la caché se
    usa sin fuente de versión). Si al leer la ventana el token ha cambiado, la
    ventana está obsoleta: una descarga incremental actualizó la base.
    """

    version: str
    candles: tuple[Candle, ...]


@dataclass(frozen=True, slots=True)
class CacheStats:
    """Aciertos, fallos e invalidaciones desde la creación (observabilidad)."""

    hits: int
    misses: int
    invalidations: int = 0


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
        self._windows: OrderedDict[WindowKey, CachedWindow] = OrderedDict()
        self._invalidations = 0
        self._lock = threading.Lock()

    def get(self, key: WindowKey, version: str = "") -> tuple[Candle, ...] | None:
        """Devuelve la ventana cacheada si su versión sigue vigente.

        Invalida la ventana cuando ``version`` no coincide con la guardada, que es
        lo que ocurre cuando una descarga incremental reescribe el Parquet de
        origen (TASK-045, ADR-007). La siguiente lectura la recargará.

        Args:
            key: Clave canónica de la ventana.
            version: Token de versión actual de la serie en disco.

        Returns:
            Tupla de velas cacheada, o ``None`` si no había esa ventana o si
            quedó obsoleta.
        """
        with self._lock:
            window = self._windows.get(key)
            if window is None:
                return None
            if window.version != version:
                del self._windows[key]
                self._invalidations += 1
                logger.info(
                    "cache_ventana_invalida",
                    motivo="version_desfasada",
                    activo=key[0],
                    timeframe=key[1],
                    inicio=key[2],
                    fin=key[3],
                    velas=len(window.candles),
                    version_previa=window.version,
                    version_actual=version,
                )
                return None
            self._windows.move_to_end(key)
            return window.candles

    def put(self, key: WindowKey, candles: Sequence[Candle], version: str = "") -> bool:
        """Cachea la ventana y expulsa las más antiguas si excede el límite.

        Args:
            key: Clave canónica de la ventana.
            candles: Velas materializadas de la ventana.
            version: Token de versión del Parquet del que proceden, para poder
                invalidarla cuando cambie (TASK-045).

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
            self._windows[key] = CachedWindow(version=version, candles=tuple(candles))
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

    def invalidate(self, symbol: str) -> int:
        """Descarta todas las ventanas cacheadas de un activo (TASK-045).

        Es la invalidación explícita del ADR-007 ("caché de invalidación por
        activo actualizado"), para el caso en que el merge ocurre en el mismo
        proceso que la caché. Cubre cualquier timeframe y rango del activo; la
        siguiente lectura de cada ventana recarga desde DuckDB.

        Args:
            symbol: Símbolo del activo cuyas ventanas se descartan.

        Returns:
            Número de ventanas descartadas.
        """
        with self._lock:
            keys = [key for key in self._windows if key[0] == symbol]
            for key in keys:
                del self._windows[key]
            self._invalidations += len(keys)
        logger.info("cache_activo_invalidado", activo=symbol, ventanas=len(keys))
        return len(keys)

    @property
    def invalidations(self) -> int:
        """Ventanas descartadas desde la creación, por versión o por símbolo.

        Es la fuente de verdad del contador que expone ``CachedSeriesQuery.stats``:
        la caché es quien decide qué ventana deja de servirse.
        """
        with self._lock:
            return self._invalidations

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

    Cada ventana se cachea junto al token de versión de la serie en disco. Al
    leerla, si el token ha cambiado (una descarga incremental reescribió el
    Parquet, TASK-019) la ventana se invalida y se recarga: la caché nunca
    devuelve datos obsoletos aunque el escritor esté en otro proceso (ADR-009).

    Args:
        reader: Lectura de series que resuelve los fallos de caché y expone la
            versión de la serie en disco (``SeriesQuery.version``).
        cache: Caché de ventanas; por defecto una con los límites de ADR-007.
    """

    def __init__(
        self,
        reader: VersionedSeriesReader,
        cache: SeriesWindowCache | None = None,
    ) -> None:
        self._reader = reader
        self._cache = cache if cache is not None else SeriesWindowCache()
        self._hits = 0
        self._misses = 0
        self._lock = threading.Lock()

    def read(
        self,
        symbol: str,
        timeframe: Timeframe = BASE_TIMEFRAME,
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
        version = self._reader.version(symbol, timeframe) or ""
        cached = self._cache.get(key, version)
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
        self._cache.put(key, candles, version)
        return candles

    def invalidate(self, symbol: str) -> int:
        """Invalida en memoria las ventanas del activo (TASK-045, ADR-007).

        Pensado para cuando el merge ocurre en el mismo proceso que la caché. Si
        el escritor está en otro proceso no hace falta: la comprobación de
        versión de ``read`` detecta el cambio en la siguiente lectura.

        Args:
            symbol: Símbolo del activo cuyas ventanas se descartan.

        Returns:
            Número de ventanas descartadas.
        """
        return self._cache.invalidate(symbol)

    @property
    def stats(self) -> CacheStats:
        """Contadores de aciertos, fallos e invalidaciones desde la creación."""
        with self._lock:
            hits, misses = self._hits, self._misses
        return CacheStats(hits=hits, misses=misses, invalidations=self._cache.invalidations)

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
    "CachedWindow",
    "SeriesReader",
    "SeriesWindowCache",
    "VersionedSeriesReader",
    "window_key",
]
