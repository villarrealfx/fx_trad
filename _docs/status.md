# Estado del Proyecto: Plataforma de Análisis Técnico (estilo TradingView)

> Última actualización: 2026-09-18
> Fuente: `_docs/backlog.md` (v2), `_docs/traceability.md` (v2)

## 1. Resumen ejecutivo

| Métrica | Valor | Δ vs última sesión |
|---------|-------|---------------------|
| Tareas totales | 61 | +15 (backlog v2: TASK-047 + 14 TASK-UI-XXX) |
| 📥 Backlog | 57 | -1 |
| 🔨 Doing | 0 | — |
| 👀 Review | 0 | -1 |
| ✅ Done | 4 | +1 |
| 🔴 Blocked | 0 | — |
| % Completado | 8.2% (5/61) | +1.6 pp |
| Días sin movimiento | 0 | — |

**Estado general:** 🟢 En curso

## 2. Tablero Kanban

### 📥 Backlog (57)

| ID | Tarea | Épica | Est. | Deps |
|----|-------|-------|------|------|
| TASK-002 | Cliente Dukascopy (bi5 horario) | EP-001 | L | TASK-001 |
| TASK-003 | Endpoint POST /downloads | EP-001 | M | TASK-001 |
| TASK-004 | Celery + RabbitMQ (download_asset) | EP-001 | M | TASK-001 |
| TASK-005 | Retry/backoff 20 s | EP-001 | M | TASK-002, TASK-004 |
| TASK-006 | GET /downloads/{task_id} | EP-001 | S | TASK-003 |
| TASK-007 | Normalización a segundos UTC | EP-001 | S | TASK-002 |
| TASK-008 | Validación ventana ≤ 2 años | EP-001 | S | TASK-002 |
| TASK-010 | Pipeline limpieza e imputación | EP-002 | L | TASK-009 |
| TASK-011 | Normalización UTC y esquema | EP-002 | S | TASK-010 |
| TASK-014 | Agregación OHLC 1m/5m/15m/1h/4h/1d | EP-002 | L | TASK-010, TASK-012 |
| TASK-015 | SerieOHLC Parquet (time único) | EP-003 | M | TASK-009 |
| TASK-016 | Consulta DuckDB activo/rango/TF | EP-003 | M | TASK-015 |
| TASK-017 | Parquet pre-resampling | EP-003 | M | TASK-014, TASK-015 |
| TASK-018 | MetadatosDescarga | EP-003 | S | TASK-015 |
| TASK-019 | Upsert incremental (merge time) | EP-003 | M | TASK-016, TASK-018 |
| TASK-020 | Endpoint GET /assets | EP-004 | S | TASK-016 |
| TASK-021 | Endpoint GET /series | EP-004 | M | TASK-016, TASK-017 |
| TASK-022 | Contrato respuesta TS (lightweight-charts) | EP-004 | S | TASK-009 |
| TASK-047 | Endpoint GET /downloads (historial RI-002) | EP-004 | S | TASK-018 |
| TASK-023 | Scaffold React 18 + Vite 5 + TS 5 | EP-UI-000 | S | — |
| TASK-UI-000 | Setup tokens design system | EP-UI-000 | M | TASK-023 |
| TASK-UI-001 | Primitivas form (Button, Input, Select, RadioGroup, DateRange) | EP-UI-000 | L | TASK-UI-000 |
| TASK-UI-002 | Feedback/overlay (StatusBanner, ProgressBar, Modal, Toast, Tab) | EP-UI-000 | L | TASK-UI-000 |
| TASK-UI-003 | Layout principal + routing (6 rutas, skip link) | EP-UI-000 | M | TASK-023, TASK-UI-000 |
| TASK-UI-004 | A11y base (foco, ARIA, axe en CI, reduced-motion) | EP-UI-000 | M | TASK-UI-003 |
| TASK-UI-010 | SCR-001 Biblioteca (AssetList CMP-006) | EP-UI-001 | L | TASK-020, TASK-UI-001, TASK-UI-003 |
| TASK-UI-020 | SCR-002 Form descarga + validación | EP-UI-002 | M | TASK-003, TASK-UI-001 |
| TASK-UI-021 | SCR-002 Progreso + historial + estados | EP-UI-002 | L | TASK-006, TASK-047, TASK-UI-020 |
| TASK-UI-030 | SCR-003 Estados y validación cobertura | EP-UI-003 | M | TASK-020, TASK-026 |
| TASK-024 | lightweight-charts + datos API | EP-UI-004 | M | TASK-021, TASK-023 |
| TASK-025 | Zoom/pan 60 FPS (2 años) | EP-UI-004 | M | TASK-024 |
| TASK-026 | Selector activo/rango/timeframe | EP-UI-003 | M | TASK-021, TASK-024 |
| TASK-027 | Overlay canvas sincronizado | EP-UI-004 | L | TASK-024 |
| TASK-028 | Línea y rectángulo (crear/borrar) | EP-UI-004 | L | TASK-027 |
| TASK-029 | Retrocesos de Fibonacci | EP-UI-004 | M | TASK-028 |
| TASK-030 | Marcadores entrada/salida | EP-UI-004 | M | TASK-027 |
| TASK-031 | Cálculo MA, RSI, ATR | EP-002 | M | TASK-010 |
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

### ✅ Done (4)

| ID | Tarea | Épica | Completada | Prueba |
|----|-------|-------|------------|--------|
| TASK-009 | Contrato OHLC compartido | EP-002 | 2026-09-18 | `test_ohlc_contract.py` + `ohlc.test.ts` (alineación canónica) |
| TASK-012 | Calendario de mercado | EP-002 | 2026-09-18 | `test_calendar.py` (marzo-2026, 100% cobertura) |
| TASK-013 | Filtro sin mercado | EP-002 | 2026-09-18 | `test_filter.py` (9 tests, 100% cobertura) |
| TASK-001 | Catálogo de activos + modelo de request | EP-001 | 2026-09-18 | `test_catalog.py` + `test_requests.py` (19 tests, 100% cobertura) |

### 🔴 Blocked (0)

Sin tareas.

## 3. Ruta crítica — estado

Estado: 2/12 completadas (17%) · ETA: desconocido (sin velocidad histórica).

```mermaid
graph LR
  T9[TASK-009 ✅] --> T10[TASK-010 📥]
  T10 --> T12[TASK-012 ✅]
  T12 --> T14[TASK-014 📥]
  T14 --> T17[TASK-017 📥]
  T17 --> T21[TASK-021 📥]
  T21 --> T24[TASK-024 📥]
  T24 --> T27[TASK-027 📥]
  T27 --> T30[TASK-030 📥]
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

- PA-3 sin resolver → bloquea decisión de TASK-010 (ruta crítica).
- PA-2 sin resolver → impacta TASK-036 y TASK-UI-060 (ambos en ruta crítica).
- PA-1 sin resolver → impacta TASK-005, TASK-008.
- RNF sin verificación programada (solo RF-003 y RNF-008 tienen prueba vía TASK-009; el resto 0).
- DP-8: 184 pts > capacidad nominal de 2 semanas → priorizar ruta crítica; difiere SCR-005/a11y fino si el plazo aprieta.

### 🟢 Informativas

- Backlog v2 aprobado: 61 tareas (46 heredadas + 15 nuevas) con épicas de UI por pantalla.
- status.md resincronizado contra backlog v2.
- TASK-009 ✅ Done (primer nodo de la ruta crítica implementado y validado).
- TASK-001 ✅ Done (catálogo + request RF-001/HU-001): 19 tests, cobertura 100% en `ingest`; habilita TASK-002/003/004.

## 7. Trazabilidad — salud

| Requisito | Tareas | Done | Cobertura |
|-----------|--------|------|-----------|
| RF-001…RF-016 | (mapeadas en traceability.md) | 1 | 6% |
| RNF-001…RNF-008 | (mapeadas) | 1 | 13% |
| RI-001…RI-003 | (mapeadas) | 0 | 0% |
| RX-001…RX-002 | (mapeadas) | 0 | 0% |

**Requisitos sin tareas:** ninguno ✓ · **Requisitos 100% Done:** 0/29

## 8. Próximas acciones sugeridas

1. Iniciar TASK-012 (calendario de mercado) o TASK-015 (esquema SerieOHLC Parquet) — dependen de TASK-009, ya ✅ Done.
2. Resolver PA-3 para desbloquear TASK-010 (siguiente nodo de la ruta crítica).
3. Iniciar TASK-002 (cliente Dukascopy, dep TASK-001 ✅ Done).
4. Iniciar TASK-037 (monorepo).
5. Iniciar TASK-023 (scaffold UI, base del design system).

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