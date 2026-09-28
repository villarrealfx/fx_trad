# Estado del Proyecto: Optimización de descarga y base 1m (Iteración 02)

> Última actualización: 2026-09-28
> Fuente: `_docs/iterations/02-optimizacion-descarga/backlog.md`, `traceability.md`

## 1. Resumen ejecutivo
| Métrica | Valor | Δ vs última sesión |
|---------|-------|---------------------|
| Tareas totales | 24 (+1 TECH-002) | — |
| 📥 Backlog | 5 (+1) | −1 |
| 🔨 Doing | 0 | — |
| 👀 Review | 0 | — |
| ✅ Done | 19 | +1 |
| 🔴 Blocked | 0 | — |
| % Completado | 79% (19/24) | +4% |
| Días sin movimiento | 0 | — |

**Estado general:** 🟢 En curso · **ruta crítica 5/5 (100%)**

## 2. Tablero Kanban

### 📥 Backlog (6)
| ID | Tarea | Épica | Est. | Deps |
|----|-------|-------|------|------|
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

### ✅ Done (19)
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
| TASK-065 | Reanudación | EP-007 | 2026-09-28 | `tests/ingest/test_resume.py::TestResumeDownload::test_resume_downloads_pending_range_without_duplicates` |
| TASK-058 | Test integridad paginación | EP-005 | 2026-09-28 | `tests/ingest/test_pagination_integrity.py::TestDownloadIntegrity::test_downloaded_candles_match_market_expectation` |
| TASK-074 | Benchmark descarga 1 año | EP-005 | 2026-09-28 | `_docs/.../benchmark-download.md` (309,9 s/año ≤ 900 s) |
| TASK-066 | Benchmark parquet 726k | EP-006 | 2026-09-28 | `scripts/benchmark_parquet.py` (726k @1m, 52,1 µs/vela, KPI-4=0) |
| TASK-070 | Verificar UTC/contrato | EP-006 | 2026-09-28 | `tests/test_utc_ohlc.py` (4 casos: INT64/DOUBLE, epoch UTC, contrato) |
| TASK-071 | Verificar ventana 2a | EP-007 | 2026-09-28 | `tests/test_window_integrity.py::TestWindowTwoYears::test_older_than_two_years_is_rejected` |
| TASK-068 | Verificar upsert/metadatos | EP-008 | 2026-09-28 | `tests/test_incremental_integrity.py::TestIncrementalIntegrity::test_overlapping_periods_do_not_duplicate` |

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
  T064 --> T065[TASK-065 ✅]
```
**Avance de ruta crítica:** 5/5 Done (100%) · **ETA restante:** sin nodos críticos

## 4. Métricas

### 4.1 Velocidad
Sin datos suficientes (13 tareas completadas el mismo día).

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
- Deuda de artefactos obsoletos: `TASK-067` (RNF-002 en docs), `TASK-UI-061` (nota "1s UTC").
- `contracts.ohlc.Timeframe` conserva `"1s"` (rechazado por storage); cambio de contrato aparte.

### 🟢 Informativas
- `TASK-065` cerrada: reanudación por rango restante con merge sin duplicados (KPI-4).
- **Ruta crítica 5/5 (100%)** y **RF-104 al 100%**.
- Desbloqueadas activas: TASK-069, TASK-073, TASK-067/072, TASK-UI-061.

## 7. Trazabilidad — salud
| Requisito | Tareas | Done | Cobertura |
|-----------|--------|------|-----------|
| RF-101 | 2 | 2 | 100% |
| RF-102 | 3 | 3 | 100% |
| RF-103 | 4 | 4 | 100% |
| RF-104 | 3 | 3 | 100% |
| RF-105 | 1 | 1 | 100% |
| RF-106 | 1 | 0 | 0% |
| RNF-101 | 2 | 2 | 100% |
| RNF-102 | 2 | 2 | 100% |
| RNF-003 | 1 | 1 | 100% |
| RNF-004 | 1 | 1 | 100% |
| RNF-005 | 2 | 0 | 0% |
| RNF-006 | 1 | 0 | 0% |
| RNF-007 | 1 | 0 | 0% |
| RNF-008 | 1 | 1 | 100% |
| RI-101 | 1 | 1 | 100% |
| RI-102 | 1 | 1 | 100% |
| RI-002 | 1 | 1 | 100% |
| RX-101 | 2 | 2 | 100% |
| RX-001 | 1 | 1 | 100% |

**Requisitos sin tareas:** ninguno ✓ · **Requisitos 100% Done:** 15/19 (RF-101, RF-102, RF-103, RF-104, RF-105, RNF-003, RNF-004, RNF-008, RNF-101, RNF-102, RI-101, RI-102, RI-002, RX-101, RX-001)

## 8. Próximas acciones sugeridas
1. Verificación EP-008 (**TASK-069**, weekend/feriados).
2. UI (**TASK-073**, **TASK-UI-061**).
3. Deuda docs (**TASK-067/072**); cierre **TECH-002**.

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
| 2026-09-28 | TASK-064 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; tandas de 6–12 m con progreso (suite 500 + 2 skip) y prueba registrada (RF-104). Ruta crítica 4/5 |
| 2026-09-28 | TASK-065 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; reanudación por rango restante sin duplicados (suite 511 + 2 skip) y prueba registrada (RF-104). **Ruta crítica 5/5 (100%) y RF-104 al 100%**. Commit `feat(TASK-065)` + `docs(...)` |
| 2026-09-28 | TASK-058 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; integridad de paginación KPI-5 (suite 518 + 2 skip) y prueba registrada (RF-102). **RF-102 al 100%**; desbloquea TASK-074. Commit `test(TASK-058)` + `docs(...)` |
| 2026-09-28 | TASK-074 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; benchmark real 1 año = 309,9 s ≤ 900 s (RNF-101) y prueba determinista (suite 523 + 2 skip). **RNF-101 al 100%**. Commit `test(TASK-074)` + `docs(...)` |
| 2026-09-28 | TASK-066 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; benchmark Parquet reescrito a 726k @1m (52,1 µs/vela, KPI-4=0; suite 523 + 2 skip). **RNF-102 al 100%**. Commit `test(TASK-066)` + `docs(...)` |
| 2026-09-28 | TASK-070 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; verificación UTC + contrato OHLC (suite 527 + 2 skip). **RNF-004 y RNF-008 al 100%**. Commit `test(TASK-070)` + `docs(...)` |
| 2026-09-28 | TASK-071 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; ventana de 2 años intacta y 2 años → 2 tandas (suite 530 + 2 skip). **RNF-003 al 100%**. Commit `test(TASK-071)` + `docs(...)` |
| 2026-09-28 | TASK-068 | 📥 → 👀 → ✅ Done | "Autorizado a pasar a done si aplica y realiza commit"; upsert sin duplicados (KPI-4) + metadatos sobre base 1 m (suite 533 + 2 skip). **RF-105 y RI-002 al 100%**. Commit `test(TASK-068)` + `docs(...)` |
