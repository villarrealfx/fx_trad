"""Benchmark de escritura Parquet a volumen RNF-102 (TASK-066; TASK-051).

Mide ``ParquetSeriesStore.write`` y ``merge`` sobre una serie generada y proyecta
linealmente el resultado a ~726.000 filas (2 años a 1 m, RNF-102). Contrasta con
la línea base fila a fila (~600 µs/vela, ``executemany`` de DuckDB) y verifica
KPI-4 (0 filas duplicadas tras el merge).

Uso:

```bash
cd backend && PYTHONPATH=src uv run --extra dev python scripts/benchmark_parquet.py
# o un volumen concreto:
cd backend && PYTHONPATH=src uv run --extra dev python scripts/benchmark_parquet.py --rows 200000
```

Sale con código 0 si la escritura por lotes supera la línea base; 1 si no
(regresión), o 2 si el resultado del merge no cumple KPI-4.
"""

from __future__ import annotations

import argparse
import sys
import tempfile
import time
from pathlib import Path

# Permite ejecutar el script sin instalar el paquete (`PYTHONPATH=src` también vale).
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fxtrad.contracts.ohlc import Candle  # noqa: E402
from fxtrad.logging_config import configure_logging  # noqa: E402
from fxtrad.storage import ParquetSeriesStore  # noqa: E402

RNF102_ROWS = 726_000
"""Volumen de RNF-102: 2 años a 1 m (~726k velas por activo)."""

MINUTE_SECONDS = 60
"""Paso entre velas de la serie de prueba (base 1 m, ADR-012)."""

BASELINE_US_PER_ROW = 600.0
"""Línea base documentada de la escritura fila a fila (µs/vela)."""

_START = 1_772_409_600  # 2026-03-02T00:00:00Z


def _candles(start: int, count: int) -> list[Candle]:
    """Genera ``count`` velas de 1 m deterministas desde ``start``."""
    return [
        Candle(
            time=start + index * MINUTE_SECONDS,
            open=1.0 + index,
            high=1.5 + index,
            low=0.5 + index,
            close=1.2 + index,
        )
        for index in range(count)
    ]


def _us_per_row(seconds: float, rows: int) -> float:
    """Convierte un tiempo total en µs por fila."""
    return seconds / rows * 1_000_000


def _project_minutes(us_per_row: float) -> float:
    """Proyecta el ritmo medido al volumen de RNF-102, en minutos."""
    return us_per_row * RNF102_ROWS / 1_000_000 / 60


def _run(rows: int) -> int:
    """Ejecuta el benchmark y devuelve el código de salida."""
    configure_logging(level="WARNING")  # silencia los INFO del almacén
    with tempfile.TemporaryDirectory() as tmp:
        store = ParquetSeriesStore(Path(tmp))

        candles = _candles(_START, rows)
        started = time.perf_counter()
        store.write("BENCH", candles)
        write_seconds = time.perf_counter() - started

        # Merge incremental: solape del último tramo + tramo nuevo. Su coste
        # escala con el tamaño almacenado (lee y reescribe el archivo completo).
        overlap = _candles(_START + (rows - rows // 10) * MINUTE_SECONDS, rows // 10 + 1)
        started = time.perf_counter()
        store.merge("BENCH", overlap)
        merge_seconds = time.perf_counter() - started

        stored = store.read_range("BENCH", 0, 2**31 - 1)

    write_us = _us_per_row(write_seconds, rows)
    merge_us = _us_per_row(merge_seconds, len(stored))
    duplicates = len(stored) - len({candle.time for candle in stored})

    print(f"filas escritas             : {rows:,}")
    print(f"write                      : {write_seconds:6.2f} s  ({write_us:6.1f} µs/vela)")
    print(
        f"merge (+{len(overlap) - 1:,} nuevas)   : {merge_seconds:6.2f} s  "
        f"({merge_us:6.1f} µs/fila almacenada)"
    )
    print(f"línea base fila a fila     : {BASELINE_US_PER_ROW:6.1f} µs/vela")
    print(f"aceleración write          : x{BASELINE_US_PER_ROW / write_us:4.1f}")
    print(f"proyección write a {RNF102_ROWS:,} : {_project_minutes(write_us):5.1f} min")
    print(f"duplicados tras merge      : {duplicates} (KPI-4: 0)")

    if duplicates != 0:
        return 2
    if write_us >= BASELINE_US_PER_ROW:
        print("REGRESIÓN: la escritura no supera la línea base fila a fila")
        return 1
    return 0


def main() -> int:
    """Punto de entrada del benchmark."""
    parser = argparse.ArgumentParser(description="Benchmark de escritura Parquet (RNF-102)")
    parser.add_argument(
        "--rows",
        type=int,
        default=RNF102_ROWS,
        help=f"filas de la serie de prueba (default {RNF102_ROWS:,}; RNF-102 = 726.000)",
    )
    args = parser.parse_args()
    if args.rows < 1:
        parser.error("--rows debe ser ≥ 1")
    return _run(args.rows)


if __name__ == "__main__":
    raise SystemExit(main())
