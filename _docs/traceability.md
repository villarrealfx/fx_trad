# Trazabilidad: fxtrad — Ciclo 05 (Mejoras UX del Gráfico y Cierre de Deuda)

> Última actualización: 2026-10-07
> Ciclo actual: **05** — `mejoras-ux-grafico` (en ejecución: 16/26 tareas · ruta crítica 7/7)
> **Leyenda:** 🟡 pendiente · 🔵 en progreso (diseño y tareas asignadas) · 🟢 completo · 🔴 bloqueado

## 1. Estado de la trazabilidad

Los **19 requisitos** del ciclo tienen **Diseño** (módulo/ADR) y **Tarea** asignados, y están en
**🔵**. La columna **Prueba** la rellena `/sdd-cycle` al cerrar cada tarea (un ✅ exige prueba
registrada). No hay ningún requisito sin tarea.

El histórico vivo de los ciclos 01–04 (35 requisitos, con su prueba y su commit) vive en
`_docs/iterations/04-dibujo-referencia-operacion/traceability.md` y en las carpetas anteriores.

## 2. Requisitos funcionales

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RF-401 Conservar la última selección al volver a `Gráfico` | `App.tsx` + `app/routes.ts` (`parseChartQuery` con fallback) + `state/chart-config` (`selection` y puntero `fxtrad.chart.last`) (ADR-028/ADR-030) | TASK-404, TASK-405, TASK-UI-403 | TASK-404 ✅: `app/__tests__/routes.test.ts` (precedencia URL > fallback > defecto; un query explícito no se pisa) + `__tests__/app.test.tsx` (ida y vuelta a `/chart` sin query, URL enriquecida) — pendiente TASK-405 | 🔵 |
| RF-402 Aviso de cobertura solo cuando es real | `charting/coverage` (`hasCoverageGap`) + `components/ChartPane` (condición de `partialCoverage`) | TASK-UI-413, TASK-UI-414 | TASK-UI-413 ✅ (**reapertura** 2026-10-06): `charting/coverage` exime el hueco contenido en la ventana semanal `[viernes 19:00, lunes 00:00)` UTC; `charting/__tests__/coverage.test.ts` (17, +4 de la reapertura: solo viernes, solo domingo, semana `Lun→Vie` y hueco real en la mañana del viernes). Defecto original: con `data/EURUSD.1h.parquet` la condición previa avisaba en **103/103** `Lun→Vie`, **103/103** viernes y **79/79** domingos (188/594). **Límite conocido:** los festivos en día laborable siguen avisando (6/594 residuales). `ChartPane.test.tsx` mantiene el aviso con hueco interno y el silencio con borde desfasado · TASK-UI-414 ✅ (**reapertura** 2026-10-06): `ChartPane.test.tsx` (6 de borde en pantalla, +3 de la reapertura: solo viernes, solo domingo y semana `Lun→Vie`, todos **sin** aviso) | 🟢 |
| RF-403 Cambio de timeframe desde el gráfico | `components/ChartHeader` (CMP-023) + `App.tsx` (`pendingTimeframe`, estados y reversión) (ADR-028) | TASK-UI-403 | TASK-UI-403 ✅: `app/__tests__/app.test.tsx` (cambio de TF navega y persiste; `tf-error` revierte al anterior sin anunciar) + `components/ChartHeader/__tests__` | 🟢 |
| RF-404 Dibujos compartidos por activo entre timeframes | `charting/drawings` (anclas `PriceTimePoint`) + `state/chart-config` v2 (ADR-027) | TASK-402, TASK-UI-403 | — | 🔵 |
| RF-405 Indicadores del activo recalculados por timeframe | `state/chart-config` v2 (una lista por activo) + `ChartPane` (recálculo sobre las velas cargadas) (ADR-027) | TASK-UI-404, TASK-UI-405 | TASK-UI-405 ✅: `ChartPane.test.tsx` «recalcula los indicadores con las velas del TF nuevo» (la última marca temporal del MA pasa a la del TF nuevo) y «no emite NaN cuando la serie es más corta que el periodo» + `app.test.tsx` (ida y vuelta conserva los indicadores del activo). TASK-UI-404 se cerró **sin código** por estar ya cubierta (DP-7) | 🟢 |
| RF-406 Selector de timeframe junto a Indicadores | `components/TimeframeSelector` (CMP-023) + `ChartHeader` (integración) | TASK-UI-402, TASK-UI-403 | TASK-UI-402 ✅: `components/TimeframeSelector/__tests__/TimeframeSelector.test.tsx` (8) · TASK-UI-403 ✅: `components/ChartHeader/__tests__/ChartHeader.test.tsx` (aloja el selector, emite y se deshabilita) | 🟢 |
| RF-407 Eje X en dos filas (fecha / hora) | `charting/axis-format` + `AXIS_TOKENS` + `components/ChartPane` | TASK-UI-400, TASK-UI-406, TASK-UI-407 | — | 🔵 |
| RF-408 Clic derecho sobre la vela → OHLC | `components/CandleContextMenu` (CMP-024) | TASK-UI-408, TASK-UI-409 | — | 🔵 |
| RF-409 Retirada de la pantalla Multigráfico | `app/routes.ts` + `App.tsx` + borrado de `components/MultiChart` y `charting/chart-sync` (ADR-029) | TASK-UI-415, TASK-UI-416 | TASK-UI-415 ✅: `__tests__/app.test.tsx` (la navegación ya no expone el enlace «Multigráfico») + verificación `grep` con **0** referencias a `/multichart`, `SCR-005` y `chart-sync` en `src/` (excluida la aserción negativa del test); `chart-sync.test.ts` y `MultiChart.test.tsx` eliminados con su código · TASK-UI-416 ✅: `app/__tests__/routes.test.ts` (+2 de guardia: `ROUTES` sin `/multichart` ni `SCR-005` y `routeFor('/multichart')` → `/chart`); 6 mocks de sincronización huérfanos retirados del arnés; 548/548 en 58 archivos, sin `skip` ni directorios vacíos | 🟢 |
| RF-410 Entrada numérica de Entrada/SL | `components/OperationNumericFields` (CMP-025) + command stack + `operation-geometry` (ADR-022 del ciclo 04) | TASK-UI-410, TASK-UI-411, TASK-UI-412 | TASK-UI-410 ✅: `components/OperationNumericFields/__tests__/OperationNumericFields.test.tsx` (14: `dialog` con label visible, `inputMode` decimal, foco inicial, error inline `role="alert"` por campo, `Aplicar` deshabilitado con valor no numérico y con `Entrada == SL`, `Enter` aplica redondeado a 5 decimales, `Escape`/`Cancelar` devuelven el foco, trampa de foco y anclaje) + `charting/__tests__/operation-price-input.test.ts` (12: parseo con separador local, redondeo y validación) · TASK-UI-411 ✅: `components/ChartPane/ChartPane.test.tsx` (7: botón «Precios» anclado solo con la operación seleccionada, popover con los precios de la figura, `Aplicar` muta por el command stack, `Ctrl+Z`/`Ctrl+Y`, anuncio con los 5 valores, `Escape` devuelve el foco al gráfico) + `drawing-history.test.ts` (command stack) · TASK-UI-412 ✅: `ChartPane.test.tsx` (+5 de aceptación: `Enter` aplica y anuncia los 5 valores, `Escape` cancela sin mutar, valor no numérico bloquea `Aplicar` y asocia el error al campo, `Ctrl+Z` restaura la figura exactamente, orden de foco Entrada→SL) | 🟢 |
| RF-411 Evaluación de `Exportar` con decisión documentada | `components/ExportModal` (evaluación; decisión en el cierre) | TASK-UI-417 | — | 🔵 |

## 3. Requisitos no funcionales

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RNF-401 Sin pérdida de dibujos en la migración v1→v2 | `state/migrate-chart-config` (puro) + claves v1 intactas (ADR-027) | TASK-401, TASK-402, TASK-403 | TASK-401 ✅: `state/__tests__/chart-config.test.ts` · TASK-402 ✅: `state/__tests__/migrate-chart-config.test.ts` (dedupe por `id`, «solo lee: no escribe ni borra», v1 corrupto ignorado) + `chart-config.test.ts` (no borra ninguna clave v1 al migrar) — pendiente la evidencia de aceptación de TASK-403 | 🔵 |
| RNF-402 0 regresiones en las suites existentes | CI GitHub Actions + `make ci` (ADR-008) | TASK-TEC-401 | TASK-TEC-401 ✅: **backend 546/546 + 2 skip** (`backend/.venv/bin/python -m pytest`) y **frontend 549/549 en 58 archivos** (`npm test`), ambos en verde; `quality_gate.py --level gate` = PASS. Equivale a `make ci` con el venv local | 🟢 |
| RNF-403 60 FPS con la figura activa | `charting/overlay-geometry` + frame batch (ADR-017) | TASK-UI-405, TASK-TEC-402 | TASK-UI-405 ✅: `ChartPane.test.tsx` «cambia de escala con la operación activa dentro del frame budget» (0 frames caídos, `FrameRateMeter` con planificador manual) — pendiente la verificación de accesibilidad de TASK-TEC-402 | 🔵 |
| RNF-404 El cambio de TF se mide y se registra | Medición registrada en el AUDIT LOG del cierre | TASK-TEC-401 | TASK-TEC-401 ✅ (medición) / ⚠️ (comparación): `ChartPane.test.tsx` «mide cada cambio en caliente frente a la carga inicial de su TF» escribe `coverage/tf-switch-measurement.json`; valores registrados en el AUDIT LOG. **La comparación estricta («no supera la carga inicial») no es medible de forma fiable en jsdom** (0/3 en la corrida final, ruido del entorno *client-side*); `D-5` elimina el umbral bloqueante. Queda como verificación pendiente en navegador real | 🔵 |
| RNF-405 Contraste ≥4.5:1 de la línea de eje `drawLine` | `styles/tokens.ts` + `styles/tokens.css` (patrón ADR-024) | TASK-UI-400, TASK-UI-401 | — | 🔵 |

## 4. Requisitos de información

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RI-401 Documento v2 por activo con migración aditiva desde v1 | `state/chart-config` v2 (`DrawingDocument` reutilizado) + `state/migrate-chart-config` (ADR-027) | TASK-401, TASK-402, TASK-403 | TASK-401 ✅: `state/__tests__/chart-config.test.ts` (17: round-trip v2, clave sin TF) + `state/__tests__/use-chart-config.test.tsx` (8) · TASK-402 ✅: `state/__tests__/migrate-chart-config.test.ts` (12: unión multi-TF, indicadores del TF preferido, idempotencia por prioridad del v2) — pendiente la evidencia de aceptación de TASK-403 | 🔵 |
| RI-402 La última selección es estado persistido y recuperable | `state/chart-config` (`selection` por activo + puntero `fxtrad.chart.last`) + `app/routes.ts` (precedencia) (ADR-028/ADR-030) | TASK-404, TASK-405 | TASK-404 ✅: `state/__tests__/chart-config.test.ts` (round-trip del puntero, validación al leer, no-op sin almacenamiento) + `app/__tests__/routes.test.ts` — pendiente TASK-405 | 🔵 |

## 5. Requisitos de integración

| Requisito | Diseño (ADR/Componente) | Tarea | Prueba | Estado |
|-----------|-------------------------|-------|--------|--------|
| RX-401 Sin dependencias nuevas | Verificación de `package.json`, `package-lock.json` y `backend/` (RX-301 del ciclo 04) | TASK-TEC-403 | TASK-TEC-403 ✅: `git diff --exit-code e67ba78..HEAD -- frontend/package.json frontend/package-lock.json backend/` → **exit 0 y 0 archivos** (diff vacío); ninguna dependencia nueva en todo el ciclo | 🟢 |

## 6. Modificaciones a requisitos previos

| Requisito previo | Modificado por | Nota |
|------------------|----------------|------|
| `RF-310` (04) | RF-409 | La Operación queda disponible solo en `Gráfico`; Multigráfico se retira (ADR-029) |
| `RI-201` (03) | RI-401 | La configuración pasa a documento v2 por activo; los dibujos dejan de ser por activo+TF (ADR-027) |
| `RNF-304` (04) | RNF-401 | La garantía de no perder dibujos se extiende a la migración de esquema |
| `RNF-204` (03) / `RNF-305` (04) | RNF-405 | El contraste se exige también a la línea de eje (cierra `TECH-302`) |
| `ADR-023` (04) | RI-401 | El cambio de alcance exige v2 con migración; lo formaliza ADR-027 |
| `TECH-303` (deuda) | RF-410 | Deja de ser deuda sin requisito: se promueve a requisito con tareas |

## 7. Requisitos heredados

Los ciclos 01–04 aportan 35 requisitos (los `0xx`–`3xx`), ya cerrados y archivados en
`_docs/iterations/`. **No se re-verifican** en cada ciclo; su evidencia histórica vive en la
carpeta de su iteración. Este ciclo solo los toca en los seis casos de §6.
