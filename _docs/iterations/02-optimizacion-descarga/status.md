# Estado del Proyecto: Optimización de descarga y base 1m (Iteración 02)

> Última actualización: 2026-09-28
> Fuente: `_docs/iterations/02-optimizacion-descarga/backlog.md`, `traceability.md`

## 1. Resumen ejecutivo
| Métrica | Valor | Δ vs última sesión |
|---------|-------|---------------------|
| Tareas totales | 24 (+1 TECH-002) | — |
| 📥 Backlog | 12 (+1) | −1 |
| 🔨 Doing | 0 | — |
| 👀 Review | 0 | — |
| ✅ Done | 12 | +1 |
| 🔴 Blocked | 0 | — |
| % Completado | 50% (12/24) | +4% |
| Días sin movimiento | 0 | — |

**Estado general:** 🟢 En curso

## 2. Tablero Kanban

### 📥 Backlog (13)
| ID | Tarea | Épica | Est. | Deps |
|----|-------|-------|------|------|
| TASK-058 | Test integridad paginación | EP-005 | M | TASK-056 ✅ |
| TASK-074 | Benchmark descarga 1 año | EP-005 | M | TASK-056 ✅, TASK-058 |
| TASK-066 | Benchmark parquet 726k | EP-006 | S | TASK-060 ✅ |
| TASK-070 | Verificar UTC/contrato | EP-006 | S | TASK-059 ✅ |
| TASK-065 | Reanudación | EP-007 | M | TASK-064 ✅ |
| TASK-071 | Verificar ventana 2a | EP-007 | XS | — |
| TASK-068 | Verificar upsert/metadatos | EP-008 | S | TASK-061 ✅ |
| TASK-069 | Verificar weekend/feriados | EP-008 | S | TASK-059 ✅ |
| TASK-UI-061 | Nota 1m SCR-002 | EP-UI-007 | XS | — |
| TASK-073 | Smoke app | EP-UI-007 | S | TASK-062 ✅ |
| TASK-067 | Docs RNF-002 | TEC-005 | XS | — |
| TASK-072 | Auditoría licencias | TEC-005 | XS | — |
| TECH-002 | Cierre iteración 02 | — | M | — |

### 🔨 Doing (0)
| ID | Tarea | Épica | Est. | Iniciada | Días en curso |
|----|-------|-------|------|----------|---------------|
| — | — | — | — | — | — |

### 👀 Review (0)
| ID | Tarea | Épica | Est. | En review desde |
|----|-------|-------|------|-----------------|
| — | — | — | — | — |

### ✅ Done (12)
| ID | Tarea | Épica | Completada | Prueba |
|----|-------|-------|------------|--------|
| TASK-052 | Planificador bloques ≤30k | EP-005 | 2026-09-28 | `tests/ingest/test_planner.py::TestPlanBlocks::test_one_year_blocks_within_limit_and_sum_matches` |
| TASK-053 | `download_range` 1m BID | EP-005 | 2026-09-28 | `tests/ingest/test_freeserv.py::TestDownloadRange::test_passes_min_1_interval_and_bid` |
| TASK-054 | Pacing 20 s | EP-005 | 2026-09-28 | `tests/ingest/test_pacing.py::TestDownloadBlocks::test_sleeps_n_minus_one_times_for_n_blocks` |
| TASK-055 | Retry por bloque | EP-005 | 2026-09-28 | `tests/ingest/test_retry.py::TestCollectBlocksCandles::test_failing_block_does_not_abort_range` |
| TASK-056 | Integrar en Celery | EP-005 | 2026-09-28 | `tests/ingest/test_tasks.py::TestDownloadPersistence::test_task_stores_candles_and_metadata` |
| TASK-057 | Retirar ticks | EP-005 | 2026-09-28 | Suite verde sin tests de ticks |
| TASK-059 | Resample base 1m | EP-006 | 2026-09-28 | `tests/pipeline/test_resample.py::TestResampleAggregation::test_1h_matches_60_1m_candles` |
| TASK-060 | Storage naming 1m | EP-006 | 2026-09-28 | `tests/storage/test_timeframes.py::TestPrecomputePersistence::test_base_uses_1m_filename` |
| TASK-061 | Persist/refresh derivadas | EP-006 | 2026-09-28 | `tests/pipeline/test_refresh.py::TestIncrementalRefresh::test_default_timeframes_cover_rf_009` |
| TASK-062 | Queries/API base 1m | EP-006 | 2026-09-28 | `tests/api/test_series_endpoint.py::TestSeriesMatchesDirectDuckDB::test_resampled_timeframe_matches_direct_query` |
| TASK-063 | Regresión pipeline/storage | EP-006 | 2026-09-28 | `tests/test_base_timeframe_regression.py` (7 casos) |
| TASK-064 | Tandas 6–12m | EP-007 | 2026-09-28 | `tests/ingest/test_batches.py::TestBatchDecomposition::test_two_years_yields_two_batches` |

### 🔴 Blocked (0)
| ID | Tarea | Motivo | Bloqueada desde | Desbloqueador |
|----|-------|--------|-----------------|---------------|
| — | — | — | — | — |

## 3. Ruta crítica — estado

```mermaid
graph LR
  T052[TASK-052 ✅] --> T053[TASK-053 ✅]
  T053 --> T056[TASK-056 ✅]
  T056 --> T064[TASK-064 ✅]
  T064 --> T065[TASK-065 📥]
```
**Avance de ruta crítica:** 4/5 Done (80%) · **ETA estimada:** desconocido (sin velocidad histórica)

## 4. Métricas

### 4.1 Velocidad
Sin datos suficientes (12 tareas completadas el mismo día).

### 4.2 Burn-down
Sin datos.

### 4.3 Lead time / Cycle time
Sin datos.

## 5. Bloqueos activos
Ninguno.

## 6. Alertas

### 🔴 Críticas
Ninguna.

### 🟡 Advertencias
- `TASK-074` es la única evidencia de RNF-101 (≤900 s); sin ella el requisito no se cierra.
- Deuda de artefactos obsoletos: `TASK-066` (benchmark), `TASK-067` (RNF-002), `TASK-UI-061` (nota "1s UTC").
- `contracts.ohlc.Timeframe` conserva `"1s"` (rechazado por storage); cambio de contrato aparte.

### 🟢 Informativas
- `TASK-064` cerrada: tandas de 6–12 m con progreso por bloques; `run_download_range` reporta `tandas`.
- **Ruta crítica al 80%** (4/5): solo falta TASK-065 (reanudación).
- Desbloqueadas activas: TASK-065, TASK-066, TASK-068, TASK-069, TASK-070, TASK-073.

## 7. Trazabilidad — salud
| Requisito | Tareas | Done | Cobertura |
|-----------|--------|------|-----------|
| RF-101 | 2 | 2 | 100% |
| RF-102 | 3 | 2 | 67% |
| RF-103 | 4 | 4 | 100% |
| RF-104 | 3 | 2 | 67% |
| RF-105 | 1 | 0 | 0% |
| RF-106 | 1 | 0 | 0% |
| RNF-101 | 2 | 0 | 0% |
| RNF-102 | 2 | 1 | 50% |
| RNF-003 | 1 | 0 | 0% |
| RNF-004 | 1 | 0 | 0% |
| RNF-005 | 2 | 0 | 0% |
| RNF-006 | 1 | 0 | 0% |
| RNF-007 | 1 | 0 | 0% |
| RNF-008 | 1 | 0 | 0% |
| RI-101 | 1 | 1 | 100% |
| RI-102 | 1 | 1 | 100% |
| RI-002 | 1 | 0 | 0% |
| RX-101 | 2 | 2 | 100% |
| RX-001 | 1 | 1 | 100% |

**Requisitos sin tareas:** ninguno ✓ · **Requisitos 100% Done:** 6/19 (RF-101, RF-103, RI-101, RI-102, RX-101, RX-001)

## 8. Próximas acciones sugeridas
1. Iniciar **TASK-065** (reanudación) — último nodo de la ruta crítica, desbloqueado.
2. En paralelo, **TASK-058/074** (EP-005) o **TASK-066** (benchmark 726k).
3. Reservar **TASK-074** para el cierre de RNF-101.

## 9. Historial de cambios (append-only)
| Fecha | Tarea | Transición | Motivo |
|-------|-------|-----------|--------|
| 2026-09-28 | — | Inicialización | status.md creado desde backlog.md (24 tareas + TECH-002 en 📥) |
| 2026-09-28 | TASK-052 | 📥 → 👀 Review | Autorizado por el usuario ("Autorizado a pasar a review"); salto de 🔨 Doing justificado por implementación ya ejecutada y verificada en `/sdd-implement` |
| 2026-09-28 | TASK-052 | 👀 → ✅ Done | "update TASK-052 done"; DoD verificada (24 tests passing) y prueba registrada en traceability (RF-102) |
| 2026-09-28 | TASK-053 | 📥 → 👀 → ✅ Done | "update TASK-053 review. Autorizado a pasar a done si aplica"; DoD verificada (suite 482 + 2 skip) y pruebas registradas (RF-101, RX-101). Saltos autorizados |
| 2026-09-28 | TASK-054 | 📥 → 👀 → ✅ Done | "update TASK-054 review. Autorizado a pasar a done si aplica y realiza commit"; DoD verificada (suite 489 + 2 skip) y prueba registrada (RF-102). Saltos autorizados |
| 2026-09-28 | TASK-055 | 📥 → 👀 → ✅ Done | "procede" sobre el paso sugerido; DoD verificada (suite 497 + 2 skip) y pruebas registradas (RX-101, RX-001). Saltos autorizados |
| 2026-09-28 | TASK-056 | 📥 → 👀 → ✅ Done | "ok" sobre el paso sugerido; DoD verificada (suite 498 + 2 skip) y prueba registrada (RF-104). Naming "1 m" diferido a TASK-060 (opción A) |
| 2026-09-28 | TASK-057 | 📥 → 👀 → ✅ Done | "ok" sobre el paso sugerido; DoD verificada (suite 480 + 2 skip sin tests de ticks) y limpieza de interfaces. **RF-101 al 100%** |
| 2026-09-28 | TASK-059 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; DoD verificada (suite 481 + 2 skip) y prueba registrada (RF-103) |
| 2026-09-28 | TASK-060, TASK-061, TASK-062 | 📥 → 👀 → ✅ Done | "ok de acuerdo con paso siguiente"; implementadas juntas como cambio coherente de base 1 m (opción A). DoD verificadas (suite 481 + 2 skip) y pruebas registradas (RF-103, RI-101, RI-102) |
| 2026-09-28 | TASK-063 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; guard de regresión de la base 1 m (suite 488 + 2 skip). **RF-103 al 100%** |
| 2026-09-28 | TASK-064 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; tandas de 6–12 m con progreso (suite 500 + 2 skip) y prueba registrada (RF-104). Ruta crítica 4/5. Commit `feat(TASK-064)` + `docs(...)` |
