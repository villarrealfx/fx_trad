# Estado del Proyecto: fxtrad

> Última actualización: 2026-10-06
> Ciclo actual: **05** — `mejoras-ux-grafico`
> Fuente: `_docs/backlog.md`, `_docs/traceability.md`

## 1. Resumen ejecutivo

| Métrica | Valor | Δ vs estado anterior |
|---------|-------|----------------------|
| Tareas totales | **26** | +24 |
| 📥 Backlog | **19** | +17 |
| 🔨 Doing | 0 | 0 |
| 👀 Review | 0 | 0 |
| ✅ Done | **7** | +7 |
| 🔴 Blocked | 0 | 0 |
| % Completado | **27 %** | — |
| Esfuerzo planificado | **76 pts** | — |
| Ruta crítica | **5/7 · 24 pts** | — |
| Historias aceptadas | **0/9** | — |
| Días sin movimiento | 0 | — |

**Estado general:** 🟢 **Ciclo 05 en ejecución.** 7/26 tareas cerradas; la ruta crítica avanza **5/7**
(`TASK-401`, `TASK-402`, `TASK-UI-403`, `TASK-UI-404`, `TASK-UI-405` ✅). `EP-UI-401` (cambio de
escala) queda **cerrada**.

El ciclo 04 quedó **cerrado y archivado** en `_docs/iterations/04-dibujo-referencia-operacion/`
(20/20 tareas · 56/56 pts · 19/19 requisitos propios 🟢 · CI en verde).

## 2. Tablero Kanban

### 📥 Backlog (19)

| ID | Tarea | Épica | Prioridad | Est. | Deps |
|----|-------|-------|-----------|------|------|
| TASK-403 | Tests de migración y de contrato v2 | EP-401 | **Must** | 3 | TASK-402 |
| TASK-405 | Tests de precedencia y de ida y vuelta | EP-402 | **Must** | 2 | TASK-404 |
| TASK-UI-400 | Tokens: `color-draw-line` `#7D8590` + `AXIS_TOKENS` en dos filas | EP-UI-400 | Should | 2 | — |
| TASK-UI-401 | Tests de contraste y de formato del eje | EP-UI-400 | Should | 2 | TASK-UI-400 |
| TASK-UI-406 | Render del eje X en dos filas | EP-UI-402 | Should | 3 | TASK-UI-400 |
| TASK-UI-407 | Tests del eje | EP-UI-402 | Should | 2 | TASK-UI-406 |
| TASK-UI-408 | `CMP-024 CandleContextMenu` | EP-UI-403 | Should | 5 | — |
| TASK-UI-409 | Tests y accesibilidad del menú contextual | EP-UI-403 | Should | 3 | TASK-UI-408 |
| TASK-UI-410 | `CMP-025 OperationNumericFields` | EP-UI-404 | Should | 5 | TASK-401 |
| TASK-UI-411 | Integración con command stack y `LiveRegion` | EP-UI-404 | Should | 3 | TASK-UI-410 |
| TASK-UI-412 | Tests del popover numérico | EP-UI-404 | Should | 3 | TASK-UI-411 |
| TASK-UI-413 | Diagnóstico y corrección de la condición de cobertura | EP-UI-405 | **Must** | 2 | — |
| TASK-UI-414 | Tests de borde de la cobertura | EP-UI-405 | **Must** | 2 | TASK-UI-413 |
| TASK-UI-415 | Retirada de Multigráfico (ruta, pantalla, `chart-sync`, props `sync`) | EP-UI-406 | Should | 3 | — |
| TASK-UI-416 | Limpieza de tests de la retirada | EP-UI-406 | Should | 2 | TASK-UI-415 |
| TASK-UI-417 | Evaluación de `Exportar` con decisión documentada | EP-UI-406 | Could | 2 | — |
| TASK-TEC-401 | Suite completa + medición del cambio de TF + gate de calidad | EP-TEC-400 | **Must** | 3 | TASK-UI-405, TASK-UI-412, TASK-UI-414, TASK-UI-416 |
| TASK-TEC-402 | Accesibilidad (axe + teclado) de los componentes nuevos | EP-TEC-400 | **Must** | 2 | TASK-UI-409, TASK-UI-412 |
| TASK-TEC-403 | Verificación de «sin dependencias nuevas» | EP-TEC-400 | **Must** | 1 | TASK-TEC-401 |

### 🔨 Doing (0)

Ninguna.

### 👀 Review (0)

Ninguna.

### ✅ Done (7)

| ID | Tarea | Épica | Est. | Cerrada | Prueba |
|----|-------|-------|------|---------|--------|
| TASK-401 | Contrato único del documento v2 por activo (clave sin TF, `selection`, `charting/` cede el contrato) | EP-401 | 5 | 2026-10-06 | `state/__tests__/chart-config.test.ts` (17) + `state/__tests__/use-chart-config.test.tsx` (8) + `charting/__tests__/drawings.test.ts` (7) |
| TASK-402 | Migración v1→v2 pura y aditiva (unión deduplicada por `id`, indicadores del TF preferido, sin borrar v1) | EP-401 | 5 | 2026-10-06 | `state/__tests__/migrate-chart-config.test.ts` (12) + `state/__tests__/chart-config.test.ts` (22, incluye el cableado en `load`) |
| TASK-UI-402 | `CMP-023 TimeframeSelector` (radiogroup, roving tabindex, flechas y `Home`/`End`, `disabled`) | EP-UI-401 | 3 | 2026-10-06 | `components/TimeframeSelector/__tests__/TimeframeSelector.test.tsx` (8) |
| TASK-404 | Resolución de la selección (URL > persistido > defecto) + puntero `fxtrad.chart.last` (ADR-030) | EP-402 | 3 | 2026-10-06 | `app/__tests__/routes.test.ts` (12) + `state/__tests__/chart-config.test.ts` (26) + `__tests__/app.test.tsx` (7, ida y vuelta) |
| TASK-UI-403 | Selector en `ChartHeader` + estados `switching-tf`/`tf-ready`/`tf-error` con reversión por error | EP-UI-401 | 5 | 2026-10-06 | `components/ChartHeader/__tests__` (8) + `components/ChartPane/__tests__` (60, +2 de `onStatusChange`) + `__tests__/app.test.tsx` (9, cambio de TF, anuncio y reversión) |
| TASK-UI-404 | Indicadores del activo recalculados por TF — **cerrada sin código: ya cubierta** | EP-UI-401 | — | 2026-10-06 | Evidencia en `traceability.md` RF-405: `ChartPane.tsx:500` (deps `[status, indicators]`) + remonte por `key` en `App.tsx`. Prueba explícita en `TASK-UI-405` (DP-7) |
| TASK-UI-405 | Tests de la épica de escala (indicadores recalculados, serie corta, ida y vuelta, frame budget) | EP-UI-401 | 5 | 2026-10-06 | `ChartPane.test.tsx` (+3: recálculo con las velas del TF nuevo, sin `NaN` y frame budget) + `ChartHeader.test.tsx` (+1: `aria-checked` sigue al TF) + `app.test.tsx` (+1: ida y vuelta conserva dibujos e indicadores) |

### 🔴 Blocked (0)

Ninguna.

## 3. Ruta crítica

```mermaid
graph LR
  T401["TASK-401<br/>✅ 5"] --> T402["TASK-402<br/>✅ 5"]
  T402 --> UI403["TASK-UI-403<br/>✅ 5"]
  UI403 --> UI404["TASK-UI-404<br/>✅ 2"]
  UI404 --> UI405["TASK-UI-405<br/>✅ 5"]
  UI405 --> TEC401["TASK-TEC-401<br/>📥 3"]
  TEC401 --> TEC403["TASK-TEC-403<br/>📥 1"]
```

**Avance de ruta crítica:** **5/7 · 24 pts.** El tramo que domina el ciclo es
`TASK-401 → TASK-402 → TASK-UI-403` (tres tareas de 5 puntos encadenadas: contrato v2, migración e
integración del cambio de escala).

**Pueden empezar en paralelo** (sin dependencias): `TASK-UI-400`, `TASK-UI-408`,
`TASK-UI-413`, `TASK-UI-415` y `TASK-UI-417`.

## 4. Métricas

### 4.1 Velocidad

| Ciclo | Completadas | Esfuerzo |
|-------|-------------|----------|
| 03 — Mejoras UX | 35 | 121 pts |
| 04 — Dibujo Referencia de Operación | 20 | 56 pts |
| **05 — planificado** | **0/26** | **76 pts** |

### 4.2 Burn-down

No aplica: el ciclo no ha empezado (0 tareas en 🔨).

### 4.3 Lead time / cycle time

No medidos. Se registrarán con el primer cierre de tarea del ciclo.

## 5. Bloqueos activos

Ninguno.

## 6. Alertas

### 🔴 Críticas

Ninguna.

### 🟡 Advertencias

- **El ciclo planifica 76 pts frente a los 56 del ciclo 04.** Si el plazo de 2 semanas (RNF-007)
  aprieta, el orden de recorte lo fija `DP-3`: primero `RF-411` (Could, `TASK-UI-417`) y después los
  Should de UI pura (eje, menú contextual, precios numéricos, retirada).
- **Deuda fuera del ciclo 05** (`D-8`): `TECH-305` (motivos de waiver imprecisos), `TECH-306`
  (límites de tamaño: 8 funciones >50 líneas, `ChartPane.tsx` 874) y `TECH-307` (contrato de
  logging autocontradictorio). Provienen de la auditoría `CR-002`, en CHANGES_REQUESTED.
- **Preguntas abiertas que condicionan tareas**: `PA-1` (¿el aviso de cobertura es falso positivo?
  se resuelve **dentro** de `TASK-UI-413`) · `PA-2` (¿desaparece el dolor de Multigráfico al
  arreglar `RF-401`? comprobar **antes** de `TASK-UI-415`) · `PA-3` (criterio de viabilidad de
  `Exportar`, `TASK-UI-417`) · `PA-4` (quién verifica los 12 frentes del insumo y con qué guion).
- **2 commits locales sin empujar** (`e67ba78`, `cde739f`): el push es manual por política
  (`_docs/git-profile.toml`); el remoto está declarado.

### 🟢 Informativas

- **Pipeline de planificación completo**: `plan.md`, `requirements.md` (19 requisitos `4xx`),
  `glossary.md`, `architecture.md` + ADR-027/028/029, 9 contratos de `ux/` y el backlog con 10
  épicas y 26 tareas.
- **Gate de calidad en verde**: `quality_gate.py --level gate` = **PASS** (0 incumplidos, 25
  marcas waived, 0 `not_measured`) con `_docs/quality-profile.toml`.
- **Deuda promovida**: `TECH-302` pasa a `RNF-405` (la cubren `TASK-UI-400/401`) y `TECH-303` pasa
  a `RF-410` (la cubren `TASK-UI-410/411/412`): dejan de ser deuda sin requisito.
- **`TASK-UI-000…003`** (design system, componentes base, layout/routing, accesibilidad base) siguen
  **✅ Done desde el ciclo 01**: el ciclo 05 no las repite.

## 7. Salud de trazabilidad

| Grupo | Requisitos | Con tarea | Sin tarea |
|-------|-----------|-----------|-----------|
| RF (funcionales) | 11 | 11 | 0 |
| RNF (no funcionales) | 5 | 5 | 0 |
| RI (información) | 2 | 2 | 0 |
| RX (integración) | 1 | 1 | 0 |
| **Total del ciclo 05** | **19** | **19** | **0** ✅ |

**Requisitos sin tareas:** ninguno. **Cobertura UX:** 3/3 pantallas afectadas (SCR-004 modificada,
SCR-005 retirada, SCR-006 en evaluación); SCR-001/002/003 heredadas sin cambios.
**Historias sin aceptación:** 9/9 pendientes (exigen QA `PASS` y `/sdd-track accept`).

## 8. Próximas acciones sugeridas

1. **`/sdd-cycle`** para tomar **`TASK-TEC-401`** (nodo **6 de 7** de la ruta crítica): suite completa,
   medición del cambio de TF registrada y gate de calidad pegado en el AUDIT LOG. Ojo: sus `Deps`
   incluyen `TASK-UI-412`, `TASK-UI-414` y `TASK-UI-416`, que siguen en 📥 → la FASE 5 trabajará
   antes en esas dependencias.
2. **Antes de `TASK-UI-415`**, resolver `PA-2`: si el dolor de Multigráfico lo causaba el bug de
   selección (`RF-401`), reconsiderar la retirada.
3. **Antes de `TASK-UI-413`**, cerrar el diagnóstico de `PA-1` (bucket del TF vs hueco de mercado).
4. **`git push origin master`** cuando se quiera publicar los 2 commits locales (manual).

## 9. Historial de cambios (append-only)

| Fecha | Tarea | Transición | Motivo |
|-------|-------|-----------|--------|
| 2026-10-02 | — | 📦 Archivo | Ciclo 04 archivado en `iterations/04-dibujo-referencia-operacion/` (20/20 · 56/56 · 19/19 · CI #31 en verde) |
| 2026-10-02 | — | 🆕 Ciclo 05 | Raíz re-sembrada: backlog/status/traceability nuevos con la deuda heredada (TECH-302, TECH-303) |
| 2026-10-06 | — | 🆕 Tablero | Inicialización del ciclo 05: 26 tareas en 📥 (76 pts · ruta crítica 7/24 · 10 épicas · 9 historias) |
| 2026-10-06 | TASK-401 | 📥 → 🔨 | Inicio de desarrollo (contrato único del documento v2, ADR-027) |
| 2026-10-06 | TASK-401 | 🔨 → 👀 | Tests verdes: 455/455 frontend (32 de los archivos tocados) · typecheck, eslint y prettier en verde · `quality_gate --level gate` PASS |
| 2026-10-06 | TASK-401 | 👀 → ✅ | DoD verificada: `CHART_CONFIG_VERSION = 2`, clave por activo sin TF, `deserializeChartConfig` → null ante versión desconocida, `charting/` sin dependencia de `indicators/`; prueba en `traceability.md` |
| 2026-10-06 | TASK-402 | 📥 → 🔨 | Inicio de desarrollo (migración v1→v2 aditiva, ADR-027) |
| 2026-10-06 | TASK-402 | 🔨 → 👀 | Tests verdes: 472/472 frontend (42 en `state/`) · typecheck, eslint y prettier en verde · `quality_gate --level gate` PASS |
| 2026-10-06 | TASK-402 | 👀 → ✅ | DoD verificada: módulo puro con `Storage` inyectable, dedupe por `id`, idempotente (el v2 manda), ninguna clave v1 borrada; prueba en `traceability.md` |
| 2026-10-06 | TASK-UI-402 | 📥 → 🔨 | Inicio de desarrollo (CMP-023 TimeframeSelector, RF-406) |
| 2026-10-06 | TASK-UI-402 | 🔨 → 👀 | Tests verdes: 480/480 frontend (8 del componente) · typecheck, eslint y prettier en verde · `quality_gate --level gate` PASS |
| 2026-10-06 | TASK-UI-402 | 👀 → ✅ | DoD verificada: `radiogroup` con `aria-label="Timeframe"`, `aria-checked` y roving tabindex, flechas y `Home`/`End` sin vuelta, `disabled` bloquea clic y teclado; prueba en `traceability.md`. Se corrige en el contrato UX la cita de WCAG 2.5.5 (AAA, 44×44) por 2.5.8 (AA, ≥24×24) |
| 2026-10-06 | TASK-404 | 📥 → 🔨 | Inicio de desarrollo (resolución de la selección + puntero `fxtrad.chart.last`, ADR-030) |
| 2026-10-06 | TASK-404 | 🔨 → 👀 | Tests verdes: 490/490 frontend · typecheck, eslint y prettier en verde · `quality_gate --level gate` PASS |
| 2026-10-06 | TASK-404 | 👀 → ✅ | DoD verificada: precedencia URL > persistido > defecto, un query explícito nunca se pisa, URL enriquecida con `replaceState` (sin historial) y puntero validado al leer; prueba en `traceability.md`. Nuevo ADR-030 |
| 2026-10-06 | TASK-UI-403 | 📥 → 🔨 | Inicio de desarrollo (selector en `ChartHeader` + estados de cambio de escala, RF-403/405/406) |
| 2026-10-06 | TASK-UI-403 | 🔨 → 👀 | Tests verdes: 497/497 frontend · typecheck, eslint y prettier en verde · `quality_gate --level gate` PASS |
| 2026-10-06 | TASK-UI-403 | 👀 → ✅ | DoD verificada: selector a la izquierda de Indicadores, estados `switching-tf`/`tf-ready`/`tf-error` con **reversión al TF anterior**, anuncio en `LiveRegion` y selección persistida; prueba en `traceability.md` |
| 2026-10-06 | TASK-UI-404 | 📥 → 🔨 | Verificación de cobertura de RF-405 **antes** de escribir código (regla: no inventar trabajo) |
| 2026-10-06 | TASK-UI-404 | 🔨 → 👀 | Verificado: RF-405 ya se cumple — `ChartPane.tsx:500` recalcula con las velas cargadas y `App.tsx` remonta el panel por `key` al cambiar de TF |
| 2026-10-06 | TASK-UI-404 | 👀 → ✅ | Cerrada **sin código** como ya cubierta por TASK-401/TASK-UI-403 (DP-7); evidencia en `traceability.md` y 2 pts traspasados a TASK-UI-405 (3 → 5) |
| 2026-10-06 | TASK-UI-405 | 📥 → 🔨 | Inicio de desarrollo (tests de aceptación de la épica de escala, solo capa `test`) |
| 2026-10-06 | TASK-UI-405 | 🔨 → 👀 | Tests verdes: 502/502 frontend (+5 casos nuevos) · typecheck, eslint y prettier en verde · `quality_gate --level gate` PASS |
| 2026-10-06 | TASK-UI-405 | 👀 → ✅ | DoD verificada: indicadores recalculados con las velas del TF nuevo, sin `NaN` con serie corta, ida y vuelta conserva dibujos e indicadores, `aria-checked` sigue al TF y frame budget intacto; prueba en `traceability.md`. `EP-UI-401` cerrada |
