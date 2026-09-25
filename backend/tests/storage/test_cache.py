"""Tests de la caché in-memory por ventana (TASK-044, TASK-045, ADR-007).

TASK-044: la segunda carga del mismo rango se sirve desde memoria (sin volver a
consultar el almacén) y con latencia por debajo de 2 s (KPI-3); se comprueban
además el aislamiento de la clave, el límite por ventana y la evicción LRU que
protege la RAM (ADR-007).

TASK-045: tras una descarga incremental (un ``merge`` que reescribe el Parquet
del activo) la ventana del activo se invalida y la siguiente lectura recarga con
las velas nuevas, sin servir nunca datos obsoletos.
"""

from __future__ import annotations

import time
from pathlib import Path

import duckdb
import pytest

from fxtrad.contracts.ohlc import Candle, Timeframe
from fxtrad.storage import (
    DEFAULT_MAX_CANDLES,
    CachedSeriesQuery,
    ParquetSeriesStore,
    SeriesQuery,
    SeriesWindowCache,
    window_key,
)

_BASE_TIME = 1786442400  # 2026-08-11T10:00:00Z
_MINUTE = 60
_KPI_3_BUDGET_SECONDS = 2.0


class _CountingReader:
    """Lector con cuenta de llamadas y versión mutable, para observar la caché.

    ``version`` representa el token del Parquet del activo: cambiarlo simula
    que una descarga incremental reescribió la serie (TASK-045).
    """

    def __init__(self, candles: list[Candle], version: str = "v1") -> None:
        self.candles = candles
        self.version_token = version
        self.calls: list[tuple[str, str, int | None, int | None]] = []

    def version(self, symbol: str, timeframe: Timeframe = "1s") -> str | None:
        """Devuelve el token de versión vigente de la serie."""
        return self.version_token

    def read(
        self,
        symbol: str,
        timeframe: Timeframe = "1s",
        start: int | None = None,
        end: int | None = None,
    ) -> list[Candle]:
        """Registra la llamada y devuelve la serie precargada."""
        self.calls.append((symbol, timeframe, start, end))
        return self.candles


def _candles(count: int, *, start: int = _BASE_TIME, step: int = _MINUTE) -> list[Candle]:
    """Construye ``count`` velas planas con ``time`` correlativo."""
    return [
        Candle(time=start + i * step, open=1.0, high=1.0, low=1.0, close=1.0) for i in range(count)
    ]


class TestWindowKey:
    """La clave canónica distingue símbolo, timeframe y rango."""

    def test_normalizes_unbounded_range(self) -> None:
        assert window_key("EURUSD", "1s", None, None) == ("EURUSD", "1s", 0, 2**63 - 1)

    def test_keeps_explicit_bounds(self) -> None:
        assert window_key("EURUSD", "1m", 10, 20) == ("EURUSD", "1m", 10, 20)


class TestSeriesWindowCache:
    """El LRU acotado guarda, recupera y expulsa ventanas."""

    def test_get_returns_none_for_unknown_window(self) -> None:
        cache = SeriesWindowCache()

        assert cache.get(("EURUSD", "1s", 0, 10)) is None

    def test_put_then_get_returns_the_window(self) -> None:
        cache = SeriesWindowCache()
        candles = _candles(3)

        assert cache.put(("EURUSD", "1s", 0, 10), candles) is True
        assert cache.get(("EURUSD", "1s", 0, 10)) == tuple(candles)
        assert len(cache) == 1

    def test_window_over_the_limit_is_not_cached(self) -> None:
        cache = SeriesWindowCache(max_candles=10)

        cached = cache.put(("EURUSD", "1s", 0, 10), _candles(11))

        assert cached is False
        assert len(cache) == 0

    def test_evicts_least_recently_used_window(self) -> None:
        cache = SeriesWindowCache(max_windows=2)
        first = ("EURUSD", "1s", 0, 10)
        second = ("EURUSD", "1s", 20, 30)
        third = ("EURUSD", "1s", 40, 50)
        cache.put(first, _candles(1))
        cache.put(second, _candles(1))

        cache.get(first)  # `first` pasa a ser la más reciente
        cache.put(third, _candles(1))

        assert cache.get(second) is None
        assert cache.get(first) is not None
        assert cache.get(third) is not None
        assert len(cache) == 2

    @pytest.mark.parametrize(("windows", "candles"), [(0, 10), (1, 0), (-1, 5)])
    def test_rejects_limits_below_one(self, windows: int, candles: int) -> None:
        with pytest.raises(ValueError, match=">= 1"):
            SeriesWindowCache(max_windows=windows, max_candles=candles)


class TestCachedSeriesQuery:
    """La segunda lectura del mismo rango se sirve desde memoria (DoD)."""

    def test_second_read_does_not_query_the_store(self) -> None:
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)

        first = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)
        second = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        assert second == first
        assert len(reader.calls) == 1
        assert query.stats.hits == 1
        assert query.stats.misses == 1

    def test_different_symbol_does_not_reuse_the_window(self) -> None:
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)

        query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)
        query.read("XAUUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        assert [call[0] for call in reader.calls] == ["EURUSD", "XAUUSD"]

    def test_different_timeframe_does_not_reuse_the_window(self) -> None:
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)

        query.read("EURUSD", timeframe="1s", start=_BASE_TIME, end=_BASE_TIME + 300)
        query.read("EURUSD", timeframe="1m", start=_BASE_TIME, end=_BASE_TIME + 300)

        assert [call[1] for call in reader.calls] == ["1s", "1m"]

    def test_different_range_does_not_reuse_the_window(self) -> None:
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)

        query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)
        query.read("EURUSD", start=_BASE_TIME + 600, end=_BASE_TIME + 900)

        assert [call[2] for call in reader.calls] == [_BASE_TIME, _BASE_TIME + 600]

    def test_unbounded_reads_share_the_same_window(self) -> None:
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)

        query.read("EURUSD")
        query.read("EURUSD", start=0, end=2**63 - 1)

        assert len(reader.calls) == 1

    def test_caller_cannot_mutate_the_cached_window(self) -> None:
        reader = _CountingReader(_candles(3))
        query = CachedSeriesQuery(reader)

        first = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)
        first.clear()
        second = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        assert len(second) == 3

    def test_window_over_the_limit_is_served_but_not_reused(self) -> None:
        reader = _CountingReader(_candles(50))
        query = CachedSeriesQuery(reader, SeriesWindowCache(max_candles=10))

        first = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 3000)
        second = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 3000)

        assert second == first
        assert len(reader.calls) == 2


class TestCachedSeriesLatency:
    """KPI-3: la segunda carga desde memoria baja de 2 s con datos reales."""

    def test_cached_window_is_served_under_budget(self, tmp_path: Path) -> None:
        """Ventana en el tope por defecto de 200k velas, el peor caso cacheable."""
        store = ParquetSeriesStore(tmp_path)
        _write_window_parquet(store.path_for("EURUSD", "1m"), DEFAULT_MAX_CANDLES)
        query = CachedSeriesQuery(SeriesQuery(store))

        first = query.read("EURUSD", timeframe="1m")
        started = time.perf_counter()
        second = query.read("EURUSD", timeframe="1m")
        elapsed = time.perf_counter() - started

        assert len(first) == DEFAULT_MAX_CANDLES
        assert second == first
        assert elapsed < _KPI_3_BUDGET_SECONDS, f"segunda carga: {elapsed:.3f}s"

    def test_second_read_serves_the_same_version_from_memory(self, tmp_path: Path) -> None:
        """Sin cambios en disco, la segunda lectura no vuelve a consultar DuckDB."""
        store = ParquetSeriesStore(tmp_path)
        _write_window_parquet(store.path_for("EURUSD", "1m"), 2_000)
        query = CachedSeriesQuery(SeriesQuery(store))

        first = query.read("EURUSD", timeframe="1m")
        second = query.read("EURUSD", timeframe="1m")

        assert second == first
        assert query.stats.hits == 1


def _write_window_parquet(path: Path, count: int) -> None:
    """Materializa un Parquet de ``count`` velas con el esquema de ``series``.

    Se escribe con DuckDB en un solo ``INSERT ... SELECT`` porque
    ``ParquetSeriesStore.write`` inserta fila a fila (~600 µs/vela) y un fixture
    de 200k velas costaría minutos. El camino de lectura bajo prueba (DuckDB +
    ``SeriesQuery``) sí es el real.
    """
    connection = duckdb.connect()
    try:
        connection.execute(
            "CREATE TABLE series (time BIGINT, open DOUBLE, high DOUBLE, low DOUBLE, close DOUBLE)"
        )
        connection.execute(
            "INSERT INTO series SELECT ?, 1.0, 1.0, 1.0, 1.0 FROM range(?)",
            [_BASE_TIME, count],
        )
        connection.execute(f"COPY series TO '{path}' (FORMAT PARQUET)")
    finally:
        connection.close()


class TestCacheInvalidation:
    """TASK-045: la descarga incremental invalida la ventana del activo."""

    def test_changed_version_invalidates_and_reloads(self) -> None:
        """Cambia el token de versión y la lectura recarga desde el lector."""
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)
        first = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        reader.candles = _candles(8)  # el merge añadió velas
        reader.version_token = "v2"  # el Parquet del activo se reescribió
        second = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        assert len(first) == 5
        assert len(second) == 8
        assert len(reader.calls) == 2
        assert query.stats.invalidations == 1

    def test_unchanged_version_still_hits(self) -> None:
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)

        query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)
        second = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        assert len(second) == 5
        assert query.stats.hits == 1
        assert query.stats.invalidations == 0

    def test_reloaded_window_is_cached_again(self) -> None:
        """Tras la recarga, la tercera lectura vuelve a servirse de memoria."""
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)
        query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)
        reader.version_token = "v2"
        query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        third = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        assert len(reader.calls) == 2
        assert query.stats.hits == 1
        assert len(third) == 5

    def test_missing_version_invalidates_the_window(self) -> None:
        """Si el Parquet desaparece, la ventana cacheada deja de servirse."""
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)
        query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        reader.version_token = ""  # el almacén ya no tiene la serie
        second = query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        assert len(second) == 5
        assert len(reader.calls) == 2

    def test_invalidate_drops_only_the_given_symbol(self) -> None:
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)
        query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)
        query.read("XAUUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        discarded = query.invalidate("EURUSD")

        assert discarded == 1
        assert query.stats.invalidations == 1
        query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)
        query.read("XAUUSD", start=_BASE_TIME, end=_BASE_TIME + 300)
        assert [call[0] for call in reader.calls] == ["EURUSD", "XAUUSD", "EURUSD"]
        assert query.stats.hits == 1

    def test_invalidate_drops_every_window_of_the_symbol(self) -> None:
        """Un activo puede tener varias ventanas (rango y timeframe distintos)."""
        reader = _CountingReader(_candles(5))
        query = CachedSeriesQuery(reader)
        query.read("EURUSD", timeframe="1s", start=_BASE_TIME, end=_BASE_TIME + 300)
        query.read("EURUSD", timeframe="1m", start=_BASE_TIME, end=_BASE_TIME + 300)

        discarded = query.invalidate("EURUSD")

        assert discarded == 2

    def test_invalidate_unknown_symbol_is_a_noop(self) -> None:
        query = CachedSeriesQuery(_CountingReader(_candles(5)))
        query.read("EURUSD", start=_BASE_TIME, end=_BASE_TIME + 300)

        assert query.invalidate("XAUUSD") == 0
        assert query.stats.invalidations == 0


class TestIncrementalDownloadInvalidation:
    """DoD TASK-045 con Parquet + DuckDB reales: merge y recarga."""

    def test_merge_inside_the_window_reloads_with_the_new_candles(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _candles(300, step=1), timeframe="1m")
        query = CachedSeriesQuery(SeriesQuery(store))
        params = {"timeframe": "1m", "start": _BASE_TIME, "end": _BASE_TIME + 600}

        first = query.read("EURUSD", **params)  # type: ignore[arg-type]
        store.merge("EURUSD", _candles(3, start=_BASE_TIME + 300, step=1), timeframe="1m")
        second = query.read("EURUSD", **params)  # type: ignore[arg-type]

        assert len(first) == 300
        assert len(second) == 303
        assert query.stats.invalidations == 1
        assert query.stats.misses == 2

    def test_merge_of_a_new_period_adds_the_candles(self, tmp_path: Path) -> None:
        """La ventana sin cota inferior refleja el periodo descargado tras el merge."""
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _candles(300, step=1), timeframe="1m")
        query = CachedSeriesQuery(SeriesQuery(store))
        first = query.read("EURUSD", timeframe="1m")

        store.merge("EURUSD", _candles(60, start=_BASE_TIME + 300, step=1), timeframe="1m")
        second = query.read("EURUSD", timeframe="1m")

        assert len(first) == 300
        assert len(second) == 360
        assert second[-1].time == _BASE_TIME + 359
        assert (query.stats.hits, query.stats.misses) == (0, 2)

    def test_merge_of_another_symbol_keeps_the_window(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        store.write("EURUSD", _candles(300, step=1), timeframe="1m")
        store.write("XAUUSD", _candles(300, step=1), timeframe="1m")
        query = CachedSeriesQuery(SeriesQuery(store))
        first = query.read("EURUSD", timeframe="1m")

        store.merge("XAUUSD", _candles(60, start=_BASE_TIME + 300, step=1), timeframe="1m")
        second = query.read("EURUSD", timeframe="1m")

        assert second == first
        assert query.stats.hits == 1
        assert query.stats.invalidations == 0
