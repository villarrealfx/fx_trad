# Matriz de Trazabilidad

> Se irá completando en cada fase del pipeline SDD.
> Actualizado: 2026-09-17 (backlog v2 — integra épicas de UI y setup UX). 2026-09-18: Prueba añadida para TASK-009 (contrato OHLC, RF-003 y RNF-008), TASK-012 (calendario, RF-004), TASK-013 (filtro sin mercado, RF-004), TASK-001 (catálogo + request, RF-001) y TASK-002 (cliente Dukascopy, RF-001, RF-002 y RX-001).

**Leyenda:** 🟡 pendiente · 🔵 en progreso · 🟢 completo · 🔴 bloqueado

| Requisito | Diseño (ADR/Componente/Pantalla) | Tarea | Prueba | Estado |
|-----------|---------------------------------|-------|--------|--------|
| RF-001 | Módulo ingest + Celery (ADR-002, ADR-006); SCR-002 | TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-UI-020, TASK-UI-021 | `backend/tests/ingest/test_catalog.py` + `test_requests.py` (TASK-001); `test_dukascopy.py::TestKnownHourDoD` + `test_bi5_codec.py` (TASK-002) | 🔵 |
| RF-002 | Módulo ingest (ADR-002, ADR-006); SCR-002 | TASK-002, TASK-007, TASK-UI-020, TASK-UI-021 | `backend/tests/ingest/test_dukascopy.py::TestAggregation` + `test_bi5_codec.py` (velas 1s UTC, TASK-002) | 🔵 |
| RF-003 | Módulo pipeline (ADR-002, ADR-004) | TASK-009, TASK-010 | `backend/tests/contracts/test_ohlc_contract.py::TestCandleAlignment` (TASK-009) | 🔵 |
| RF-004 | Módulo pipeline (ADR-002) | TASK-012, TASK-013 | `backend/tests/pipeline/test_calendar.py` (TASK-012) + `backend/tests/pipeline/test_filter.py` (TASK-013) | 🟢 |
| RF-005 | Módulo storage (ADR-004) | TASK-015 | [pendiente] | 🔵 |
| RF-006 | Módulo storage + MetadatosDescarga (ADR-004, ADR-006); SCR-002 | TASK-018, TASK-019, TASK-UI-021 | [pendiente] | 🔵 |
| RF-007 | Módulo api + Frontend (ADR-002, ADR-003); SCR-001, CMP-006 | TASK-020, TASK-026, TASK-UI-010 | [pendiente] | 🔵 |
| RF-008 | Módulo api + Frontend (ADR-002, ADR-003); SCR-003 | TASK-021, TASK-026, TASK-UI-030 | [pendiente] | 🔵 |
| RF-009 | Módulo pipeline resampling (ADR-002, ADR-004); SCR-004, CMP-007 | TASK-014, TASK-021, TASK-024, TASK-UI-040 | [pendiente] | 🔵 |
| RF-010 | lightweight-charts (ADR-005); SCR-004, CMP-007 | TASK-024, TASK-025, TASK-UI-040 | [pendiente] | 🔵 |
| RF-011 | Overlay dibujos (ADR-005); SCR-004, CMP-008/CMP-009 | TASK-028, TASK-029, TASK-UI-041 | [pendiente] | 🔵 |
| RF-012 | Overlay dibujos, simulador (ADR-005); SCR-004, CMP-009 | TASK-030, TASK-UI-041 | [pendiente] | 🔵 |
| RF-013 | Pipeline indicadores (ADR-002) + charting (ADR-005); SCR-004, CMP-010 | TASK-031, TASK-032, TASK-UI-042 | [pendiente] | 🔵 |
| RF-014 | Multigráfico sincronizado (ADR-005); SCR-005, CMP-007/CMP-011 | TASK-033, TASK-034, TASK-UI-050 | [pendiente] | 🔵 |
| RF-015 | Módulo export PNG (ADR-005); SCR-006, CMP-014 | TASK-035, TASK-036, TASK-UI-060 | [pendiente] | 🔵 |
| RF-016 | Monolito modular (ADR-001) | TASK-042, TASK-043 | [pendiente] | 🔵 |
| RNF-001 | Cache Karst + lightweight-charts (ADR-007, ADR-005) | TASK-025, TASK-044, TASK-UI-040 | [pendiente] | 🔵 |
| RNF-002 | DuckDB columnar + Cache Karst (ADR-004, ADR-007) | TASK-015, TASK-044 | [pendiente] | 🔵 |
| RNF-003 | Módulo ingest (ADR-006) | TASK-008 | [pendiente] | 🔵 |
| RNF-004 | Módulo pipeline/storage (ADR-002, ADR-004) | TASK-007, TASK-011 | [pendiente] | 🔵 |
| RNF-005 | SPA React client-side (ADR-003); setup UX (accessibility.md) | TASK-023, TASK-046, TASK-UI-003, TASK-UI-004 | [pendiente] | 🔵 |
| RNF-006 | Stack 100% OSS (ADR-001…ADR-009) | TASK-037, TASK-038, TASK-040 | [pendiente] | 🔵 |
| RNF-007 | Monolito modular + CI/CD (ADR-001, ADR-008) | TASK-038, TASK-039, TASK-041 | [pendiente] | 🔵 |
| RNF-008 | Contrato OHLC ↔ lightweight-charts (ADR-005, ADR-007); design-system (EP-UI-000) | TASK-009, TASK-022, TASK-UI-000 | `backend/tests/contracts/test_ohlc_contract.py` + `frontend/src/contracts/__tests__/ohlc.test.ts` (TASK-009, alineación canónica) | 🔵 |
| RI-001 | Schema SerieOHLC, time único (ADR-004) | TASK-015 | [pendiente] | 🔵 |
| RI-002 | MetadatosDescarga (ADR-004, ADR-006); SCR-002 historial | TASK-018, TASK-047, TASK-UI-021 | [pendiente] | 🔵 |
| RI-003 | Overlay: dibujos efímeros, solo PNG (ADR-005); SCR-006 | TASK-036, TASK-UI-060 | [pendiente] | 🔵 |
| RX-001 | Módulo ingest + Celery (ADR-006) | TASK-002, TASK-004 | `backend/tests/ingest/test_bi5_codec.py` (decodificación) + `test_dukascopy.py` (mapeo, URL, OHLC, hora conocida) | 🔵 |
| RX-002 | API REST backend (ADR-002); SCR-004 | TASK-021, TASK-022 | [pendiente] | 🔵 |

**Regla de cubrimiento:** todo requisito tiene ≥1 tarea asociada ✅ (29/29 requisitos IN cubiertos). Requisitos Won't (RF-W-01…RF-W-07) fuera de alcance, sin tareas por decisión `[Won't]` documentada en `requirements.md`.