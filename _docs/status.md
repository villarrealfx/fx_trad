# Estado del Proyecto: Dibujo Referencia de Operación (Ciclo 04)

> Última actualización: 2026-10-02 09:45
> Fuente: `_docs/backlog.md`, `_docs/traceability.md`

## 1. Resumen ejecutivo

| Métrica | Valor | Δ vs última sesión |
|---------|-------|---------------------|
| Tareas totales | 20 | — |
| 📥 Backlog | 0 | -1 |
| 🔨 Doing | 0 | — |
| 👀 Review | 0 | — |
| ✅ Done | 20 | +1 |
| 🔴 Blocked | 0 | — |
| % Completado | 100% (20/20 tareas · 56/56 pts) | +5% |
| Días sin movimiento | 0 | — |

**Estado general:** ✅ Ciclo 04 completado (20/20 tareas · 56/56 pts)

**Ciclo 05:** abierto — `TECH-304` ✅ Done (CI run #31 en verde). Sin trabajo activo. Ver §10.

## 2. Tablero Kanban

### 📥 Backlog (0)

Sin tareas.

### 🔨 Doing (0)

Sin tareas.

### 👀 Review (0)

Sin tareas.

### ✅ Done (20)

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
| TASK-TEC-303 | Sin dependencias nuevas + backend intacto | EP-TEC-300 | 2026-10-01 | `git diff 0422923..HEAD` de `frontend/package.json`, `package-lock.json` y `backend/`: vacío |
| TECH-301 | Recuento de tests del frontend en README | EP-TEC-300 | 2026-10-02 | `README.md`: **458 tests · 55 archivos** = salida real de `vitest`; se cierra la deriva 389/392/393 (DP-6) |

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
  TT302 --> TT303[TASK-TEC-303 ✅]
```

**Avance de ruta crítica:** 7/7 tareas (100%) · 23/23 pts · **ETA estimada:** ruta crítica cerrada ✅ (sin velocidad medida)

> `TECH-301` (1 pt) cuelga en paralelo de `TASK-TEC-302` con la misma longitud que
> `TASK-TEC-303`; queda cerrada como segunda hoja final del ciclo.

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

- Ninguna. **CI en VERDE: run #31 (`f4f3c4e`), Frontend y Backend en `success`.**

### 🟡 Advertencias

- **El paso de lint enmascaraba fallos de test.** Con `format:check` roto, `make lint-frontend` cortaba el job **antes** de ejecutar vitest, así que un segundo fallo llevaba tiempo oculto. Se detectó al destaparlo. Suele ocurrir cuando un gate se_training a ignorar.
- **`zeroRisk` implementado en TASK-UI-315** (no en TASK-UI-313): gap de spec detectado al auditar el DoD; corregido en la tarea de test y anotado.
- La columna **Estado de `_docs/backlog.md`** sigue en `📥` para las 20 tareas + 2 SCR; no se ha mantenido durante el ciclo. `status.md` es la fuente de verdad; la desincronización está pendiente de decidir.

### 🟢 Informativas

- **Job `frontend` de CI desbloqueado por `TECH-304`** (`8c71dcb`): `prettier --write` sobre los 10 ficheros + `tokens.test.ts` realineado a comillas simples. Lint en verde.
- **Segundo fallo, no de estilo: `minMove` dependiente del runtime** (`f4f3c4e`). `10 ** -priceDecimals` redondea distinto según V8: en Node 20 da `0.000009999999999999999` (1 ULP bajo) y en Node 24 `0.00001`. El mismo código producía un valor distinto según dónde corriera, y el test de `ChartPane` (RF-206/RF-207) solo pasaba en local. Corregido en `axis-format.ts` con `1 / 10 ** n`, exacta en todos los runtimes; **el test no se relajó**, porque el valor correcto es el mismo en cualquier entorno. 458/458 en Node 20 y Node 24. Se añade `.nvmrc` (20) y `engines: >=20` para alinear desarrollo y CI.
- **Verificado contra CI real:** run #31 en `success`, `Frontend` y `Backend` en verde. Es la **primera vez** que el job `frontend` pasa completo (lint + tests) en el repositorio.
- `TECH-301` completada: `README.md` declara **458 tests frontend (55 archivos)**, verificado con `vitest` (backend 546 + 2 skip). Se cierra la deriva documental 389/392/393 (DP-6) y el **gap 2** diferido al cierre del ciclo 03.
- `README.md` actualizado con el ciclo 04: sección propia, iteración 04 en la tabla, ADRs `ADR-001…025` y herramienta `◎` en SCR-004/005.
- **Ciclo 04 cerrado: 20/20 tareas · 56/56 pts · 19/19 requisitos · ruta crítica 7/7.**
- `TECH-302` (`drawLine` en 3.16:1) y `TECH-303` (entrada numérica para ruta por teclado) quedan diferidas a ciclo 05 (`Should`); no bloquean este cierre.

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
| RX-301 | 1 | 1 | 100% |

**Requisitos sin tareas:** ninguno ✅ · **Requisitos 100% Done:** 19/19 ✅ (ciclo funcional completo)

## 8. Próximas acciones sugeridas

1. `/sdd-backlog` para el ciclo 05: recoger `TECH-302` (contraste de `drawLine` en 3.16:1) y `TECH-303` (entrada numérica de Entrada/SL).
3. Archivar el ciclo 04 (`_docs/iterations/04-referencia-operacion/`) con su `_cierre.md`, como se hizo con el 03.

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
| 2026-10-01 | TASK-TEC-303 | 📥 → 🔨 | Verificación de RX-301 contra el arranque de ciclo `0422923` |
| 2026-10-01 | TASK-TEC-303 | 🔨 → 👀 | Movida a revisión; diff de manifiesto, lockfile y backend vacío |
| 2026-10-01 | TASK-TEC-303 | 👀 → ✅ Done | DoD verificada (sin deps nuevas, backend intacto); RX-301 100% (19/19); ruta crítica 7/7; autorización del usuario |
| 2026-10-02 | TECH-301 | 📥 → 🔨 | Actualización completa del README con el ciclo 04 (y cierre del gap 2/DP-6) |
| 2026-10-02 | TECH-301 | 🔨 → 👀 | Movida a revisión; `vitest` re-ejecutado: 55 archivos / 458 tests |
| 2026-10-02 | TECH-301 | 👀 → ✅ Done | DoD verificada (README = salida real de vitest); 20/20 tareas · 56/56 pts; autorización del usuario |
| 2026-10-02 | — | 🔴 Alerta | CI `frontend` en rojo: `format:check` falla en 10 ficheros; 1 regresión del ciclo (`tokens.css`) + 9 deuda preexistente |
| 2026-10-02 | — | ⚠️ Corrección | Atribución errónea: `tokens.css` NO es regresión del ciclo 04; los 10 fallos de `format:check` ya existían en `0422923` (se rompieron en el ciclo 03, `cb0a6bd`). Verificado con el `.prettierrc` del repo |
| 2026-10-02 | TECH-304 | 📥 → 🔨 | Sanear `format:check` para desbloquear el job `frontend` de CI (10 ficheros) |
| 2026-10-02 | TECH-304 | 🔨 → 👀 | `make lint-frontend` EXIT=0 · eslint/tsc OK · 458 tests · diff sin lógica (hash normalizado) |
| 2026-10-02 | TECH-304 | 👀 → ✅ Done | DoD 5/5 · CI run #31 `success` (Frontend+Backend) · segunda desviación revelada y corregida en `f4f3c4e` |
| 2026-10-02 | — | 🔴 Alerta | Run #28 en rojo: lint verde (TECH-304 ok) pero 1 test fallaba. Fallo preexistente **enmascarado** por el lint, nunca ejecutado en CI |
| 2026-10-02 | — | 🔴 Hallazgo | `minMove` (`10 ** -n`) dependía de la versión de V8: Node 20 → `0.000009999999999999999`, Node 24 → `0.00001`. Corregido con `1 / 10 ** n` (`f4f3c4e`) |
| 2026-10-02 | — | ⚠️ Advertencia | `.nvmrc` (20) + `engines: >=20`: local Node 24 vs CI Node 20 permitían divergencias de coma flotante sin aviso |

## 10. Ciclo 05 (abierto)

> El ciclo 04 queda cerrado e inmutable en 20/20 tareas · 56/56 pts. Este bloque
> registra el trabajo posterior, para no reabrir el tablero del ciclo 04.

| ID | Tarea | Capa | Est. | Estado | Deps | Prueba |
|----|-------|------|------|--------|------|--------|
| TECH-304 | Sanear `format:check` y realinear el test anti-drift | frontend + test | 1 | ✅ Done | — | `8c71dcb` + `f4f3c4e` · CI run #31 `success` · 458/458 en Node 20 y 24 |
| TECH-302 | Contraste de `drawLine` (`#4A6572`, 3.16:1 < 4.5:1) | frontend | — | 📥 Backlog | — | Pendiente (`backlog.md` §8) |
| TECH-303 | Entrada numérica de Entrada/SL para precio exacto al pip | frontend | — | 📥 Backlog | — | Pendiente (`backlog.md` §8) |

**Estado del ciclo 05:** 1 tarea ✅ Done · 2 diferidas del backlog §8. Sin tareas
en curso: el ciclo quedó sin trabajo activo tras `TECH-304`. Sin
épicas, historias ni requisitos nuevos todavía: `TECH-304` no cubre ningún
requisito y `TECH-302`/`TECH-303` siguen sin RF que los pida (`ux/user-journeys.md`
§Brechas). Si el ciclo 05 crece, `/sdd-backlog` debe abrirlo formalmente con
épicas y trazabilidad.
