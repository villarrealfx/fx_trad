"""Benchmark real de descarga de 1 año a 1 m (TASK-074, RNF-101).

Mide con la ruta de producción (tandas + bloques + pacing + retry) una descarga
de un año contra Dukascopy y verifica el objetivo de RNF-101 (≤ 900 s). Requiere
red real: se activa con ``RUN_DUKASCOPY_INTEGRATION=1``.

Uso:

```bash
cd backend && PYTHONPATH=src uv run --extra dev python scripts/benchmark_download.py
# o un activo y rango concretos (YYYY-MM-DD): <script> GBPUSD 2025-01-01 2025-12-31
```

Sale con código 0 si cumple el objetivo, 1 si lo excede y 2 si no hay red
habilitada.
"""

from __future__ import annotations

import os
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Permite ejecutar el script sin instalar el paquete (`PYTHONPATH=src` también vale).
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fxtrad.ingest import FreeservClient  # noqa: E402
from fxtrad.ingest.benchmark import (  # noqa: E402
    DOWNLOAD_TARGET_SECONDS,
    YEAR_SECONDS,
    benchmark_download,
)


def _parse_args(argv: list[str]) -> tuple[str, int, int]:
    """Resuelve ``(símbolo, inicio, fin)``; por defecto 1 año hasta hoy (UTC)."""
    symbol = argv[1] if len(argv) > 1 else "EURUSD"
    if len(argv) > 3:
        start = datetime.strptime(argv[2], "%Y-%m-%d").replace(tzinfo=UTC)
        end = datetime.strptime(argv[3], "%Y-%m-%d").replace(tzinfo=UTC)
    else:
        end = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        start = end - timedelta(seconds=YEAR_SECONDS)
    return symbol, int(start.timestamp()), int(end.timestamp())


def main(argv: list[str]) -> int:
    """Ejecuta el benchmark y devuelve el código de salida."""
    if os.getenv("RUN_DUKASCOPY_INTEGRATION") != "1":
        print("Requerido: RUN_DUKASCOPY_INTEGRATION=1 (red real a Dukascopy)")
        return 2
    symbol, start, end = _parse_args(argv)
    result = benchmark_download(FreeservClient(), symbol, start, end)
    print(f"activo            : {symbol}")
    print(f"rango             : {start}..{end} ({end - start} s)")
    print(f"tandas            : {result.tandas}")
    print(f"bloques           : {result.bloques}")
    print(f"velas             : {result.velas:,}")
    print(f"tiempo            : {result.elapsed_seconds:8.1f} s")
    print(f"objetivo (RNF-101): {DOWNLOAD_TARGET_SECONDS:8.1f} s")
    if result.within_target:
        print("VEREDICTO         : DENTRO del objetivo")
        return 0
    print("VEREDICTO         : EXCEDE el objetivo")
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
