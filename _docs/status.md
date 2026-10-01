# Estado del Proyecto: Dibujo Referencia de Operación (Ciclo 04)

> Última actualización: 2026-10-01 12:47
> Fuente: `_docs/backlog.md`, `_docs/traceability.md`

## 1. Resumen ejecutivo

| Métrica | Valor | Δ vs última sesión |
|---------|-------|---------------------|
| Tareas totales | 20 | — |
| 📥 Backlog | 17 | — |
| 🔨 Doing | 0 | — |
| 👀 Review | 0 | -1 |
| ✅ Done | 3 | +1 |
| 🔴 Blocked | 0 | — |
| % Completado | 15% (3/20 tareas · 8/56 pts) | +5% |
| Días sin movimiento | 0 | — |

**Estado general:** 🟢 En curso

## 2. Tablero Kanban

### 📥 Backlog (17)

| ID | Tarea | Épica | Est. | Deps |
|----|-------|-------|------|------|
| TASK-303 | Tests de geometría + `drawings` + `drawing-edit` | EP-301 | 3 | TASK-301, TASK-302 |
| TASK-304 | `projectShape` + `hitTestFragment` de operación | EP-301 | 5 | TASK-301, TASK-UI-300 |
| TASK-305 | Tests de proyección, hit-test y zeroRisk | EP-301 | 3 | TASK-304 |
| TASK-UI-301 | Test de contraste + anti-drift | EP-UI-300 | 2 | TASK-UI-300 |
| TASK-UI-310 | Herramienta en paleta | EP-UI-301 | 2 | TASK-302, TASK-UI-300 |
| TASK-UI-311 | Creación en 2 clics + guards + Shift | EP-UI-301 | 3 | TASK-UI-310, TASK-304 |
| TASK-UI-312 | `layoutOperationLabels` | EP-UI-301 | 5 | TASK-301, TASK-UI-300 |
| TASK-UI-313 | Render 5 líneas + chips | EP-UI-301 | 5 | TASK-UI-312 |
| TASK-UI-314 | `LiveRegion` | EP-UI-301 | 2 | TASK-UI-311 |
| TASK-UI-315 | Tests de render + interacción | EP-UI-301 | 5 | TASK-UI-313, TASK-UI-314 |
| TASK-UI-320 | Round-trip de documento v1 mixto | EP-UI-302 | 2 | TASK-302 |
| TASK-UI-321 | Verificación en Multigráfico | EP-UI-302 | 2 | TASK-UI-311, TASK-UI-313 |
| TASK-TEC-300 | Frame budget con figura activa | EP-TEC-300 | 3 | TASK-UI-313 |
| TASK-TEC-301 | axe-core + a11y | EP-TEC-300 | 2 | TASK-UI-315 |
| TASK-TEC-302 | Suite completa + revisión de previas | EP-TEC-300 | 2 | TASK-UI-321, TASK-TEC-300, TASK-TEC-301 |
| TASK-TEC-303 | Sin deps + backend intacto | EP-TEC-300 | 1 | TASK-TEC-302 |
| TECH-301 | Corregir recuento de tests en README | EP-TEC-300 | 1 | TASK-TEC-302 |

### 🔨 Doing (0)

Sin tareas.

### 👀 Review (0)

Sin tareas.

### ✅ Done (3)

| ID | Tarea | Épica | Completada | Prueba |
|----|-------|-------|------------|--------|
| TASK-301 | `operation-geometry.ts`: dirección, riesgo y 5 niveles | EP-301 | 2026-10-01 | `frontend/src/charting/__tests__/operation-geometry.test.ts` (16 tests · cobertura 93.33% branch) |
| TASK-302 | Modelo `'operation'` en kinds, uniones y color | EP-301 | 2026-10-01 | `frontend/src/charting/__tests__/drawings.test.ts` (round-trip) · `drawing-edit.test.ts` · `overlay-geometry.test.ts` |
| TASK-UI-300 | Tokens de operación (TS + CSS) | EP-UI-300 | 2026-10-01 | `frontend/src/styles/__tests__/tokens.test.ts` (anti-drift + reutilización de colores) |

### 🔴 Blocked (0)

Sin tareas.

## 3. Ruta crítica — estado

```mermaid
graph LR
  T301[TASK-301 ✅] --> T312[TASK-UI-312 📥]
  T312 --> T313[TASK-UI-313 📥]
  T313 --> T315[TASK-UI-315 📥]
  T315 --> TT301[TASK-TEC-301 📥]
  TT301 --> TT302[TASK-TEC-302 📥]
  TT302 --> TT303[TASK-TEC-303 📥]
```

**Avance de ruta crítica:** 1/7 tareas (14%) · 3/23 pts · **ETA estimada:** desconocido (sin velocidad medida).

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

- `TASK-302` introdujo los 3 tokens `drawOp*` y una rama provisional en `projectShape` (`TODO(TASK-304)`). TASK-UI-300 ya cubrió la parte de tokens; queda TASK-304 para la proyección real.
- Deuda preexistente: `npm run format:check` falla en 12 ficheros de `master` (incl. `App.tsx`, `LiveRegion.tsx`, `use-drawing-history.ts` y una línea previa de `tokens.css`). Ajena a este ciclo.
- `TASK-TEC-303` compara contra el arranque del ciclo; el commit `0422923` sirve de base. Sin nuevas dependencias detectadas.

### 🟢 Informativas

- `TASK-UI-300` completada: `OPERATION_TOKENS` (8 tokens) espejado en `tokens.css`; `operation-geometry` consume `tpMultipliers` (fuente única); los 3 colores reutilizan `down`/`up`/`text`. RF-309 al 67% y RNF-305 al 50%.
- RF-301, RF-302 y RF-304 quedan 100% Done; RI-301 al 67%.
- `TASK-UI-301` (contraste), `TASK-303` (tests) y `TASK-304` (proyección) quedan listas.

## 7. Trazabilidad — salud

| Requisito | Tareas | Done | Cobertura |
|-----------|--------|------|-----------|
| RF-301 | 2 | 2 | 100% |
| RF-302 | 1 | 1 | 100% |
| RF-303 | 4 | 1 | 25% |
| RF-304 | 1 | 1 | 100% |
| RF-305 | 3 | 1 | 33% |
| RF-306 | 3 | 1 | 33% |
| RF-307 | 3 | 1 | 33% |
| RF-308 | 3 | 0 | 0% |
| RF-309 | 3 | 2 | 67% |
| RF-310 | 2 | 0 | 0% |
| RF-311 | 2 | 1 | 50% |
| RF-312 | 2 | 0 | 0% |
| RNF-301 | 2 | 0 | 0% |
| RNF-302 | 1 | 0 | 0% |
| RNF-303 | 1 | 0 | 0% |
| RNF-304 | 2 | 1 | 50% |
| RNF-305 | 4 | 2 | 50% |
| RI-301 | 3 | 2 | 67% |
| RX-301 | 1 | 0 | 0% |

**Requisitos sin tareas:** ninguno ✅ · **Requisitos 100% Done:** 3/19 (RF-301, RF-302, RF-304)

## 8. Próximas acciones sugeridas

1. Iniciar **TASK-UI-301** (2 pts), **TASK-303** (3 pts) y **TASK-304** (5 pts); todas con deps ✅.
2. La ruta crítica avanza por `TASK-UI-312`, que aún está en 📥.

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
