# Matriz de Trazabilidad — Iteración 02

> Diseño completado en `/sdd-stack`; columna Tarea completada en `/sdd-backlog`.
> La columna Prueba se llena en `/sdd-implement` / `/sdd-track`.

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RF-101 | `ingest` planificador + `FreeservClient` 1m (ADR-012/013/014) | TASK-053, TASK-057 | `tests/ingest/test_freeserv.py::TestDownloadRange::test_passes_min_1_interval_and_bid` | 🔵 |
| RF-102 | Planificador: bloques ≤30k + pacing (ADR-013) | TASK-052, TASK-054, TASK-058 | `tests/ingest/test_planner.py::TestPlanBlocks::test_one_year_blocks_within_limit_and_sum_matches` | 🔵 |
| RF-103 | `pipeline.resample` base 1m (ADR-012) | TASK-059, TASK-061, TASK-062, TASK-063 | [pendiente] | 🔵 |
| RF-104 | Tandas + Celery (ADR-015/016) | TASK-056, TASK-064, TASK-065 | [pendiente] | 🔵 |
| RF-105 | `persist`/`storage` upsert + metadata (ADR-004) | TASK-068 | [pendiente] | 🔵 |
| RF-106 | `pipeline.filter` + `calendar` (01-mvp) | TASK-069 | [pendiente] | 🔵 |
| RNF-101 | Planificador + pacing (ADR-013) | TASK-054, TASK-074 | [pendiente] | 🔵 |
| RNF-102 | `storage` Parquet + caché (ADR-004/007/012) | TASK-060, TASK-066 | [pendiente] | 🔵 |
| RNF-003 | `ingest.window` | TASK-071 | [pendiente] | 🔵 |
| RNF-004 | `pipeline.normalize` + `ingest.times` | TASK-070 | [pendiente] | 🔵 |
| RNF-005 | SPA React (ADR-003) | TASK-073, TASK-UI-061 | [pendiente] | 🔵 |
| RNF-006 | Stack OSS, sin deps nuevas (ADR-008) | TASK-072 | [pendiente] | 🔵 |
| RNF-007 | Alcance acotado a `ingest` + base | TECH-002 | [pendiente] | 🔵 |
| RNF-008 | Contrato `Candle` → `lightweight-charts` (ADR-005) | TASK-070 | [pendiente] | 🔵 |
| RI-101 | Esquema serie base 1m (ADR-004/012) | TASK-060 | [pendiente] | 🔵 |
| RI-102 | Naming `{symbol}.1m.parquet` + derivadas (ADR-004/007) | TASK-060 | [pendiente] | 🔵 |
| RI-002 | `storage.metadata` (ADR-004) | TASK-068 | [pendiente] | 🔵 |
| RX-101 | `ingest.freeserv` 1m + BID (ADR-013/014) | TASK-053, TASK-055 | `tests/ingest/test_freeserv.py::TestDownloadRange::test_returns_one_minute_candles` | 🔵 |
| RX-001 | `ingest.retry` backoff por bloque (ADR-010/016) | TASK-055 | [pendiente] | 🔵 |

**Leyenda:** 🟡 pendiente · 🔵 en progreso · 🟢 completo · 🔴 bloqueado

## Notas de trazabilidad

- **RNF-002 (01-mvp)** queda **reemplazado** por **RNF-102** (base 1 m).
- **RF-001..RF-016 (01-mvp)** se mantienen vigentes; esta iteración solo cambia la
  resolución base y el transporte de descarga.
- **Cobertura:** 19/19 requisitos de la iteración con ≥1 tarea. Tareas sin requisito:
  `TECH-002` (cierre de iteración, justificada en `backlog.md` §8).
- **Deuda a resolver:** `benchmark_parquet.py`, RNF-002 y la nota "1 s UTC" de
  SCR-002 → cubiertas por TASK-066, TASK-067 y TASK-UI-061.
