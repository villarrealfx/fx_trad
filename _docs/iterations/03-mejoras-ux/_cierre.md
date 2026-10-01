# Cierre de Ciclo: 03 — Mejoras UX

> Snapshot de cierre del ciclo 3 del pipeline SDD.
> Inicio: 2026-09-29 (`/sdd-brainstorm`) · Cierre: 2026-09-29
> Estado final: **35/35 tareas ✅ (100%)** · 29/29 requisitos propios 🟢 · 0 bloqueos
> Insumo: `spec-insumo.md` (= `UI_improvement.md`) · Contexto: `_contexto-heredado.md`

## Resumen del ciclo

Con la descarga ya resuelta (ciclo 02), el cuello de botella era la **experiencia de
análisis**: el usuario perdía la configuración del gráfico, tenía ruido de indicadores,
ejes imprecisos y dibujos que no se podían corregir. Este ciclo trabaja casi por completo
la **capa de presentación** (sin tocar el pipeline de datos): elimina el ruido de indicadores,
persiste la configuración en el navegador, amplía el área y la precisión del chart, hace
los dibujos editables con undo/redo, centra Descarga y Abrir, amplía el catálogo a 12
activos con 5 pares forex nuevos y salda la deuda del timeframe `1s`.
Un solo desarrollador, una sesión de trabajo, 121 puntos estimados, stack 100 % OSS ($0).

| Dimensión | Valor al cierre |
|-----------|-----------------|
| Tareas | 35 (121 puntos) |
| 📥 / 🔨 / 👀 / 🔴 | 0 / 0 / 0 / 0 |
| ✅ Done | 35 (100%) |
| Requisitos IN | 29/29 🟢 (20 RF · 5 RNF · 2 RI · 2 RX) |
| Épicas | 2 dominio (EP-201, EP-202) · 9 UI (EP-UI-200…208) · 1 técnica (TEC-201) |
| Historias | 11 |
| Capas | backend 4 · frontend 24 · test 6 · docs 1 |
| Ruta crítica | 5/5 completada (100%) |
| ADRs | 5 (ADR-017…021) |
| Pantallas UX | 6/6 cubiertas |
| Tests | backend 546 ✅ + 2 skip · frontend 393 ✅ (verificado al cierre) |
| Duplicados (KPI-4) | 0 (espejo de catálogo FE eliminado) |

## Qué se logró

- **Indicadores a petición (EP-UI-201, RF-201…203):** `ChartHeader` (CMP-017) con botón de
  indicadores y export; `IndicatorForm` (CMP-016) flotante, no modal, con `Escape`/✕ y
  persistencia al cerrar; `IndicatorPanel` inferior eliminado; estado inicial sin
  indicadores por defecto; gráfico a pantalla completa horizontal y vertical.
  Popover cubierto con axe-core sin violaciones.
- **Dibujos editables (EP-UI-202, RF-208…213):** modelo serializable con paleta mate desde
  tokens, geometría editable con hit-testing y handles (target ≥24 px), command stack
  undo/redo con atajos, marcadores de compra/venta a 10 pips fuera de la vela y `Shift`
  para restringir a H/V.
- **Precisión y layout (EP-UI-203, RF-205…207):** eje X `{día} {HH:mm}` sobre la apertura de
  la vela, eje Y con 5 decimales a la derecha, export disparado desde el header reutilizando
  `ExportModal`.
- **Persistencia en navegador (EP-UI-204, RF-204, RNF-201):** `state/chart-config` versionado
  con clave activo+timeframe, guardado/restauración al cambiar de hoja y al recargar, y
  round-trip + migración de esquema (versión obsoleta y clave antigua) con cobertura 95 %.
- **Descarga y Abrir (EP-UI-205/206, RF-214…219):** formulario e historial centrados, columna
  **Activo** en el historial (a11y de tabla), formulario de Abrir centrado y **retiro de `1s`**
  de la UI.
- **Catálogo unificado (EP-201, RF-216…220, RI-202, RX-201/202):** 5 pares forex nuevos
  (GBPJPY, EURJPY, AUDUSD, USDCAD, EURGBP) con `instrument_id` verificado empíricamente a
  1 m BID; `GET /assets?scope=all` como fuente única y **eliminado el espejo**
  `frontend/src/catalog/index.ts`; Descarga, Biblioteca y Multigráfico migrados.
- **Contrato temporal (EP-202, RF-219, RNF-…):** `"1s"` retirado de `contracts.ohlc.Timeframe`
  (backend) y del espejo TS; la API responde 422 y los tests de contrato lo fijan.
- **Verificación transversal (TEC-201):** suites completas sin regresiones, axe-core +
  navegación por teclado por pantalla, profiling de 60 FPS documentado y cierre de
  iteración en `README.md`.

## Resultados de rendimiento y calidad

| Medición | Resultado |
|----------|-----------|
| RNF-202 · 60 FPS (pan/zoom 2 años @1 h) | **60 FPS**, p95 dentro de 16.67 ms, 0 frames caídos (`benchmark-ui.md`) |
| RNF-202 · 60 FPS (edición/arrastre de dibujo) | **60 FPS**, 0 frames caídos (coalescing por `requestAnimationFrame`) |
| RX-201 · 5 pares nuevos a 1 m BID | **5/5** verificados contra `freeserv.dukascopy.com` (`validation-new-pairs.md`) |
| RF-207 · eje Y | 5 decimales fijo, Importada desde el payload sin transformar |
| ACC-201 · accesibilidad | axe-core sin violaciones en Gráfico real + teclado operativo |
| RNF-203 · 0 regresiones | backend 546 + 2 skip · frontend 393 · ruff/black/mypy(src)/eslint/tsc OK |
| Suite frontend (verificación de cierre) | 54 archivos · **393 tests** en verde |

## Decisiones registradas

- **ADR-017** Capa de dibujos editable (modelo, handles, command stack).
- **ADR-018** Persistencia de configuración del gráfico en el navegador (esquema versionado).
- **ADR-019** Formulario flotante de indicadores + `ChartHeader` (retira el panel inferior).
- **ADR-020** Retiro del timeframe `1s` del contrato y de la UI.
- **ADR-021** Catálogo único vía `GET /assets`.
- Decisiones de brainstorm: D-1…D-6 (`session-handoff.md`); de planificación: DP-1…DP-5
  y decisiones de planificación heredadas de los ciclos anteriores (`backlog.md`).

## Verificación de RNF-007 (plazo de la iteración)

La iteración 03 se completó **el mismo día** en que se inició (2026-09-29): las 35 tareas
y los 29 requisitos quedaron cerrados dentro del plazo de 2 semanas. **RNF-007 cumplido.**

## Deuda asumida / fuera de alcance

- Persistencia de dibujos y configuración **solo en el navegador**: no hay backend ni
  sincronización entre dispositivos (fuera de alcance por decisión D-2).
- No hay deshacer/rehacer de **configuración** (el command stack cubre dibujos, RF-213), ni
  nuevos tipos de indicadores, ni guardado de estrategias como archivo.
- Requisitos **heredados** (RNF-001/004/005/006/007, RI-001/002, RX-001) se mantienen sin
  re-verificación en este ciclo: su evidencia histórica vive en `iterations/01-mvp/` y
  `iterations/02-optimizacion-descarga/`.
- **Hueco de herencia de ADRs (resuelto al archivar):** el `adr/` de este ciclo contiene
  ADR-001…011 (duplicados de `01-mvp`) y ADR-017…021, pero **no** ADR-012…016, que solo viven
  en `iterations/02-optimizacion-descarga/adr/`. Resuelto: la raíz del ciclo 04 se sembró con
  los **21 ADRs vigentes** (copias byte-idénticas de los tres ciclos) y ADR-017…021 pasaron de
  `Propuesto` a `Aceptado` con fecha 2026-09-29 (estaban implementados y trazados, pero nunca
  se aceptaron formalmente).
- **Deriva de documentación:** el conteo de tests frontend varió entre artefactos (389 en
  `traceability.md`, 392 en `README.md`, 393 verificado al cierre). La cifra de cierre es
  **393** (54 archivos); conviene unificar la métrica en el próximo cierre.

## Qué se aprendió

- El mayor valor vino de **quitar** restrictores (panel inferior, indicadores por defecto,
  altura fija) más que de añadir funcionalidad.
- La edición de dibujos **no** exigió reescribir `lightweight-charts`: una capa propia de
  geometría + handles + command stack bastó y mantuvo 60 FPS (riesgo R-202 resuelto sin
  sobresalto).
- La persistencia versionada en el navegador salió barata y evitó un endpoint nuevo; el
  versionado del esquema evitó el riesgo R-203 desde el diseño.
- Sincronizar `status.md` sin propagar el estado a `backlog.md` y `traceability.md` genera
  contradicciones detectables (35/35 Done frente a 35 tareas 📥 y 5 requisitos 🔵). El cierre
  de ciclo debe **reconciliar los tres artefactos**, no solo el tablero.

## Próximos pasos sugeridos

1. Ciclo 04 — **Dibujo Referencia de Operación**: discutir alcance en `/sdd-brainstorm`.
2. Re-sembrar `adr/` raíz con ADR-001…021 antes de `/sdd-stack` del ciclo 04.
3. Cerrar la métrica de tests en una sola fuente (script o README) para evitar la deriva 389/392/393.
