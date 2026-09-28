# Benchmark: descarga de 1 año a 1 m (TASK-074, RNF-101)

> Herramienta: `backend/scripts/benchmark_download.py`
> Ruta medida: `run_download_range` (tandas + bloques ≤30k + pacing 20 s + retry).

## Resultado registrado (2026-09-28)

| Campo | Valor |
|-------|-------|
| Activo | EURUSD |
| Rango | 2025-01-01 → 2025-12-31 (1 año, `1MIN` BID) |
| Tandas | 1 |
| Bloques | 13 |
| Velas descargadas | 370.781 |
| Tiempo medido | **309,9 s** |
| Objetivo RNF-101 | ≤ 900 s |
| Veredicto | ✅ **DENTRO del objetivo** |

**Comando ejecutado**

```bash
cd backend && RUN_DUKASCOPY_INTEGRATION=1 PYTHONPATH=src \
  uv run --extra dev python scripts/benchmark_download.py EURUSD 2025-01-01 2025-12-31
```

## Notas

- Medición contra la API real freeserv (ADR-010); reproduce la ruta de la tarea
  Celery sin persistidor (mide solo la descarga).
- El margen observado (309,9 s frente a 900 s) deja holgura para 2 años en 2
  tandas (RNF-101: 2 años ≤ 1800 s).
- El benchmark es opt-in (`RUN_DUKASCOPY_INTEGRATION=1`); la verificación
  determinista de la medición vive en `tests/ingest/test_benchmark.py`.
