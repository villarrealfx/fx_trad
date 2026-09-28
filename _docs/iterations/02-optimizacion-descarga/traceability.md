# Matriz de Trazabilidad — Iteración 02

> Diseño completado en `/sdd-stack`; columna Tarea completada en `/sdd-backlog`.
> La columna Prueba se llena en `/sdd-implement` / `/sdd-track`.

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RF-101 | `ingest` planificador + `FreeservClient` 1m (ADR-012/013/014) | TASK-053, TASK-057 | `tests/ingest/test_freeserv.py::TestDownloadRange::test_passes_min_1_interval_and_bid` | 🟢 |
| RF-102 | Planificador: bloques ≤30k + pacing (ADR-013) | TASK-052, TASK-054, TASK-058 | `tests/ingest/test_planner.py::TestPlanBlocks::test_one_year_blocks_within_limit_and_sum_matches`, `tests/ingest/test_pacing.py::TestDownloadBlocks::test_sleeps_n_minus_one_times_for_n_blocks`, `tests/ingest/test_pagination_integrity.py::TestDownloadIntegrity::test_downloaded_candles_match_market_expectation` | 🟢 |
| RF-103 | `pipeline.resample` base 1m (ADR-012) | TASK-059, TASK-061, TASK-062, TASK-063 | `tests/pipeline/test_resample.py::TestResampleAggregation::test_1h_matches_60_1m_candles`, `tests/storage/test_timeframes.py::TestPrecomputePersistence::test_base_uses_1m_filename`, `tests/api/test_series_endpoint.py::TestSeriesMatchesDirectDuckDB::test_resampled_timeframe_matches_direct_query`, `tests/test_base_timeframe_regression.py::TestDerivedRefreshFromBase::test_derived_one_hour_matches_direct_aggregation` | 🟢 |
| RF-104 | Tandas + Celery (ADR-015/016) | TASK-056, TASK-064, TASK-065 | `tests/ingest/test_batches.py::TestBatchDecomposition::test_two_years_yields_two_batches`, `tests/ingest/test_resume.py::TestResumeDownload::test_resume_downloads_pending_range_without_duplicates`, `tests/ingest/test_tasks.py::TestEndToEndEager::test_task_downloads_range_and_returns_summary` | 🟢 |
| RF-105 | `persist`/`storage` upsert + metadata (ADR-004) | TASK-068 | `tests/test_incremental_integrity.py::TestIncrementalIntegrity::test_overlapping_periods_do_not_duplicate` | 🟢 |
| RF-106 | `pipeline.filter` + `calendar` (01-mvp) | TASK-069 | `tests/test_market_filter_integrity.py::TestMarketFilter::test_no_kept_candle_falls_on_a_closed_day` | 🟢 |
| RNF-101 | Planificador + pacing (ADR-013) | TASK-054, TASK-074 | `tests/ingest/test_benchmark.py::TestBenchmarkDownload::test_measures_elapsed_and_counts`, `_docs/iterations/02-optimizacion-descarga/benchmark-download.md` (309,9 s/año) | 🟢 |
| RNF-102 | `storage` Parquet + caché (ADR-004/007/012) | TASK-060, TASK-066 | `scripts/benchmark_parquet.py` (726k velas @1m, 52,1 µs/vela, KPI-4=0), `tests/storage/test_timeframes.py::TestPrecomputePersistence::test_base_uses_1m_filename` | 🟢 |
| RNF-003 | `ingest.window` | TASK-071 | `tests/test_window_integrity.py::TestWindowTwoYears::test_older_than_two_years_is_rejected` | 🟢 |
| RNF-004 | `pipeline.normalize` + `ingest.times` | TASK-070 | `tests/test_utc_ohlc.py::TestUtcTimestamps::test_stored_time_matches_utc_epoch` | 🟢 |
| RNF-005 | SPA React (ADR-003) | TASK-073, TASK-UI-061 | `frontend/src/__tests__/smoke-base-1m.test.tsx` (rutas + gráfico 1 m), `frontend/src/components/DownloadForm/__tests__/DownloadForm.test.tsx` (nota "1 minuto (UTC)") | 🟢 |
| RNF-006 | Stack OSS, sin deps nuevas (ADR-008) | TASK-072 | `_docs/iterations/02-optimizacion-descarga/license-audit.md` (backend 50 · frontend 310 · denylist 0) | 🟢 |
| RNF-007 | Alcance acotado a `ingest` + base | TECH-002 | `_docs/iterations/02-optimizacion-descarga/_cierre.md` (iteración cerrada en plazo) | 🟢 |
| RNF-008 | Contrato `Candle` → `lightweight-charts` (ADR-005) | TASK-070 | `tests/test_utc_ohlc.py::TestChartContract::test_payload_candles_have_chart_keys` | 🟢 |
| RI-101 | Esquema serie base 1m (ADR-004/012) | TASK-060 | `tests/pipeline/test_schema.py::TestSchema::test_duckdb_declares_bigint_time_and_double_prices` | 🟢 |
| RI-102 | Naming `{symbol}.1m.parquet` + derivadas (ADR-004/007) | TASK-060 | `tests/storage/test_timeframes.py::TestPrecomputePersistence::test_base_uses_1m_filename` | 🟢 |
| RI-002 | `storage.metadata` (ADR-004) | TASK-068 | `tests/test_incremental_integrity.py::TestMetadata::test_each_download_records_metadata` | 🟢 |
| RX-101 | `ingest.freeserv` 1m + BID (ADR-013/014) | TASK-053, TASK-055 | `tests/ingest/test_freeserv.py::TestDownloadRange::test_returns_one_minute_candles`, `tests/ingest/test_retry.py::TestRetryDownloadBlock::test_transient_failure_is_retried_and_succeeds` | 🟢 |
| RX-001 | `ingest.retry` backoff por bloque (ADR-010/016) | TASK-055 | `tests/ingest/test_retry.py::TestRetryDownloadBlock::test_exhausted_retries_raise_block_error`, `tests/ingest/test_retry.py::TestCollectBlocksCandles::test_failing_block_does_not_abort_range` | 🟢 |

**Leyenda:** 🟡 pendiente · 🔵 en progreso · 🟢 completo · 🔴 bloqueado

## Notas de trazabilidad

- **RNF-002 (01-mvp)** queda **reemplazado** por **RNF-102** (base 1 m).
- **RF-001..RF-016 (01-mvp)** se mantienen vigentes; esta iteración solo cambia la
  resolución base y el transporte de descarga.
- **Cobertura:** 19/19 requisitos de la iteración con ≥1 tarea. Tareas sin requisito:
  `TECH-002` (cierre de iteración, justificada en `backlog.md` §8).
- **Artefactos obsoletos actualizados:** `benchmark_parquet.py` (TASK-066, RNF-102),
  referencias a RNF-002 en docs (TASK-067) y la nota "1 s UTC" de SCR-002
  (TASK-UI-061).
- **TASK-057:** retiró `iter_hours`/`_collect_hours_candles`/`aggregate_to_ohlc`/
  `download_hour`/`retry_download_hour` y sus tests de ticks; la suite queda verde
  sin código de ticks (RF-101, ADR-012/013).
