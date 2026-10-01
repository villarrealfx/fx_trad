# Estado del Proyecto: Dibujo Referencia de Operación (Ciclo 04)

> Última actualización: 2026-10-01 15:22
> Fuente: `_docs/backlog.md`, `_docs/traceability.md`

## 1. Resumen ejecutivo

| Métrica | Valor | Δ vs última sesión |
|---------|-------|---------------------|
| Tareas totales | 20 | — |
| 📥 Backlog | 2 | -1 |
| 🔨 Doing | 0 | — |
| 👀 Review | 0 | — |
| ✅ Done | 18 | +1 |
| 🔴 Blocked | 0 | — |
| % Completado | 90% (18/20 tareas · 54/56 pts) | +5% |
| Días sin movimiento | 0 | — |

**Estado general:** 🟢 En curso

## 2. Tablero Kanban

### 📥 Backlog (2)

| ID | Tarea | Épica | Est. | Deps |
|----|-------|-------|------|------|
| TASK-TEC-303 | Sin deps + backend intacto | EP-TEC-300 | 1 | TASK-TEC-302 |
| TECH-301 | Corregir recuento de tests en README | EP-TEC-300 | 1 | TASK-TEC-302 |

### 🔨 Doing (0)

Sin tareas.

### 👀 Review (0)

Sin tareas.

### ✅ Done (18)

| ID | Tarea | Épica | Completada | Prueba |
|----|-------|-------|------------|--------|
| TASK-301 | `operation-geometry.ts`: dirección, riesgo y 5 niveles | EP-301 | 2026-10-01 | `frontend/src/charting/__tests__/operation-geometry.test.ts` (16 tests · cobertura 93.33% branch) |
| TASK-302 | Modelo `'operation'` en kinds, uniones y color | EP-301 | 2026-10-01 | `frontend/src/charting/__tests__/drawings.test.ts` (round-trip) · `drawing-edit.test.ts` · `overlay-geometry.test.ts` |
| TASK-303 | Tests de geometría + `drawings` + `drawing-edit` | EP-301 | 2026-10-01 | `operation-geometry.test.ts` (17) · `drawing-edit.test.ts` (19) · `drawings.test.ts` (14) |
| TASK-304 | `projectShape` + `hitTestFragment` de la operación | EP-301 | 2026-10-01 | `frontend/src/charting/__tests__/overlay-geometry.test.ts` (proyección + hit-test 6px) · cobertura 94.73% branch |
| TASK-305 | Tests de proyección, hit-test y zeroRisk | EP-301 | 2026-10-01 | `frontend/src/charting/__tests__/overlay-geometry.test.ts` (hit-test de las 5 y zeroRisk) |
| TASK-UI-300 | Tokens de operación (TS + CSS) | EP-UI-300 | 2026-10-01 | `frontend/src/styles/__tests__/tokens.test.ts` (anti-drift + reutilización de colores) |
| TASK-UI-301 | Test de contraste + anti-drift | EP-UI-300 | 2026-10-01 | `frontend/src/styles/__tests__/tokens.test.ts` (4 etiquetas × 2 fondos) |
| TASK-UI-310 | Herramienta "Operación" en la paleta | EP-UI-301 | 2026-10-01 | `frontend/src/components/ChartPane/ChartPane.test.tsx` (tras Fibonacci) · `DrawTool.test.tsx` |
| TASK-UI-311 | Creación en 2 clics + guards + Shift | EP-UI-301 | 2026-10-01 | `frontend/src/components/ChartPane/ChartPane.test.tsx` (creación, guard y Shift) |
| TASK-UI-312 | `layoutOperationLabels` (separación mínima + guía) | EP-UI-301 | 2026-10-01 | `frontend/src/charting/__tests__/operation-geometry.test.ts` (4 casos de layout) |
| TASK-UI-313 | Render de 5 líneas + chips de etiqueta | EP-UI-301 | 2026-10-01 | `frontend/src/components/ChartPane/ChartPane.test.tsx` (render de líneas y chips) |
| TASK-UI-314 | `LiveRegion`: anuncio de la operación | EP-UI-301 | 2026-10-01 | `operation-geometry.test.ts` (texto) · `ChartPane.test.tsx` (anuncio al confirmar) |
| TASK-UI-315 | Tests de render + interacción | EP-UI-301 | 2026-10-01 | `OverlayCanvas.test.tsx` (5 líneas, chips, líder, zeroRisk) · `ChartPane.test.tsx` |
| TASK-UI-320 | Round-trip de documento v1 mixto | EP-UI-302 | 2026-10-01 | `frontend/src/state/__tests__/chart-config.test.ts` (5 tipos + operación) |
| TASK-UI-321 | Verificación pane a pane en Multigráfico | EP-UI-302 | 2026-10-01 | `operation-geometry.test.ts` (layout 2 escalas) · `MultiChart.test.tsx` (syncId por pane) |
| TASK-TEC-301 | axe-core + a11y de la operación | EP-TEC-300 | 2026-10-01 | `frontend/src/components/ChartPane/ChartPane.test.tsx` (axe con operación, ARIA, anuncio al mover) |
| TASK-TEC-300 | Frame budget con la operación activa | EP-TEC-300 | 2026-10-01 | `frontend/src/components/ChartPane/ChartPane.test.tsx` (60 FPS, 0 frames caídos) |
| TASK-TEC-302 | Suite completa + revisión de previas | EP-TEC-300 | 2026-10-01 | `vitest` 55 archivos / 458 tests; tests de fib/line/rect/marker intactos |

### 🔴 Blocked (0)

Sin tareas.

## 3. Ruta crítica — estado

```mermaid
graph LR
  T301[TASK-301 ✅] --> T312[TASK-UI-312 ✅]
  T312 --> T313[TASK-UI-313 ✅]
  T313 --> T315[TASK-UI-315 ✅]
  T315 --> TT301[TASK-TEC-301 ✅]
  TT301 --> TT302[TASK-TEC-302 ✅]
  TT302 --> TT303[TASK-TEC-303 📥]
```

**Avance de ruta crítica:** 6/7 tareas (86%) · 22/23 pts · **ETA estimada:** desconocido (sin velocidad medida).

## 4. Métricas

### 4.1 Velocidad (si hay histórico)

Sin datos del ciclo 04. El ciclo 03 cerró 35 tareas / 121 pts en una sesión de 1 dev; no es una velocidad sostenida comparable.

### 4.2 Burn-down (si hay datos)

Sin datos (0 tareas Done).

### 4.3 Lead time / Cycle time

- Lead time promedio: sin datos.
- Cycle time promedio: sin datos.

## 5. Bloqueos activos

Ninguno.

## 6. Alertas

### 🔴 Críticas

- Ninguna.

### 🟡 Advertencias

- **`zeroRisk` implementado en TASK-UI-315** (no en TASK-UI-313): gap de spec detectado al auditar el DoD; corregido en la tarea de test y anotado.
- Deuda preexistente: `npm run format:check` falla en 12 ficheros de `master` (incl. `App.tsx`, `LiveRegion.tsx`, `use-drawing-history.ts` y una línea previa de `tokens.css`). Ajena a este ciclo.
- `TASK-TEC-303` compara contra el arranque del ciclo; el commit `0422923` sirve de base. Sin nuevas dependencias detectadas.

### 🟢 Informativas

- `TASK-TEC-302` completada: suite frontend **55 archivos / 458 tests** en verde; tests de fib/line/rect/marker intactos. **RNF-303 a 100% → 18/19 requisitos.**
- Solo falta **RX-301**, que cierra **TASK-TEC-303** (sin deps + backend intacto).
- Faltan TASK-TEC-303 (sin deps) y TECH-301 (README).

## 7. Trazabilidad — salud

| Requisito | Tareas | Done | Cobertura |
|-----------|--------|------|-----------|
| RF-301 | 3 | 3 | 100% |
| RF-302 | 1 | 1 | 100% |
| RF-303 | 4 | 4 | 100% |
| RF-304 | 1 | 1 | 100% |
| RF-305 | 3 | 3 | 100% |
| RF-306 | 3 | 3 | 100% |
| RF-307 | 3 | 3 | 100% |
| RF-308 | 3 | 3 | 100% |
| RF-309 | 3 | 3 | 100% |
| RF-310 | 2 | 2 | 100% |
| RF-311 | 2 | 2 | 100% |
| RF-312 | 2 | 2 | 100% |
| RNF-301 | 2 | 2 | 100% |
| RNF-302 | 1 | 1 | 100% |
| RNF-303 | 1 | 1 | 100% |
| RNF-304 | 2 | 2 | 100% |
| RNF-305 | 4 | 4 | 100% |
| RI-301 | 3 | 3 | 100% |
| RX-301 | 1 | 0 | 0% |

**Requisitos sin tareas:** ninguno ✅ · **Requisitos 100% Done:** 18/19 (solo falta RX-301)

## 8. Próximas acciones sugeridas

1. Iniciar **TASK-TEC-303** (1 pt, deps ✅): `package.json` sin deps nuevas y backend intacto (RX-301).
2. Le sigue **TECH-301** (README, 1 pt); cierra el ciclo.

## 9. Historial de cambios (append-only)

| Fecha | Tarea | Transición | Motivo |
|-------|-------|-----------|--------|
| 2026-10-01 | — (las 20) | — → 📥 Backlog | Inicialización de `status.md` desde `backlog.md` |
| 2026-10-01 | TASK-301 | 📥 → 🔨 | Implementación del módulo puro y sus tests |
| 2026-10-01 | TASK-301 | 🔨 → 👀 | Movida a revisión (`/sdd-track update TASK-301 review`) |
| 2026-10-01 | TASK-301 | 👀 → ✅ Done | DoD verificada (módulo puro, 5 niveles sin 1:1, precios RF-303); autorización del usuario |
| 2026-10-01 | TASK-302 | 📥 → 🔨 | Ampliación del modelo con `'operation'` y sus tests |
| 2026-10-01 | TASK-302 | 🔨 → 👀 | Movida a revisión (`/sdd-track update TASK-302 review`) |
| 2026-10-01 | TASK-302 | 👀 → ✅ Done | DoD verificada (`tsc` limpio, guarda y round-trip, ambas guardas coherentes); autorización del usuario |
| 2026-10-01 | TASK-UI-300 | 📥 → 🔨 | `OPERATION_TOKENS` + anti-drift y reutilización de colores |
| 2026-10-01 | TASK-UI-300 | 🔨 → 👀 | Movida a revisión (`/sdd-track update TASK-UI-300 review`) |
| 2026-10-01 | TASK-UI-300 | 👀 → ✅ Done | DoD verificada (anti-drift verde, colores reutilizan base, patrón AXIS/MARKER); autorización del usuario |
| 2026-10-01 | TASK-UI-301 | 📥 → 🔨 | Matriz de contraste 4 etiquetas × 2 fondos + anti-drift |
| 2026-10-01 | TASK-UI-301 | 🔨 → 👀 | Movida a revisión (`/sdd-track update TASK-UI-301 review`) |
| 2026-10-01 | TASK-UI-301 | 👀 → ✅ Done | DoD verificada (4 etiquetas ≥4.5:1 sobre chart y chip, anti-drift); autorización del usuario |
| 2026-10-01 | TASK-303 | 📥 → 🔨 | 3 casos nuevos (arrastre, resize `from`, etiquetas en Venta) |
| 2026-10-01 | TASK-303 | 🔨 → 👀 | Movida a revisión (`/sdd-track update TASK-303 review`) |
| 2026-10-01 | TASK-303 | 👀 → ✅ Done | DoD verificada (7 puntos cubiertos + 3 casos nuevos); autorización del usuario |
| 2026-10-01 | TASK-304 | 📥 → 🔨 | Proyección de los 5 niveles + hit-test por línea |
| 2026-10-01 | TASK-304 | 🔨 → 👀 | Movida a revisión; árbol verde (426 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-304 | 👀 → ✅ Done | DoD verificada sin problemas (5 niveles con y correcta, hit-test 6px, resto intacto); autorización del usuario |
| 2026-10-01 | TASK-305 | 📥 → 🔨 | Hit-test de las 5 reales y caracterización de zeroRisk |
| 2026-10-01 | TASK-305 | 🔨 → 👀 | Movida a revisión; árbol verde (428 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-305 | 👀 → ✅ Done | DoD verificada sin problemas; cierra EP-301; autorización del usuario |
| 2026-10-01 | TASK-UI-310 | 📥 → 🔨 | Herramienta "Operación" en la paleta + guard provisional |
| 2026-10-01 | TASK-UI-310 | 🔨 → 👀 | Movida a revisión; árbol verde (430 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-UI-310 | 👀 → ✅ Done | DoD verificada sin problemas (botón tras Fibonacci, nombre accesible, aria-pressed); autorización del usuario |
| 2026-10-01 | TASK-UI-311 | 📥 → 🔨 | Creación en 2 clics, guards y Shift; retira el guard provisional |
| 2026-10-01 | TASK-UI-311 | 🔨 → 👀 | Movida a revisión; árbol verde (433 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-UI-311 | 👀 → ✅ Done | DoD verificada sin problemas (2 clics crean una figura, guard y Shift); autorización del usuario |
| 2026-10-01 | TASK-UI-312 | 📥 → 🔨 | `layoutOperationLabels`: separación mínima y corrección de desbordamiento |
| 2026-10-01 | TASK-UI-312 | 🔨 → 👀 | Movida a revisión; árbol verde (437 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-UI-312 | 👀 → ✅ Done | DoD verificada sin problemas; ruta crítica 2/7; autorización del usuario |
| 2026-10-01 | TASK-UI-313 | 📥 → 🔨 | Render de las 5 líneas + chips; retira el skip provisional |
| 2026-10-01 | TASK-UI-313 | 🔨 → 👀 | Movida a revisión; árbol verde (438 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-UI-313 | 👀 → ✅ Done | DoD verificada sin problemas; RF-309 100%; ruta crítica 3/7; autorización del usuario |
| 2026-10-01 | TASK-UI-314 | 📥 → 🔨 | Anuncio accesible de la operación (crear/mover/borrar) |
| 2026-10-01 | TASK-UI-314 | 🔨 → 👀 | Movida a revisión; árbol verde (442 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-UI-314 | 👀 → ✅ Done | DoD verificada sin problemas; autorización del usuario |
| 2026-10-01 | TASK-UI-315 | 📥 → 🔨 | Tests de render/interacción + fix de `zeroRisk` (gap de spec) |
| 2026-10-01 | TASK-UI-315 | 🔨 → 👀 | Movida a revisión; árbol verde (447 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-UI-315 | 👀 → ✅ Done | DoD verificada; EP-UI-301 cerrada; 11/19 requisitos 100%; autorización del usuario |
| 2026-10-01 | TASK-UI-320 | 📥 → 🔨 | Round-trip de documento v1 mixto con operación |
| 2026-10-01 | TASK-UI-320 | 🔨 → 👀 | Movida a revisión; árbol verde (451 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-UI-320 | 👀 → ✅ Done | DoD verificada; RF-311/RNF-304/RI-301 100% (14/19); autorización del usuario |
| 2026-10-01 | TASK-UI-321 | 📥 → 🔨 | Verificación pane a pane en Multigráfico |
| 2026-10-01 | TASK-UI-321 | 🔨 → 👀 | Movida a revisión; árbol verde (454 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-UI-321 | 👀 → ✅ Done | DoD verificada; EP-UI-302 cerrada; RF-310 100% (15/19); autorización del usuario |
| 2026-10-01 | TASK-TEC-301 | 📥 → 🔨 | axe con operación, ARIA del botón y anuncio al mover |
| 2026-10-01 | TASK-TEC-301 | 🔨 → 👀 | Movida a revisión; árbol verde (457 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-TEC-301 | 👀 → ✅ Done | DoD verificada; RNF-305 100% (16/19); ruta crítica 5/7; autorización del usuario |
| 2026-10-01 | TASK-TEC-300 | 📥 → 🔨 | Frame budget arrastrando la operación |
| 2026-10-01 | TASK-TEC-300 | 🔨 → 👀 | Movida a revisión; árbol verde (458 tests, tsc/eslint OK) |
| 2026-10-01 | TASK-TEC-300 | 👀 → ✅ Done | DoD verificada (0 frames caídos); RNF-302 100% (17/19); autorización del usuario |
| 2026-10-01 | TASK-TEC-302 | 📥 → 🔨 | Suite completa en verde + revisión de las herramientas previas |
| 2026-10-01 | TASK-TEC-302 | 🔨 → 👀 | Movida a revisión; 55 archivos / 458 tests |
| 2026-10-01 | TASK-TEC-302 | 👀 → ✅ Done | DoD verificada (458 tests, previas intactas); RNF-303 100% (18/19); autorización del usuario |
