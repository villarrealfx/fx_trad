"""Benchmark de escritura Parquet a volumen RNF-002 (TASK-051).

Mide ``ParquetSeriesStore.write`` y ``merge`` sobre una serie generada y proyecta
linealmente el resultado a ~18M filas (2 años a 1s, RNF-002). Contrasta con la
línea base fila a fila (~600 µs/vela, ``executemany`` de DuckDB) y verifica
KPI-4 (0 filas duplicadas tras el merge).

Uso:

```bash
cd backend && PYTHONPATH=src uv run --extra dev python scripts/benchmark_parquet.py
# o el volumen completo (≈16 min y ~4 GB de RAM):
cd backend && PYTHONPATH=src uv run --extra dev python scripts/benchmark_parquet.py --rows 18000000
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

RNF002_ROWS = 18_000_000
"""Volumen de RNF-002: 2 años a 1s (~18M filas por activo)."""

BASELINE_US_PER_ROW = 600.0
"""Línea base documentada de la escritura fila a fila (µs/vela)."""

_START = 1_772_409_600  # 2026-03-02T00:00:00Z


def _candles(start: int, count: int) -> list[Candle]:
    """Genera ``count`` velas de 1s deterministas desde ``start``."""
    return [
        Candle(
            time=start + index,
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
    """Proyecta el ritmo medido al volumen de RNF-002, en minutos."""
    return us_per_row * RNF002_ROWS / 1_000_000 / 60


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
        overlap = _candles(_START + rows - rows // 10, rows // 10 + 1)
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
    print(f"proyección write a {RNF002_ROWS:,} : {_project_minutes(write_us):5.1f} min")
    print(f"duplicados tras merge      : {duplicates} (KPI-4: 0)")

    if duplicates != 0:
        return 2
    if write_us >= BASELINE_US_PER_ROW:
        print("REGRESIÓN: la escritura no supera la línea base fila a fila")
        return 1
    return 0


def main() -> int:
    """Punto de entrada del benchmark."""
    parser = argparse.ArgumentParser(description="Benchmark de escritura Parquet (RNF-002)")
    parser.add_argument(
        "--rows",
        type=int,
        default=1_000_000,
        help="filas de la serie de prueba (default 1.000.000; RNF-002 = 18.000.000)",
    )
    args = parser.parse_args()
    if args.rows < 1:
        parser.error("--rows debe ser ≥ 1")
    return _run(args.rows)


if __name__ == "__main__":
    raise SystemExit(main())
