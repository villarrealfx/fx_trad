# Estado del Proyecto: Plataforma de Análisis Técnico (estilo TradingView)

> Última actualización: 2026-09-24 08:22
> Fuente: `_docs/backlog.md` (v2), `_docs/traceability.md` (v2)

## 1. Resumen ejecutivo

| Métrica | Valor | Δ vs última sesión |
|---------|-------|---------------------|
| Tareas totales | 61 | +15 (backlog v2: TASK-047 + 14 TASK-UI-XXX) |
| 📥 Backlog | 38 | -3 |
| 🔨 Doing | 0 | — |
| 👀 Review | 0 | -1 |
| ✅ Done | 23 | +1 |
| 🔴 Blocked | 0 | — |
| % Completado | 37.7% (23/61) | +1.6 |
| Días sin movimiento | 0 | — |

**Estado general:** 🟢 En curso

## 2. Tablero Kanban

### 📥 Backlog (38)

| ID | Tarea | Épica | Est. | Deps |
|----|-------|-------|------|------|
| TASK-011 | Normalización UTC y esquema | EP-002 | S | TASK-010 |
| TASK-018 | MetadatosDescarga | EP-003 | S | TASK-015 |
| TASK-019 | Upsert incremental (merge time) | EP-003 | M | TASK-016, TASK-018 |
| TASK-020 | Endpoint GET /assets | EP-004 | S | TASK-016 |
| TASK-022 | Contrato respuesta TS (lightweight-charts) | EP-004 | S | TASK-009 |
| TASK-047 | Endpoint GET /downloads (historial RI-002) | EP-004 | S | TASK-018 |
| TASK-UI-000 | Setup tokens design system | EP-UI-000 | M | TASK-023 |
| TASK-UI-001 | Primitivas form (Button, Input, Select, RadioGroup, DateRange) | EP-UI-000 | L | TASK-UI-000 |
| TASK-UI-002 | Feedback/overlay (StatusBanner, ProgressBar, Modal, Toast, Tab) | EP-UI-000 | L | TASK-UI-000 |
| TASK-UI-003 | Layout principal + routing (6 rutas, skip link) | EP-UI-000 | M | TASK-023, TASK-UI-000 |
| TASK-UI-004 | A11y base (foco, ARIA, axe en CI, reduced-motion) | EP-UI-000 | M | TASK-UI-003 |
| TASK-UI-010 | SCR-001 Biblioteca (AssetList CMP-006) | EP-UI-001 | L | TASK-020, TASK-UI-001, TASK-UI-003 |
| TASK-UI-020 | SCR-002 Form descarga + validación | EP-UI-002 | M | TASK-003, TASK-UI-001 |
| TASK-UI-021 | SCR-002 Progreso + historial + estados | EP-UI-002 | L | TASK-006, TASK-047, TASK-UI-020 |
| TASK-UI-030 | SCR-003 Estados y validación cobertura | EP-UI-003 | M | TASK-020, TASK-026 |
| TASK-026 | Selector activo/rango/timeframe | EP-UI-003 | M | TASK-021, TASK-024 |
| TASK-028 | Línea y rectángulo (crear/borrar) | EP-UI-004 | L | TASK-027 |
| TASK-029 | Retrocesos de Fibonacci | EP-UI-004 | M | TASK-028 |
| TASK-032 | Render indicadores + panel parámetros | EP-UI-004 | M | TASK-024, TASK-031 |
| TASK-UI-040 | SCR-004 ChartPane + estados + leyenda OHLC | EP-UI-004 | M | TASK-024, TASK-025 |
| TASK-UI-041 | SCR-004 Toolbar + DrawTool (atajos, aria-pressed) | EP-UI-004 | M | TASK-028, TASK-029, TASK-030 |
| TASK-UI-042 | SCR-004 IndicatorItem + panel config | EP-UI-004 | M | TASK-032 |
| TASK-033 | Layout 3 paneles | EP-UI-005 | M | TASK-024 |
| TASK-034 | Sincronización crosshair/zoom | EP-UI-005 | M | TASK-033 |
| TASK-UI-050 | SCR-005 Tabs WAI-ARIA + tope 3 panes | EP-UI-005 | S | TASK-033, TASK-034 |
| TASK-035 | Composición canvas velas+ind+dibs | EP-UI-006 | M | TASK-030, TASK-032 |
| TASK-036 | Export PNG (toBlob) | EP-UI-006 | S | TASK-035 |
| TASK-UI-060 | SCR-006 Modal export (resolución, preview, focus trap) | EP-UI-006 | M | TASK-036, TASK-UI-002 |
| TASK-037 | Monorepo + lint/formato | TEC-001 | S | — |
| TASK-038 | Docker Compose (4 servicios) | TEC-001 | M | TASK-037 |
| TASK-039 | GHA lint + tests | TEC-001 | S | TASK-037 |
| TASK-040 | Auditoría licencias OSS ($0) | TEC-001 | S | TASK-037 |
| TASK-046 | Smoke test navegadores desktop | TEC-001 | S | TASK-026 |
| TASK-041 | Logging structlog + correlación Celery | TEC-002 | S | TASK-037 |
| TASK-042 | Interfaces/contratos de módulos | TEC-003 | S | TASK-037 |
| TASK-043 | Registro extensible de indicadores | TEC-003 | M | TASK-031, TASK-042 |
| TASK-044 | Caché in-memory por ventana (Karst) | TEC-004 | L | TASK-016, TASK-017 |
| TASK-045 | Invalidación de caché | TEC-004 | M | TASK-019, TASK-044 |

### 🔨 Doing (0)

Sin tareas.

### 👀 Review (0)

Sin tareas.

### ✅ Done (23)

| ID | Tarea | Épica | Completada | Prueba |
|----|-------|-------|------------|--------|
| TASK-015 | SerieOHLC Parquet (time único) | EP-003 | 2026-09-21 | `test_series.py` (12 tests, 100% cobertura) |
| TASK-016 | Consulta DuckDB activo/rango/TF | EP-003 | 2026-09-21 | `test_queries.py` (11 tests, 100% cobertura) |
| TASK-009 | Contrato OHLC compartido | EP-002 | 2026-09-18 | `test_ohlc_contract.py` + `ohlc.test.ts` (alineación canónica) |
| TASK-012 | Calendario de mercado | EP-002 | 2026-09-18 | `test_calendar.py` (marzo-2026, 100% cobertura) |
| TASK-013 | Filtro sin mercado | EP-002 | 2026-09-18 | `test_filter.py` (9 tests, 100% cobertura) |
| TASK-001 | Catálogo de activos + modelo de request | EP-001 | 2026-09-18 | `test_catalog.py` + `test_requests.py` (19 tests, 100% cobertura) |
| TASK-002 | Cliente Dukascopy vía API chart freeserv (ADR-010) | EP-001 | 2026-09-21 | `test_freeserv.py` (mapeo, agregación, hora conocida; 100% cobertura ingest) |
| TASK-003 | Endpoint POST /downloads | EP-001 | 2026-09-18 | `test_downloads.py` (10 tests, broker stub, api+ingest 100%) |
| TASK-010 | Pipeline limpieza e imputación | EP-002 | 2026-09-18 | `test_clean.py` (18 tests, cobertura pipeline 100%, política PA-3) |
| TASK-004 | Celery + RabbitMQ (download_asset) | EP-001 | 2026-09-18 | `test_tasks.py` (15 tests, E2E eager 3 h + adapter); E2E dev en vivo compose worker/rabbitmq |
| TASK-005 | Retry/backoff 20 s y manejo de fallos parciales | EP-001 | 2026-09-21 | `test_retry.py` (reintento backoff 20 s, agotamiento) + `test_tasks.py::TestPartialFailures` (exito/parcial/fallo); 136 ✅ + 2 skip |
| TASK-006 | Endpoint GET /downloads/{task_id} | EP-001 | 2026-09-21 | `test_download_status.py` (4 estados + filas) + `test_tasks.py::TestCeleryDownloadStatus` (mapeo AsyncResult); 147 ✅ + 2 skip |
| TASK-007 | Normalización a segundos UTC | EP-001 | 2026-09-21 | `test_times.py` (TZ no-UTC Madrid/NY/offset fijo → 1786442400, naive→UTC, identidad UTC); 153 ✅ + 2 skip |
| TASK-008 | Validación ventana ≤ 2 años | EP-001 | 2026-09-21 | `test_window.py` (rechazo >2 años con mensaje, límite inclusivo, integración DownloadRequest); 162 ✅ + 2 skip |
| TASK-014 | Agregación OHLC 1m/5m/15m/1h/4h/1d | EP-002 | 2026-09-22 | `backend/tests/pipeline/test_resample.py` (16 tests, 100% cobertura) — RF-009 |
| TASK-017 | Parquet pre-resampling | EP-003 | 2026-09-22 | `backend/tests/storage/test_timeframes.py` (13 tests, fichas por TF sin recomputar) — RF-005/RF-009/RNF-002/RI-001 |
| TASK-021 | Endpoint GET /series | EP-004 | 2026-09-22 | `backend/tests/api/test_series_endpoint.py` (12 tests, contrato OhlcResponse + integración DuckDB) — RF-008/RF-009/RX-002 |
| TASK-023 | Scaffold React 18 + Vite 5 + TS 5 | EP-UI-000 | 2026-09-22 | `frontend/`: `npm run dev` (Vite 5, HTTP 200) + `npm run lint`/`typecheck`/`test` (6 tests, App 100%) verdes — RNF-005 |
| TASK-024 | lightweight-charts + datos API | EP-UI-004 | 2026-09-22 | `frontend/` `ChartPane.test.tsx` (6: estados loading/empty/error+retry/success, leyenda OHLC, atajos +/−/1, dispose) + `series.test.ts` (4); suite 16/16, cobertura 96.18% — RF-009/RF-010 |
| TASK-025 | Zoom/pan fluido a 60 FPS (2 años) | EP-UI-004 | 2026-09-22 | `frontend/` `frame-rate.test.ts` + `frame-batch.test.ts` (FrameRateMeter rAF, métricas avgFps/p95/max/dropped, presupuesto 16.67 ms) + `ChartPane.test.tsx` (pan/zoom dataset 2 años sin re-feed ni drops; leyenda batcheada — RF-010/RNF-001; sesión real → TASK-UI-040) |
| TASK-027 | Overlay canvas sincronizado | EP-UI-004 | 2026-09-22 | `frontend/` `overlay-geometry.test.ts` + `OverlayCanvas.test.tsx` (13 tests: re-proyección de anclas en pan/zoom/resize, coalescing 1 frame, aria-hidden) — RF-011 |
| TASK-030 | Marcadores entrada/salida | EP-UI-004 | 2026-09-22 | `ChartPane.test.tsx` (6 tests marcadores: crear buy, toggle sell+aria-pressed, dedupe, selección+borrado con confirm, cancel, Escape) + `overlay-geometry.test.ts` (proyección/hit-test) — RF-012 |
| TASK-031 | Cálculo MA, RSI, ATR | EP-002 | 2026-09-24 | `backend/tests/pipeline/test_indicators.py` (21 tests, fixture golden MA20/RSI14/ATR14 Wilder) — RF-013 |

### 🔴 Blocked (0)

Sin tareas.

## 3. Ruta crítica — estado

Estado: 9/12 completadas (75%) · ETA: desconocido (sin velocidad histórica).

```mermaid
graph LR
  T9[TASK-009 ✅] --> T10[TASK-010 ✅]
  T10 --> T12[TASK-012 ✅]
  T12 --> T14[TASK-014 ✅]
  T14 --> T17[TASK-017 ✅]
  T17 --> T21[TASK-021 ✅]
  T21 --> T24[TASK-024 ✅]
  T24 --> T27[TASK-027 ✅]
  T27 --> T30[TASK-030 ✅]
  T30 --> T35[TASK-035 📥]
  T35 --> T36[TASK-036 📥]
  T36 --> U60[TASK-UI-060 📥]
```

## 4. Métricas

Sin histórico de sprints, burn-down ni lead/cycle time (primera sesión; backlog v2 recién aprobado).

## 5. Bloqueos activos

Ninguno.

## 6. Alertas

### 🔴 Críticas

- Ninguna.

### 🟡 Advertencias

- PA-2 sin resolver → impacta TASK-036 y TASK-UI-060 (ambos en ruta crítica).
- PA-1 sin resolver → impacta TASK-005, TASK-008.
- **AR-1 activo (observado 2026-09-18):** Dukascopy devuelve 503/timeout desde esta IP (4/4 intentos en el E2E de TASK-004; fechas pasadas) → el tramo de datos reales está temporalmente degradado; TASK-005 (retry/backoff 20 s, en 👀 Review) + ADR-006 lo mitigan.
- RNF sin verificación programada (solo RF-003 y RNF-008 tienen prueba vía TASK-009; el resto 0).
- DP-8: 184 pts > capacidad nominal de 2 semanas → priorizar ruta crítica; difiere SCR-005/a11y fino si el plazo aprieta.

### 🟢 Informativas

- TASK-025 👀 → ✅ Done tras review aprobada (2026-09-22): DoD completa (pan/zoom 60 FPS medido con `FrameRateMeter` rAF + leyenda OHLC batcheada por frame; suite frontend 31/31, cobertura 99.73%, lint/typecheck/build/prettier OK); prueba registrada (RF-010/RNF-001); habilita TASK-UI-040 (deps TASK-024 + TASK-025 ✅). Nota: validación de sesión en navegador real diferida a TASK-UI-040.
- TASK-027 👀 → ✅ Done tras review aprobada (2026-09-22): DoD aceptada (anclaje verificado por tests de re-proyección en pan/zoom/resize; verificación manual aceptada en review); 13 tests charting ✅, lint/typecheck OK; prueba registrada (RF-011); ruta crítica 8/12 (67%); habilita TASK-028/030 (siguiente en ruta crítica: TASK-030).
- Backlog v2 aprobado: 61 tareas (46 heredadas + 15 nuevas) con épicas de UI por pantalla.
- status.md resincronizado contra backlog v2.
- TASK-009 ✅ Done (primer nodo de la ruta crítica implementado y validado).
- TASK-001 ✅ Done (catálogo + request RF-001/HU-001): 19 tests, cobertura 100% en `ingest`; habilita TASK-002/003/004.
- TASK-002 ✅ Done (cliente Dukascopy, RF-001/RF-002/RX-001): 41 tests (80 ✅ + 1 skip optativo), cobertura 100% en `ingest`; DoD cumplida (hora conocida EURUSD 2026-08-11 10:00 UTC → OHLC 1s exacto); habilita TASK-005/007/008.
- TASK-003 ✅ Done (endpoint POST /downloads, RF-001): 10 tests con broker stub, cobertura api+ingest 100%; habilita TASK-004/006 y TASK-UI-020.
- PA-3 resuelto (2026-09-18): política de imputación "Eliminar + FF acotado" (G_MAX=60 s) aprobada; **desbloquea TASK-010** (ruta crítica).
- TASK-010 implementada → 👀 Review (18 tests, cobertura pipeline 100%, política PA-3 testeada con NaN/gaps); habilita TASK-011, TASK-014, TASK-031.
- TASK-010 ✅ Done tras review validada (111 tests ✅ + 1 skip; se eliminó constante muerta `_OHLC_KEYS`); RF-003 queda con prueba de limpieza/imputación.
- TASK-004 ✅ Done (implementada en feature/TASK-004-celery, merge 2026-09-18): Celery + RabbitMQ (ADR-006), tarea `download_asset` E2E validada en vivo con compose worker/rabbitmq (task_id correlacionado, registración OK); datos reales bloqueados por AR-1 (Dukascopy 503/timeout) — evidencia para TASK-005.
- TASK-005 ✅ Done tras review: retry/backoff 20 s (R-001) con política configurable, estados `exito|parcial|fallo` en el resumen; 136 tests ✅ + 2 skip, ruff/black/mypy OK; **mitiga AR-1**.
- TASK-006 ✅ Done tras review: GET /downloads/{task_id} con estados encolada/éxito/parcial/fallo + filas; result_backend `rpc://` con amqp (resultados compartidos worker↔API); 147 tests ✅ + 2 skip, ruff/black/mypy OK; DoD completa.
- TASK-015 implementada → 👀 Review (2026-09-21): módulo `storage` (`ParquetSeriesStore`, `DuplicateTimeError`) con Parquet por activo, `time BIGINT` único (RI-001) y consulta DuckDB de rango; 12 tests nuevos (`test_series.py`) → 174 ✅ + 2 skip, ruff/black/mypy OK; habilita TASK-016/017/018.
- TASK-016 implementada → 👀 Review (2026-09-21): capa `SeriesQuery` (`InvalidTimeframeError`, `InvalidRangeError`) sobre `ParquetSeriesStore`; valida timeframe base `1s` / rango invertido (RF-005, RNF-002) y delega en `read_range` de TASK-015; 11 tests nuevos (`test_queries.py`) → 185 ✅ + 2 skip, ruff/black/mypy OK; habilita TASK-017/018/019/020/021.
- TASK-016 👀 → ✅ Done tras review aprobada (2026-09-21): DoD completa — `SeriesQuery.read` valida timeframe base `1s` y range invertido → `InvalidRangeError`, delega en `read_range` de TASK-015; 11 tests (`test_queries.py`) → 186 ✅ + 2 skip, cobertura `queries` 100%, ruff/black/mypy OK; prueba registrada (RF-005/RNF-002/RI-001); habilita TASK-017/018/019/020/021.
- TASK-017 implementada → 👀 Review (2026-09-22): pre-resampling persistido por TF (`{symbol}.{tf}.parquet`, TASK-014-TF canónico; ADR-007), consulta por TF sin recomputar (RF-009, RNF-008); 13 tests nuevos (`test_timeframes.py`) + `test_queries.py` ajustado (rechazo solo no canónicos) → suite 214 ✅ + 2 skip, cobertura storage 94% (series 97%, queries 83%), ruff/black/mypy OK; DoD cubierta (persistidos + consulta sin recomputar); habilita TASK-021/044.
- TASK-017 👀 → ✅ Done tras review aprobada (2026-09-22): DoD completa (Parquet por TF persistido + consulta sin recomputar); `test_timeframes.py` (13 tests); prueba registrada (RF-005/RF-009/RNF-002/RI-001); ruta crítica 5/12 (42%); desbloquea TASK-021 (siguiente en ruta crítica) y TASK-044.
- TASK-021 implementada → 👀 Review (2026-09-22): `GET /series` (activo/rango/timeframe) devuelve `OhlcResponse` desde el Parquet pre-resampling sin recomputar (RF-008/RX-002/RF-009); inyección `series_query` en `create_app` (default `FXTRAD_DATA_DIR`); 12 tests nuevos (`test_series_endpoint.py`, integración real DuckDB — DoD "coincide con consulta directa") → suite 226 ✅ + 2 skip, cobertura api 100%, ruff/black/mypy OK; habilita TASK-024/026/022.
- TASK-021 👀 → ✅ Done tras review aprobada (2026-09-22): DoD completa (respuesta en contrato OhlcResponse, coincidencia con DuckDB); prueba registrada (RF-008/RF-009/RX-002); ruta crítica 6/12 (50%); desbloquea TASK-024 (siguiente en ruta crítica), TASK-026, TASK-022 y TASK-044.
- TASK-023 implementada → 👀 Review (2026-09-22): scaffold SPA React 18 + Vite 5 + TS 5 en `frontend/` (ADR-003) sobre el paquete de contrato TS (TASK-009) conservado; dev server HTTP 200, lint/typecheck/build verdes, 6 tests (cobertura App 100%); habilita EP-UI-000, TASK-024 y TASK-UI-000/003.
- TASK-023 👀 → ✅ Done tras review aprobada (2026-09-22): DoD completa (app levanta en dev, lint y typecheck en verde); prueba registrada (RNF-005); habilita TASK-024 (ruta crítica) y EP-UI-000.
- TASK-024 implementada → 👀 Review (2026-09-22): ChartPane base CMP-007 con lightweight-charts v4 (ADR-005) consumiendo `GET /series` (TASK-021) en contrato OHLC sin transformación (RNF-008); `ChartPane.test.tsx` (6 tests: estados loading/empty/error+retry/success, leyenda OHLC, atajos +/−/1, dispose) + `series.test.ts` (4 tests) → suite frontend 16/16, cobertura 96.18% (ChartPane 91.72%, series 96.96%); lint/typecheck/build/prettier OK; dev server HTTP 200 con proxy `/series` → `http://localhost:8000`; prueba registrada (RF-009/RF-010); pasa a revisión. Deps TASK-021/TASK-023 ✅; nota: velas validadas con fetch mockeado sobre el contrato real (sin E2E con backend en vivo).
- TASK-024 👀 → ✅ Done tras review aprobada (2026-09-22): DoD completa (velas reales vía GET /series en contrato OHLC sin transformación — RNF-008; suite frontend 16/16, cobertura 96.18%, lint/typecheck/build verdes, dev HTTP 200); prueba registrada (RF-009/RF-010); ruta crítica 7/12 (58%); desbloquea TASK-025 (siguiente en ruta crítica), TASK-027, TASK-026, TASK-032, TASK-033, TASK-UI-040. Nota: E2E con backend en vivo diferido a TASK-026/TASK-UI-040.

## 7. Trazabilidad — salud

| Requisito | Tareas | Done | Cobertura |
|-----------|--------|------|-----------|
| RF-001…RF-016 | (mapeadas en traceability.md) | 1 | 6% |
| RNF-001…RNF-008 | (mapeadas) | 1 | 13% |
| RI-001…RI-003 | (mapeadas) | 0 | 0% |
| RX-001…RX-002 | (mapeadas) | 0 | 0% |

**Requisitos sin tareas:** ninguno ✓ · **Requisitos 100% Done:** 0/29

## 8. Próximas acciones sugeridas

1. Iniciar **TASK-032** (render de indicadores + panel; deps TASK-024 ✅ + TASK-031 ✅ — 100% desbloqueada) o **TASK-028** (línea/rectángulo; deps TASK-027 ✅).
2. Alternativa paralela: **TASK-UI-040** (ChartPane estados + leyenda; deps TASK-024+025 ✅) o **TASK-033** (layout 3 paneles; deps TASK-024 ✅).

## 9. Historial de cambios (append-only)

| Fecha | Tarea | Transición | Motivo |
|-------|-------|-----------|--------|
| 2026-09-17 | — | Inicialización | status.md creado desde backlog (46 tareas 📥) |
| 2026-09-17 | — | Resync v2 | backlog v2 aprobado: 61 tareas 📥 (Δ +15: TASK-047 + TASK-UI-000…060); épicas remapeadas a EP-UI-XXX; ruta crítica v2 (12 nodos) |
| 2026-09-18 | TASK-009 | 📥 → 🔨 | Inicio de desarrollo |
| 2026-09-18 | TASK-009 | 🔨 → 👀 Review | Implementación completada (Pydantic + TS, alineación canónica), pasa a revisión |
| 2026-09-18 | TASK-009 | 👀 → ✅ Done | DoD validada (review): contrato alineado y documentado |
| 2026-09-18 | TASK-009 | Resync backlog.md | Estado reflejado en backlog.md (📥→✅), saldando desync con status.md; tests backend 16 ✅ y frontend 5 ✅ |
| 2026-09-18 | TASK-012 | 📥 → 🔨 | Inicio de desarrollo (calendario de mercado, RF-004) |
| 2026-09-18 | TASK-012 | 🔨 → 👀 Review | Implementación + 14 tests (100% cobertura), ruff/black/mypy OK, DoD cumplida; pasa a revisión |
| 2026-09-18 | TASK-012 | 👀 → ✅ Done | Revisión validada: 30 tests ✅, ruff/mypy OK, prueba registrada en traceability (RF-004) |
| 2026-09-18 | TASK-013 | 📥 → 🔨 | Inicio de desarrollo (filtro de periodos sin mercado, RF-004) |
| 2026-09-18 | TASK-013 | 🔨 → 👀 Review | Implementación + 9 tests (100% cobertura), ruff/black/mypy OK, DoD cumplida; pasa a revisión |
| 2026-09-18 | TASK-013 | 👀 → ✅ Done | Revisión validada: 39 tests ✅, ruff/mypy OK; RF-004 queda 100% cubierto (TASK-012 + TASK-013) |
| 2026-09-18 | TASK-001 | 📥 → 🔨 | Inicio de desarrollo (catálogo de activos + request de descarga, RF-001/HU-001) |
| 2026-09-18 | TASK-001 | 🔨 → 👀 Review | Implementación + 19 tests (100% cobertura en ingest), ruff/black/mypy OK, DoD cumplida; pasa a revisión |
| 2026-09-18 | TASK-001 | 👀 → ✅ Done | Revisión validada: 58 tests ✅, ruff/mypy OK; DoD completa (catálogo 3 tipos + request validado); RF-001 avanza (prueba registrada) |
| 2026-09-18 | TASK-002 | 📥 → 🔨 | Inicio de desarrollo (cliente Dukascopy bi5, RF-001/RF-002/RX-001) |
| 2026-09-18 | TASK-002 | 🔨 → 👀 Review | Implementación + 41 tests (80 ✅ + 1 skip optativo live), cobertura 100% en `ingest`, ruff/black/mypy OK, DoD cumplida (hora conocida EURUSD 2026-08-11 10:00 UTC); pasa a revisión |
| 2026-09-18 | TASK-002 | 👀 → ✅ Done | Revisión validada: 41 tests ✅ + 1 skip optativo, cobertura ingest 100%, ruff/mypy OK; DoD completa; RF-001/RF-002/RX-001 avanzan (pruebas registradas) |
| 2026-09-18 | TASK-003 | 📥 → 🔨 | Inicio de desarrollo (endpoint POST /downloads, RF-001/HU-001) |
| 2026-09-18 | TASK-003 | 🔨 → 👀 Review | Implementación + 10 tests con broker mockeado, cobertura api+ingest 100%, ruff/black/mypy OK, DoD cumplida (202 + task_id, 422 sin encolar); pasa a revisión |
| 2026-09-18 | TASK-003 | 👀 → ✅ Done | Revisión validada: 90 tests ✅ + 1 skip, cobertura api+ingest 100%, ruff/mypy OK; DoD completa; RF-001 avanza (prueba registrada) |
| 2026-09-18 | TASK-010 | 📥 → 🔨 | Inicio de desarrollo (pipeline de limpieza e imputación, RF-003/HU-004; política PA-3 aprobada) |
| 2026-09-18 | TASK-010 | 🔨 → 👀 Review | Implementación + 18 tests (cobertura pipeline 100%), ruff/black/mypy OK, DoD PA-3 cumplida (NaN eliminados + FF acotado 60 s); pasa a revisión |
| 2026-09-18 | TASK-010 | 👀 → ✅ Done | Revisión validada: 111 tests ✅ + 1 skip, cobertura pipeline 100%, ruff/mypy OK; se eliminó código muerto; DoD completa; RF-003 avanza (prueba registrada) |
| 2026-09-18 | TASK-004 | 📥 → 🔨 | Inicio de desarrollo (Celery + RabbitMQ, download_asset, ADR-006) |
| 2026-09-18 | TASK-004 | 🔨 → 👀 Review | Implementación + 15 tests (E2E eager 3 h + adapter), cobertura ingest 100%, ruff/black/mypy OK, DoD cumplida (compose levanta worker, tarea registrada y ejecutada E2E en vivo); pasa a revisión |
| 2026-09-18 | TASK-004 | 👀 → ✅ Done | Revisión validada: 126 tests ✅ + 2 skip, cobertura ingest 100%, ruff/mypy OK; DoD completa (merge 2026-09-18); RF-001/RX-001 avanzan (prueba registrada); datos reales limitados por AR-1 (Dukascopy 503/timeout) → mitiga TASK-005 |
| 2026-09-21 | TASK-005 | 📥 → 🔨 | Inicio de desarrollo (retry/backoff 20 s y manejo de fallos parciales, RF-001/RX-001/RNF-003) |
| 2026-09-21 | TASK-005 | 🔨 → 👀 Review | Implementación: política RetryPolicy (3 intentos, backoff 20 s), estados exito/parcial/fallo en el resumen; 16 tests nuevos → 136 ✅ + 2 skip, ruff/black/mypy OK; DoD cumplida (fallo HTTP simulado reintentado + estado en resumen); pasa a revisión |
| 2026-09-21 | TASK-005 | Resync backlog.md | Estado reflejado en backlog.md (📥→👀), saldando desync con status.md; 136 tests ✅ + 2 skip |
| 2026-09-21 | TASK-005 | 👀 → ✅ Done | Review validada: DoD completa (fallo HTTP simulado → backoff 20 s; estado parcial/fallo en resumen); 136 tests ✅ + 2 skip, ruff/black/mypy OK; prueba registrada (RF-001/RX-001/RNF-003); **mitiga AR-1** |
| 2026-09-21 | TASK-005 | Resync backlog.md | Estado reflejado en backlog.md (👀→✅), saldando desync con status.md |
| 2026-09-21 | TASK-006 | 📥 → 🔨 | Inicio de desarrollo (endpoint GET /downloads/{task_id}, RF-001/RX-001/HU-002) |
| 2026-09-21 | TASK-006 | 🔨 → 👀 Review | Implementación: GET estado (encolada/éxito/parcial/fallo) + filas; CeleryDownloadStatus mapea AsyncResult; result_backend rpc:// con amqp (resultados compartidos worker↔API); 11 tests nuevos → 147 ✅ + 2 skip, ruff/black/mypy OK; pasa a revisión |
| 2026-09-21 | TASK-006 | Resync backlog.md | Estado reflejado en backlog.md (📥→👀), saldando desync con status.md |
| 2026-09-21 | TASK-006 | 👀 → ✅ Done | Review validada: DoD completa (GET devuelve encolada/éxito/parcial/fallo + filas); 147 tests ✅ + 2 skip, ruff/black/mypy OK; prueba registrada (RF-001/RX-001) |
| 2026-09-21 | TASK-006 | Resync backlog.md | Estado reflejado en backlog.md (👀→✅), saldando desync con status.md |
| 2026-09-21 | TASK-007 | 📥 → 🔨 | Inicio de desarrollo (normalización de timestamps a segundos UTC, RF-002/RNF-004) |
| 2026-09-21 | TASK-007 | 🔨 → 👀 Review | Implementación: `to_epoch_seconds` en ingest/times.py (TZ no-UTC → epoch UTC, naive asumido UTC); 6 tests nuevos → 153 ✅ + 2 skip, ruff/black/mypy OK; DoD cumplida (fixtures Madrid/NY/offset fijo convergen a 1786442400); pasa a revisión |
| 2026-09-21 | TASK-007 | Resync backlog.md | Estado reflejado en backlog.md (→👀), saldando desync con status.md |
| 2026-09-21 | TASK-007 | 👀 → ✅ Done | Review validada: DoD completa (fixtures TZ no-UTC convergen a 1786442400; naive asumido UTC); 153 tests ✅ + 2 skip, ruff/black/mypy OK; prueba registrada (RF-002/RNF-004) |
| 2026-09-21 | TASK-007 | Resync backlog.md | Estado reflejado en backlog.md (👀→✅), saldando desync con status.md |
| 2026-09-21 | TASK-008 | 📥 → 🔨 | Inicio de desarrollo (validación ventana ≤ 2 años, RF-002/RNF-003/HU-003) |
| 2026-09-21 | TASK-008 | 🔨 → 👀 Review | Implementación: `validate_request_window` en ingest/window.py (rechazo con mensaje > 2 años), integrado en DownloadRequest (422 sin encolar); 9 tests nuevos → 162 ✅ + 2 skip, ruff/black/mypy OK; DoD cumplida; pasa a revisión |
| 2026-09-21 | TASK-008 | Resync backlog.md | Estado reflejado en backlog.md (→👀), saldando desync con status.md |
| 2026-09-21 | TASK-008 | 👀 → ✅ Done | Review validada: DoD completa (solicitud > 2 años rechazada con mensaje explícito, límite inclusivo); 162 tests ✅ + 2 skip, ruff/black/mypy OK; prueba registrada (RNF-003) |
| 2026-09-21 | TASK-015 | 👀 → ✅ Done | Review validada: DoD completa (SerieOHLC Parquet por activo, time único BIGINT, consulta DuckDB de rango `1s`); `test_series.py` (12 tests, 100% cobertura) + integración `test_queries.py`; 186 ✅ + 2 skip, ruff/black/mypy OK; DoD cumplida; habilita TASK-017/018/019/020/021 |
| 2026-09-21 | TASK-008 | Resync backlog.md | Estado reflejado en backlog.md (👀→✅), saldando desync con status.md |
| 2026-09-22 | TASK-014 | 📥 → 👀 | Implementación verificada: `backend/src/fxtrad/pipeline/resample.py` + `test_resample.py` (16 tests, cobertura 100%, suite 201 ✅ + 2 skip, ruff/black/mypy OK); DoD de resampling confirmada (1h == 60×1m; fixture por timeframe); pasa a revisión |
| 2026-09-22 | TASK-014 | 👀 → ✅ | Review validada: DoD completa (resampling 1h=60×1m, fixture por timeframe, cobertura pipeline 100%); prueba registrada (RF-009); habilita TASK-017 |
| 2026-09-22 | TASK-017 | 📥 → 👀 | Implementación verificada: pre-resampling persistido por TF (`{symbol}.{tf}.parquet`, ADR-007) y consultado sin recomputar; `test_timeframes.py` (13 tests) + `test_queries.py` ajustado (1m→canónico, rechazo 3m); cobertura storage 94% (series 97%, queries 83%); suite 214 ✅ + 2 skip, ruff/black/mypy OK; prueba registrada (RF-005/RF-009/RNF-002/RI-001); pasa a revisión. Deps TASK-014/TASK-015 ✅ |
| 2026-09-22 | TASK-017 | 👀 → ✅ | Review validada: DoD completa (archivos `{symbol}.{tf}.parquet` persistidos y consultados sin recomputar); `test_timeframes.py` (13 tests); suite 214 ✅ + 2 skip, cobertura storage 94%, ruff/black/mypy OK; prueba registrada (RF-005/RF-009/RNF-002/RI-001); habilita TASK-021/044 |
| 2026-09-22 | TASK-015 | Limpieza historial | Eliminada fila duplicada/malformada del historial (TASK-015 ⭐, sintaxis rota y columnas de más); la entrada válida TASK-015 👀→✅ se conserva intacta (append-only) |
| 2026-09-22 | TASK-021 | 📥 → 👀 | Implementación verificada: `GET /series` (activo, rango, timeframe) en `api/routes.py` devolviendo `OhlcResponse` (RX-002/RNF-008), inyección de `series_query` en `create_app` (default `FXTRAD_DATA_DIR`); `test_series_endpoint.py` (12 tests: contrato + integración real Parquet/DuckDB comparando contra consulta directa — DoD); suite 226 ✅ + 2 skip, cobertura api 100%, ruff/black/mypy OK; prueba registrada (RF-008/RF-009/RX-002); pasa a revisión |
| 2026-09-22 | TASK-021 | 👀 → ✅ | Review validada: DoD completa (GET /series sirve OHLC por activo/rango/timeframe en contrato OhlcResponse y coincide con la consulta directa a DuckDB); `test_series_endpoint.py` (12 tests); suite 226 ✅ + 2 skip, cobertura api 100%, ruff/black/mypy OK; prueba registrada (RF-008/RF-009/RX-002); ruta crítica 6/12 (50%); habilita TASK-024/026/022/044 |
| 2026-09-22 | TASK-023 | 📥 → 👀 | Implementación verificada: scaffold SPA en `frontend/` (fxtrad-web, React 18 + Vite 5 + TS 5, ADR-003; `src/contracts/` de TASK-009 conservado); dev server Vite 5.4.21 HTTP 200, `npm run lint` + `npm run typecheck` + `npm run build` OK, 6 tests (smoke App 100% + alineación contrato), prettier OK; prueba registrada (RNF-005); pasa a revisión. Nota: contracts reformateados (solo estilo) al adoptar prettier |
| 2026-09-22 | TASK-023 | 👀 → ✅ | Review validada: DoD completa (app levanta en dev — Vite 5.4.21 HTTP 200, lint + typecheck en verde); `frontend/` SPA con dev/build/prettier OK y 6 tests (cobertura App 100%); prueba registrada (RNF-005); habilita TASK-024 y EP-UI-000 (TASK-UI-000/001/002/003) |
| 2026-09-22 | TASK-024 | 📥 → 👀 | Implementación verificada: ChartPane base CMP-007 (lightweight-charts v4, ADR-005) consumiendo GET /series en contrato OHLC sin transformación (RNF-008); `ChartPane.test.tsx` (6) + `series.test.ts` (4) → suite frontend 16/16, cobertura 96.18%, lint/typecheck/build/prettier OK, dev server HTTP 200 con proxy `/series`; prueba registrada (RF-009/RF-010); pasa a revisión. Deps TASK-021/TASK-023 ✅ |
| 2026-09-22 | TASK-024 | 👀 → ✅ | Review validada: DoD completa (ChartPane v4 renderiza velas reales vía GET /series en contrato OHLC sin transformación RNF-008; suite frontend 16/16, cobertura 96.18%, lint/typecheck/build verdes, dev HTTP 200); prueba registrada (RF-009/RF-010); ruta crítica 7/12 (58%); habilita TASK-025/027/026/032/033/TASK-UI-040. E2E con backend vivo diferido a TASK-026/TASK-UI-040 |
| 2026-09-22 | TASK-025 | 📥 → 👀 | Implementación verificada: `FrameRateMeter` rAF + `createFrameBatcher` + leyenda OHLC batcheada en `ChartPane.tsx`; `frame-rate.test.ts` + `frame-batch.test.ts` + smoke pan/zoom dataset 2 años (SRC-004, RNF-001) → suite frontend 31/31, cobertura 99.73%, lint/typecheck/build/prettier OK; prueba registrada (RF-010/RNF-001); pasa a revisión. Dep TASK-024 ✅; habilita TASK-UI-040. Nota: profiling con scheduler inyectado (jsdom); sesión real difiere a TASK-UI-040 |
| 2026-09-22 | TASK-025 | 👀 → ✅ | Review validada: DoD completa (pan/zoom 60 FPS con `FrameRateMeter` rAF y leyenda OHLC batcheada, RNF-001/KPI-2; suite frontend 31/31, cobertura 99.73%, lint/typecheck/build verdes); prueba registrada (RF-010/RNF-001); habilita TASK-UI-040 (deps TASK-024 + TASK-025 ✅). Validación de sesión en navegador real diferida a TASK-UI-040 |
| 2026-09-22 | TASK-027 | 📥 → 🔨 → 👀 | Implementación verificada (commit `e5724ae`, overlay-geometry + OverlayCanvas + chart-binding + tests); prueba ya en traceability RF-011; salto Doing→Review confirmado por usuario; DoD manual de anclaje zoom/pan pendiente de validar en review. Habilita TASK-028/030 al aprobar |
| 2026-09-22 | TASK-027 | 👀 → ✅ | Review validada: DoD aceptada por usuario (anclaje precio/tiempo cubierto por tests de re-proyección en pan/zoom; verificación manual aceptada en review); 13 tests charting ✅, lint/typecheck OK; prueba registrada (RF-011); ruta crítica 8/12 (67%); habilita TASK-028/030 (siguiente en ruta crítica: TASK-030) |
| 2026-09-22 | TASK-030 | 📥 → 🔨 → 👀 | Implementación verificada (commit `e965fe9`, marcadores buy/sell superpuestos con precio de barra bajo cursor, borrables, no persistentes — RI-003); prueba ya en traceability RF-012 (ChartPane.test.tsx: crear, toggle, dedupe, borrado con confirm/Escape); salto Doing→Review confirmado por usuario; DoD cubierta por tests. Ruta crítica: siguiente nodo |
| 2026-09-22 | TASK-030 | 👀 → ✅ | Review validada: DoD completa (precio barra bajo cursor, borrables con confirm/Escape, no persistentes — RI-003); `ChartPane.test.tsx` (6 tests marcadores) + geometría; suite 57/57, lint/typecheck OK; prueba registrada (RF-012); ruta crítica 9/12 (75%); habilita TASK-035 (parcial) y TASK-UI-041 |
| 2026-09-24 | TASK-031 | 📥 → 👀 | Implementación verificada (`indicators.py` + `test_indicators.py`, 21 tests, suite 247 ✅ + 2 skip; ruff/black/mypy OK); fixture golden MA20/RSI14/ATR14 Wilder; prueba RF-013 en traceability; pasa a revisión |
| 2026-09-24 | TASK-031 | 👀 → ✅ | Review validada: DoD completa (fixture golden MA20/RSI14/ATR14 Wilder + 21 tests; suite 247 ✅ + 2 skip, ruff/black/mypy OK); prueba RF-013 registrada; habilita TASK-032/043 |
