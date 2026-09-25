"""Tests de la caché in-memory por ventana (TASK-044, ADR-007, RNF-001/RNF-002).

DoD: la segunda carga del mismo rango se sirve desde memoria (sin volver a
consultar el almacén) y con latencia por debajo de 2 s (KPI-3). Los tests
comprueban además el aislamiento de la clave, el límite por ventana y la
evicción LRU que protege la RAM (ADR-007).
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
    """Lector con cuenta de llamadas para observar si se consulta el almacén."""

    def __init__(self, candles: list[Candle]) -> None:
        self._candles = candles
        self.calls: list[tuple[str, str, int | None, int | None]] = []

    def read(
        self,
        symbol: str,
        timeframe: Timeframe = "1s",
        start: int | None = None,
        end: int | None = None,
    ) -> list[Candle]:
        """Registra la llamada y devuelve la serie precargada."""
        self.calls.append((symbol, timeframe, start, end))
        return self._candles


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

    def test_second_read_avoids_opening_the_parquet(self, tmp_path: Path) -> None:
        store = ParquetSeriesStore(tmp_path)
        path = store.path_for("EURUSD", "1m")
        _write_window_parquet(path, 2_000)
        query = CachedSeriesQuery(SeriesQuery(store))

        query.read("EURUSD", timeframe="1m")
        path.unlink()  # el Parquet ya no aporta datos: solo puede salir de memoria
        cached = query.read("EURUSD", timeframe="1m")

        assert len(cached) == 2_000


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
