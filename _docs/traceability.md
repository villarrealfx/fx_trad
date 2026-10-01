# Matriz de Trazabilidad — Ciclo 04 (Dibujo Referencia de Operación)

> Requisitos `3xx` de este ciclo; los heredados se referencian (ya cubiertos en ciclos 01/02/03).
> **Leyenda:** 🟡 pendiente · 🔵 en progreso (diseño + tareas asignadas) · 🟢 completo · 🔴 bloqueado
> Diseño: `_docs/architecture.md` + ADR-022…025. Tareas: `_docs/backlog.md` (20 tareas, 56 pts).

## Requisitos funcionales

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RF-301 Dos anclas Entrada/SL | `operation-geometry` + `OverlayShape {kind:'operation'}` (ADR-022) | TASK-301, TASK-302 | `operation-geometry.test.ts` (`operationRisk`) · `drawings.test.ts` | 🟢 |
| RF-302 Dirección automática | `operationDirection` (ADR-022) | TASK-301 | `operation-geometry.test.ts` (`operationDirection`) | 🟢 |
| RF-303 Cinco niveles visibles | `operationLevels` + `projectShape` (ADR-022) | TASK-301, TASK-304, TASK-303, TASK-305 | `operation-geometry.test.ts` (precios RF-303) · `overlay-geometry.test.ts` (proyección de los 5 niveles) · `OverlayCanvas.test.tsx` | 🔵 |
| RF-304 Niveles de cálculo no visibles | `OPERATION_TP_MULTIPLIERS` = solo `[1.382, 1.5, 2]`; sin 1:1 (ADR-022, D-3) | TASK-301 | `operation-geometry.test.ts` (no incluye el 1:1) | 🟢 |
| RF-305 Recálculo de TP y dirección | Derivación pura por proyección; sin estado ni caché (ADR-022, RI-301) | TASK-301, TASK-UI-311, TASK-UI-314 | `operation-geometry.test.ts` (recalcula al mover el SL) | 🔵 |
| RF-306 Un único dibujo | `kind:'operation'` propio; `hitTestFragment` por línea (ADR-022) | TASK-302, TASK-304, TASK-UI-311 | `drawings.test.ts` (unión y guarda aceptan la operación) · `overlay-geometry.test.ts` (hit-test de cualquiera de las 5) | 🔵 |
| RF-307 Edición por handles | `'operation'` en `ResizableShape` (ADR-022); command stack heredado | TASK-302, TASK-UI-311, TASK-UI-315 | `drawing-edit.test.ts` (`isResizableShape`, handles, resize/move de la operación) | 🔵 |
| RF-308 Etiquetas con precio a 5 decimales | `layoutOperationLabels` + `axis-format` (ADR-025) | TASK-UI-312, TASK-UI-313, TASK-UI-315 | `operation-geometry.test.ts` | 🔵 |
| RF-309 Colores por token de rol | `operationLevelColors` + `drawOpSl/Entry/Tp` (ADR-024) | TASK-302, TASK-UI-300, TASK-UI-313 | `tokens.test.ts` (reutiliza `up`/`down`/`text` + contraste) · `drawings.test.ts` (`colorForShape` → `drawOpEntry`) | 🔵 |
| RF-310 Disponible en Gráfico y Multigráfico | `ChartToolType` + `TOOL_DESCRIPTORS` (`ChartPane.tsx:77`) | TASK-UI-310, TASK-UI-321 | `ChartPane.test.tsx` | 🔵 |
| RF-311 Persistencia sin campos nuevos | Ampliación aditiva en v1 (ADR-023) | TASK-302, TASK-UI-320 | `drawings.test.ts` (round-trip conserva la operación) · `chart-config.test.ts` (mixto) | 🔵 |
| RF-312 Desenlace legible por lectura | Niveles visibles, sin cálculo ni persistencia (RF-W-302) | TASK-UI-313, TASK-UI-315 | `OverlayCanvas.test.tsx` | 🔵 |

## Requisitos no funcionales

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RNF-301 Etiquetas sin solape | Separación mínima + línea guía en `layoutOperationLabels` (ADR-025) | TASK-UI-312, TASK-UI-315 | `operation-geometry.test.ts` (niveles a ~14 px) | 🔵 |
| RNF-302 60 FPS con la figura activa | `OverlayCanvas` + frame-batch (ADR-017); 5 niveles O(1) por frame (ADR-022) | TASK-TEC-300 | `ChartPane.test.tsx` (frame budget) | 🔵 |
| RNF-303 0 regresiones | CI GitHub Actions (ADR-008) | TASK-TEC-302 | `vitest` completo (baseline 393) | 🔵 |
| RNF-304 No perder dibujos previos | Sin bump de versión ni de clave; `isOverlayShape` aditivo (ADR-023, P-301) | TASK-302, TASK-UI-320 | `chart-config.test.ts` (doc v1 mixto) | 🔵 |
| RNF-305 Contraste y anti-drift de tokens | 3 tokens en `tokens.ts` **y** `tokens.css` (ADR-024); medido 5.61 / 16.56 / 6.53 : 1 | TASK-302, TASK-UI-300, TASK-UI-301, TASK-TEC-301 | `tokens.test.ts` (anti-drift de `OPERATION_TOKENS` + contraste de las 4 etiquetas sobre chart y chip) | 🔵 |
| RNF-202 60 FPS en edición (heredado) | `OverlayCanvas` + drawings (ADR-017) | Heredado (03) | `benchmark-ui.md` (03) | 🟢 |
| RNF-201 Persistencia robusta (heredado) | `state/chart-config` (ADR-018) | Heredado (03) | `chart-config.test.ts` (03) | 🟢 |
| RNF-204 Tokens de diseño (heredado) | Design system frontend | Heredado (03) | `tokens.test.ts` (03) | 🟢 |
| RNF-001 / RNF-004 / RNF-005 / RNF-006 / RNF-007 (heredados) | Stack vigente (ADR-001…009) | Heredado (01) | `iterations/01-mvp/` | 🟢 |
| ACC-201 Accesibilidad axe-core (hijos + extender) | ADR-011 + contratos ARIA | Heredado (03); **nuevo**: TASK-UI-314, TASK-TEC-301 | `a11y.test.tsx` (03) · `ChartPane.test.tsx` (nuevo) | 🟢 |

## Requisitos de información

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RI-301 Entidad Operación | `OverlayShape {kind:'operation', from, to}`; niveles derivados, no persistidos (ADR-022) | TASK-301, TASK-302, TASK-UI-320 | `operation-geometry.test.ts` · `drawings.test.ts` (round-trip) | 🔵 |
| RI-201 Configuración de gráfico (heredado) | `state/chart-config` (ADR-018) | Heredado (03) | `use-chart-config.test.tsx` (03) | 🟢 |
| RI-003 Modificado por RI-201 (ciclo 03) | `state/chart-config` (ADR-018) | Heredado (03) | — | 🟢 |
| RI-001 / RI-002 (heredados) | `storage` (ADR-004) | Heredado (01) | `iterations/01-mvp/` | 🟢 |

## Requisitos de integración

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RX-301 Sin dependencias nuevas | Layout y geometría propios (ADR-022, ADR-025); `package.json` sin cambios | TASK-TEC-303 | `package.json` sin diff | 🔵 |
| RX-001 Integración Dukascopy (heredado) | `ingest` (ADR-010) | Heredado (01) | `iterations/01-mvp/` | 🟢 |

## Modificaciones a requisitos previos

| Requisito previo | Modificado por | Nota |
|------------------|----------------|------|
| `RF-W-205` (03): "Tiempo real, backtesting y trading en vivo" fuera de alcance | plan.md §1.1 | El **backtesting manual** pasa a ser el propósito del proyecto; el automatizado sigue OUT (`RF-W-306`) |
| `RF-209` (03): paleta mate por tipo de dibujo | RF-309 | La figura de operación usa **colores semánticos** (rojo/blanco/verde) vía tokens propios, sin alterar la paleta de las herramientas existentes (ADR-024) |
| `RF-208` (03): marcas de compra/venta de triángulo fijo | RF-301/303 | La operación nueva no reemplaza al simulador de compra/venta; conviven en la paleta (ADR-022) |
| `ADR-018` (03): política de **descarte** ante versión desconocida | ADR-023 | La política queda **latente**: este ciclo amplía en v1 de forma aditiva, sin bumpar versión ni clave (P-301) |

## Cobertura

- Diseño: **completo** — `_docs/architecture.md` + ADR-022…025; sin RNF huérfanos.
- P-301 (versión del documento) y P-304 (contraste) resueltos: ADR-023 y ADR-024.
- Requisitos `3xx` con ≥1 tarea: **19/19** ✅ (RF 12/12, RNF 5/5, RI 1/1, RX 1/1) en `_docs/backlog.md`.
- La tabla "Modificaciones a requisitos previos" marca 🔵 en las filas de RF-209/208: las resuelve TASK-UI-300 (colores) y TASK-UI-310 (convivencia con el simulador).
- Áreas sin épica: SCR-001, SCR-002, SCR-003, SCR-006 — heredadas sin cambios por `interaction-specs.md`.
- Heredados: sin tareas nuevas salvo donde se extienden explícitamente (RF-307, RF-311).