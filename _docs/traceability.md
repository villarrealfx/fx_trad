# Matriz de Trazabilidad — Ciclo 03 (Mejoras UX)

> Requisitos `2xx` de este ciclo; los heredados se referencian (ya cubiertos en ciclos 01/02).
> **Leyenda:** 🟡 pendiente · 🔵 en progreso (diseño + tareas asignadas) · 🟢 completo · 🔴 bloqueado
> Diseño: ADR-017…021. Tareas: `_docs/backlog.md`.

## Requisitos funcionales

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RF-201 Indicadores sin defaults | `IndicatorForm` + `ChartHeader` (ADR-019) | TASK-UI-211, TASK-UI-212 | `frontend/src/state/__tests__/use-chart-config.test.tsx` (estado inicial vacío) | 🟢 |
| RF-202 Eliminar panel inferior + fullscreen | `IndicatorForm`/`ChartPane` (ADR-019) | TASK-UI-213, TASK-UI-231 | [pendiente] | 🔵 |
| RF-203 Formulario flotante de indicadores | `IndicatorForm` + `ChartHeader` (ADR-019) | TASK-UI-212, TASK-UI-214 | `frontend/src/components/IndicatorForm/__tests__/IndicatorForm.test.tsx` | 🔵 |
| RF-204 Persistir config al cambiar de hoja | `state/chart-config` + `use-chart-config` (ADR-018) | TASK-UI-240, TASK-UI-241 | `frontend/src/state/__tests__/use-chart-config.test.tsx` (navegar/recargar) | 🟢 |
| RF-205 Export en el header | `ChartHeader` (ADR-019) | TASK-UI-210, TASK-UI-232 | `frontend/src/components/ChartHeader/__tests__/ChartHeader.test.tsx`, `frontend/src/__tests__/app.test.tsx` | 🔵 |
| RF-206 Eje X con hora:minuto | `ChartPane` (ejes) | TASK-UI-230 | [pendiente] | 🔵 |
| RF-207 Eje Y 5 decimales (derecha) | `ChartPane` (ejes) | TASK-UI-230 | [pendiente] | 🔵 |
| RF-208 Marcas compra/venta fuera de la vela | `charting/drawings` (ADR-017) | TASK-UI-223 | [pendiente] | 🔵 |
| RF-209 Colores mate por dibujo | `charting/drawings` (ADR-017) | TASK-UI-220 | `frontend/src/charting/__tests__/drawings.test.ts` (color por token) | 🟢 |
| RF-210 Shift horizontal/vertical | `charting/drawings` (ADR-017) | TASK-UI-223 | [pendiente] | 🔵 |
| RF-211 Íconos representativos | Design system / iconografía | TASK-UI-200 | `frontend/src/styles/__tests__/tokens.test.ts` (tokens de ícono) | 🔵 |
| RF-212 Editar dibujos (mover/redimensionar) | `drawing-edit` + `use-drawing-edit` (ADR-017) | TASK-UI-221 | `frontend/src/charting/__tests__/drawing-edit.test.ts`, `.../use-drawing-edit.test.tsx` | 🟢 |
| RF-213 Undo/redo de dibujos | `drawing-history` + `drawing-edit` (ADR-017) | TASK-UI-222 | `frontend/src/charting/__tests__/drawing-history.test.ts`, `.../ChartPane.test.tsx` (atajos) | 🟢 |
| RF-214 Descarga centrada | `DownloadScreen` (layout) | TASK-UI-250 | [pendiente] | 🔵 |
| RF-215 Activo en historial | `DownloadHistory` | TASK-UI-251 | [pendiente] | 🔵 |
| RF-216 5 pares forex nuevos | `ingest.catalog` + `ingest.freeserv` (ADR-021) | TASK-201, TASK-UI-252 | [pendiente] | 🔵 |
| RF-217 Backend de nuevos activos | `ingest` + `api` (ADR-021) | TASK-202, TASK-203 | [pendiente] | 🔵 |
| RF-218 Abrir centrada | `ChartSelector` (layout) | TASK-UI-260 | [pendiente] | 🔵 |
| RF-219 Retirar `1s` de la UI | `contracts/ohlc` front+back (ADR-020) | TASK-205, TASK-206, TASK-UI-261 | [pendiente] | 🔵 |
| RF-220 `GET /assets` + retirar espejo | `catalog` + `GET /assets` (ADR-021) | TASK-204, TASK-UI-270 | [pendiente] | 🔵 |

## Requisitos no funcionales

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RNF-201 Persistencia versionada robusta | `state/chart-config` (ADR-018) | TASK-UI-240, TASK-UI-241, TASK-UI-242 | [pendiente] | 🔵 |
| RNF-202 Edición de dibujos a 60 FPS | `OverlayCanvas` + drawings (ADR-017) | TASK-UI-222, TASK-UI-224 | TASK-TEC-212 | 🔵 |
| RNF-203 0 regresiones | CI GitHub Actions (ADR-008) + suites | TASK-TEC-210 | TASK-TEC-210 | 🔵 |
| RNF-204 Tokens de diseño | Design system frontend | TASK-UI-200 | `frontend/src/styles/__tests__/tokens.test.ts` (contraste + anti-drift) | 🟢 |
| RNF-205 Activos nuevos misma latencia/contrato | `ingest` (ADR-021) | TASK-202, TASK-203 | [pendiente] | 🔵 |
| RNF-001 Latencia 60 FPS (heredado) | `lightweight-charts` + overlay (ADR-005/017) | Heredado (01/02) | [pendiente] | 🔵 |
| RNF-004 UTC (heredado) | `pipeline` (ADR-002) | Heredado (01/02) | [pendiente] | 🔵 |
| RNF-005 Navegador moderno (heredado) | SPA React (ADR-003) | Heredado (01/02) | [pendiente] | 🔵 |
| RNF-006 $0 OSS (heredado) | Stack OSS (ADR-008) | Heredado (01/02) | [pendiente] | 🔵 |
| RNF-007 Plazo 2 semanas (heredado) | Alcance acotado | Heredado (01/02) | [pendiente] | 🔵 |
| ACC-201 Accesibilidad axe-core (heredado) | ADR-011 + contratos ARIA | TASK-UI-201, TASK-TEC-211 | `frontend/src/components/ui/__tests__/LiveRegion.test.tsx`, `.../AppShell.test.tsx` (skip link) | 🔵 |

## Requisitos de información

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RI-201 Entidad Configuración de gráfico | `state/chart-config` (ADR-018) | TASK-UI-220, TASK-UI-240, TASK-UI-241, TASK-UI-242 | `frontend/src/state/__tests__/chart-config.test.ts`, `frontend/src/charting/__tests__/drawings.test.ts` | 🔵 |
| RI-202 Catálogo vía `GET /assets` | `GET /assets` + `CatalogQuery` (ADR-021) | TASK-203, TASK-204 | [pendiente] | 🔵 |
| RI-001 OHLC time único UTC (heredado) | `storage` (ADR-004) | Heredado (01/02) | [pendiente] | 🔵 |
| RI-002 Metadatos de descarga (heredado) | `storage` (ADR-004) | Heredado (01/02) | [pendiente] | 🔵 |

## Requisitos de integración

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RX-201 Dukascopy sirve los 5 pares nuevos | `ingest.freeserv.FREESERV_INSTRUMENT` (ADR-021) | TASK-202 | [pendiente] | 🔵 |
| RX-202 Frontend consume `GET /assets` | `services/assets` + `catalog` (ADR-021) | TASK-204, TASK-UI-270 | [pendiente] | 🔵 |
| RX-001 Integración Dukascopy (heredado) | `ingest` (ADR-010) | Heredado (01/02) | [pendiente] | 🔵 |

## Modificaciones a requisitos previos

| Requisito previo | Modificado por | Nota |
|------------------|----------------|------|
| `RI-003` (01-mvp): los dibujos NO se almacenan | RI-201 / RF-204 (ADR-018) | Ahora se persisten en el navegador (no en backend) |
| Deuda ciclo 02: `"1s"` en contrato `Timeframe` | RF-219 (ADR-020) | Se retira del contrato API + espejo TS y de la UI |

## Cobertura

- Requisitos `2xx` con ≥1 tarea: ✅ todos.
- Diseño: ✅ ADR-017…021. Tareas: ✅ `_docs/backlog.md`. Pruebas: pendiente `/sdd-implement` + `/sdd-track`.
- Heredados (01/02): sin tareas nuevas en este ciclo.
