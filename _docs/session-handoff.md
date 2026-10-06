# Handoff de Sesión

> Estado al cerrar el brainstorm del **ciclo 05** — 2026-10-06

## Dónde estamos

**Ciclo 04 cerrado y archivado** en `_docs/iterations/04-dibujo-referencia-operacion/`
(20/20 tareas · 19/19 requisitos propios 🟢 · CI en verde).

**Ciclo 05 abierto y planificado en alcance.** El brainstorm cerró `plan.md`,
`requirements.md`, `glossary.md`, `traceability.md` y este handoff a partir del insumo
`cycle_05.md`. Los 13 requisitos del ciclo (`4xx`) están en 🟡 pendiente: falta el diseño
(`/sdd-stack`) y el backlog.

**Insumo:** `cycle_05.md` (raíz del repo) — mejoras de la pantalla `Gráfico` y cierre de la
deuda diferida del ciclo 04.

## Decisiones de sesión (D-X)

- **D-1 — Los dibujos son del activo.** Un dibujo pertenece al activo y se muestra en todos sus
  timeframes, anclado a sus precios y tiempos (RF-404). Hoy la clave es
  `fxtrad.chart.v1.{activo}.{timeframe}`, así que un Fibonacci de 1 h no existe en 15 m.
- **D-2 — Documento v2 por activo con migración aditiva al leer.** `chart-config` pasa a v2
  (`drawings` compartidos + indicadores del activo); al abrir un activo se consolidan sus
  documentos v1 y **no se borran** las claves antiguas (RI-401, RNF-401). Modifica RI-201 y
  ADR-018/ADR-023 ⇒ exige **ADR nuevo**, que decide `/sdd-stack`.
- **D-3 — Se retira Multigráfico.** Se borran ruta `/multichart`, pantalla `MultiChart` y sus
  tests; RF-310 del ciclo 04 se modifica a «Operación disponible solo en Gráfico» (RF-409).
- **D-4 — `Exportar` se evalúa en el ciclo**, no se elimina a ciegas: la decisión (mantener o
  retirar) se documenta con evidencia al cierre (RF-411).
- **D-5 — RNF heredados, sin umbral nuevo.** Se mantienen 60 FPS (RNF-403) y 0 regresiones
  (RNF-402); el tiempo de cambio de TF **se mide y se registra** (RNF-404) pero no bloquea.
- **D-6 — El TF `30 m` no existe.** Se retira del glosario; los TF reales son
  `1m, 5m, 15m, 1h, 4h, 1d` (los de `TIMEFRAMES` y la base 1 m).
- **D-7 — Un solo ciclo con MoSCoW.** Must: 2.a, 2.b, 2.c.1/2.c.4 y 2.c.2/2.c.3. Should: 2.c.5,
  2.c.6, TECH-302, 2.d. Could: 2.e, RF-410 (TECH-303).
- **D-8 — La deuda de la auditoría `CR-002` queda fuera del ciclo 05** (refactores de tamaño,
  contrato de logging y motivos de waiver). Sigue en el backlog para `/sdd-backlog`.
- **D-9 — Los dos bugs se diagnostican antes de tocar.** El aviso de cobertura (RF-402) puede no
  ser un falso positivo; si la condición es correcta, se conserva con texto más claro.

## Preguntas abiertas (PA-X)

- **PA-1:** ¿El aviso de cobertura (RF-402) es realmente un falso positivo? Diagnóstico
  pendiente antes de modificar la condición (`ChartPane.tsx:413`).
- **PA-2:** ¿Desaparece el dolor de Multigráfico al arreglar RF-401? Si la causa era el mismo
  bug de selección, reconsiderar la retirada antes de ejecutarla.
- **PA-3:** Criterio de aceptación de la evaluación de `Exportar`: ¿qué la hace «viable»?
- **PA-4 — resuelta en `/sdd-stack`:** las citas `plan.md` de ADR-022 y ADR-025 se cualificaron a
  `_docs/iterations/04-dibujo-referencia-operacion/plan.md` (decisiones del ciclo 04) y
  `architecture.md` §11 documenta que `_docs/plan.md` es siempre el plan del ciclo vigente.
- **PA-5:** ¿Quién verifica los 12 frentes (KPI-401) y con qué guion de prueba manual?

## Estado técnico

| Aspecto | Valor |
|---------|-------|
| Backend | FastAPI + Celery + DuckDB/Parquet, 546 tests + 2 skip — **sin cambios en este ciclo** |
| Frontend | React + Vite + lightweight-charts, 458 tests (55 archivos) |
| Persistencia | `localStorage` con clave `fxtrad.chart.v1.{activo}.{TF}` → pasa a v2 por activo (D-2) |
| Timeframes | `1m, 5m, 15m, 1h, 4h, 1d` (`contracts/ohlc.ts`); `30 m` retirado del glosario (D-6) |
| Calidad | `_docs/quality-profile.toml` presente · gate **PASS** (0 incumplidos, 25 waivers) |
| Versionado | `_docs/git-profile.toml` presente · rama `master`, árbol limpio al cerrar el brainstorm |
| Auditoría | `CR-002` en CHANGES_REQUESTED (4 WARNING, 0 CRITICAL) — deuda fuera del 05 (D-8) |

## Qué haría yo ahora

1. **`/sdd-stack`** — diseñar la v2 del documento (ADR nuevo de persistencia y migración), la
   retirada de Multigráfico y el menú contextual; actualizar `traceability.md` con el diseño.
2. **`/sdd-ux`** si el cambio de eje, el menú contextual y el selector de TF necesitan contrato
   UX propio (probable: SCR-004 cambia).
3. **`/sdd-backlog`** para las tareas del ciclo (debe arrastrar `TECH-302`/`TECH-303`, que el
   insumo mete en el alcance) y **`/sdd-track`** para inicializar el tablero del 05.

## Avisos

- `_docs/backlog.md` y `_docs/status.md` siguen describiendo el ciclo 05 **antes** del brainstorm
  (2 entradas de deuda en 📥, sin épicas ni tareas). Los actualizan `/sdd-backlog` y `/sdd-track`.
- `_docs/architecture.md` y `_docs/adr/` de la raíz son todavía los del ciclo 04: `/sdd-stack`
  los actualiza (conservando el histórico acumulativo).
- El commit del brainstorm queda pendiente; el cierre de `/sdd-cycle` no lo hará por ti.
