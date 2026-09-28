# Cierre de Ciclo: 01 — MVP

> Snapshot de cierre del ciclo 1 del pipeline SDD.
> Inicio: 2026-09-17 (ADR-001…009 + backlog v2) · Cierre: 2026-09-25
> Estado final: **66/66 tareas ✅ (100%)** · 29/29 requisitos IN al 100% · 0 bloqueos

## Resumen del ciclo

MVP de una plataforma personal de análisis técnico (estilo TradingView) para validar
estrategias de trading sobre datos históricos. Un solo desarrollador, 8 días de trabajo
efectivo en el pipeline (17→25 de septiembre), 197 puntos estimados, stack 100% OSS ($0).

| Dimensión | Valor al cierre |
|-----------|-----------------|
| Tareas | 66 (65 + 1 deuda documental) |
| 📥 / 🔨 / 👀 / 🔴 | 0 / 0 / 0 / 0 |
| ✅ Done | 66 (100%) |
| Requisitos IN | 29/29 🟢 (16 RF · 8 RNF · 3 RI · 2 RX) |
| Mapeos tarea↔requisito | 97/97 |
| Épicas | 4 dominio (EP-001…004) · 7 UI (EP-UI-000…006) · 4 técnicas (TEC-001…004) |
| Historias | 23 |
| Capas | backend 24 · frontend 29 · bd 7 · infra 5 · deuda 1 |
| Ruta crítica | 12/12 completadas (100%) |
| ADRs | 11 |
| Pantallas UX | 6 (SCR-001…006), 15 componentes (CMP-001…015) |
| Tests | backend 461 ✅ + 2 skip · frontend 284 ✅ |
| CI | GitHub Actions run #1 en verde (backend + frontend) |
| Despliegue | `docker compose up` → 4/4 servicios con volumen `data/` |

## Qué se logró

- **Ingesta completa**: descarga de Dukascopy vía freeserv (ADR-010) a 1s UTC, con retry
  backoff 20 s, estados parcial/fallo y ventana de ≤ 2 años (EP-001).
- **Persistencia real de extremo a extremo**: la tarea Celery fusiona la serie 1s en
  Parquet y registra `download_metadata` con las filas obtenidas (TASK-050) — el hueco
  que existía antes de la verificación del ciclo, donde `ingest` nunca llamaba a
  `ParquetSeriesStore.merge()`.
- **Derivados siempre frescos**: `DerivedSeriesRefresher` regenera solo los buckets
  intersectados tras cada merge (TASK-049), cerrando el bug de ventana de lectura que
  agregaba una fracción del intervalo en el último bucket.
- **Volumen viable**: escritura Parquet por lotes (`INSERT … SELECT`) a 52,6 µs/vela
  (×11,4 sobre la línea base de 600) → 18M filas ≈ 15,8 min (TASK-051). Sin esto
  RNF-002 era inviable a 1s.
- **Frontend completo**: 6 pantallas, 15 componentes, design system con tokens dark y
  contraste AA verificado por test anti-drift, overlay de dibujos (línea/rectángulo/
  Fibonacci/marcadores buy-sell) sincronizado con los ejes del chart, multigráfico de
  3 panes sincronizados, export PNG/WebP a 1x/2x/4x.
- **Extensibilidad demostrada** (RF-016): `IndicatorRegistry` descubre un plugin nuevo
  sin tocar código existente; fronteras entre los 5 módulos verificadas por AST.
- **Operabilidad**: logging estructurado con correlación Celery, CI en verde real,
  auditoría de licencias OSS con denylist copyleft = 0 sobre 360 paquetes.

## Qué se aprendió

1. **El % de "Done" no era cobertura real.** Tres requisitos (RF-006, RF-009, RNF-002)
   figuraban completos porque sus *primitivas* existían, pero el flujo E2E no los
   ejercitaba: la descarga no persistía, los derivados servían velas obsoletas y el
   writer hacía 18M filas a 600 µs/vela. Los tests unitarios passaban. El defecto real
   lo destapó la verificación de sesión al cerrar TASK-044/045.
   → *Un requisito está cubierto cuando un flujo de extremo a extremo lo prueba, no
   cuando su pieza más difícil tiene un test.*
2. **El mismo fallo se repitió en el frontend** (TASK-048): los marcadores compra/venta
   pasaban 163 tests y no se veían en el navegador, por `z-index` y por el tamaño
   intrínseco del `<canvas>` a `dpr ≠ 1`. Los tests usaban un punto de entrada que el
   navegador nunca invocaba (`onClick` DOM en vez de `chart.subscribeClick`).
   → *Un test que simula la interacción en lugar de ejercitar la ruta real es una
   aserción sobre el test, no sobre el producto.*
3. **El desync entre `backlog.md` y `status.md` se corrige empujando el estado, no
   interpretables**: hubo 4 tareas (TASK-049/050/051, TECH-001) cerradas en código y sin
   registrar en el tablero durante una sesión. El proceso que funciona es resync
   explícito al cerrar review, con evidencia (rutas de test, números de suite).
4. **El contrato de logging definido antes de escribir la primera línea de producción
   (ADR-008 → `logging-contract.md`) timestep 0 unpaid**: ninguna tarea de observabilidad
   hubo que retrofitear.
5. **El backlog脱 debt-tracking funcionó**: convertir la deuda detectada en tareas con
   requisito y DoD (`/sdd-backlog`, 2026-09-25) fue más efectivo que anotarla como nota.

## Qué queda para el próximo ciclo

- 🔴 **AR-1 — la descarga real nunca se verificó en vivo contra Dukascopy.** El
  2026-09-18 la fuente devolvió 503/timeout (4/4 intentos); TASK-005 lo mitigó con
  retry/backoff 20 s, pero no hubo reverificación posterior. Todo el tramo de ingesta
  está probado con fixtures y mocks. El ciclo 2 (`mejoras-descarga-datos`) arranca por
  aquí: es la única brecha funcional abierta y no está registrada como tarea.
- 🟡 **PA-1 — KPI-1 sin meta numérica** (tiempo máximo de descarga de 2 años). Deja el
  requisito de rendimiento sin criterio de aceptación medible.
- 🟡 **PA-2 — formato y resolución del PNG exportado** asumidos (PNG 2x por defecto),
  nunca decididos formalmente.
- 🔵 **Sin velocidad histórica**: `status.md` no tiene burn-down, lead time ni cycle time
  (primer y único ciclo). Sin línea base, `RNF-007` (2 semanas) no se puede verificar
  contra datos reales.
- 🟡 **10 inconsistencias de texto obsoleto** congeladas en este archivo: `backlog.md`
  §1 (deuda = 1 siendo TECH-001 ✅) y §9 (6 pantallas en 📥), `status.md` §1/§6/§7/§8,
  `traceability.md` (nota residual "TASK-039/041 pendientes" en RNF-007 🟢 y recuento
  "18 🟢 / 9 🔵 / 2 🟡" que contradice la tabla de 29 🟢), `session-handoff.md` y
  `plan.md` §7.1 (snapshot del brainstorm con P-1…P-4 y "próximo skill: /sdd-stack").
  No afectan al producto; quedan como ruido histórico.

## Artefactos de este ciclo

| Artefacto | Archivo | Heredado al ciclo 2 |
|-----------|---------|--------------------|
| Plan | `plan.md` | ❌ (se archiva) |
| Requisitos | `requirements.md` | ❌ (se archiva) |
| Trazabilidad | `traceability.md` | ❌ (se archiva) |
| Sesión handoff | `session-handoff.md` | ❌ (se archiva) |
| Arquitectura | `architecture.md` | ❌ (se archiva, se archivan con ella `module-interfaces.md` y `backlog-graph.mmd`) |
| Backlog | `backlog.md` | ❌ (se archiva) |
| Estado | `status.md` | ❌ (se archiva, snapshot al 100%) |
| UX | `ux/` (6 docs + 6 wireframes) | ❌ (se archiva) |
| ADRs | `adr/` (11) | ✅ vigente — snapshot en `adr/`, original en la raíz |
| Glosario | `glossary.md` | ✅ se amplía — original en la raíz |
| Logging | `logging-contract.md` | ✅ global — original en la raíz |
| Licencias | `license-audit.md` | ✅ evidencia RNF-006 — original en la raíz |

## Referencias cruzadas

- ADRs 001–011: **vigentes**. Si el ciclo 2 reemplaza alguno, se marca
  `[reemplaza ADR-XXX]` en el nuevo y el anterior pasa a `Reemplazado por ADR-YYY`.
- Requisitos RF-001/RF-002 (ingesta) y RF-006/RF-009, RNF-002/RNF-003: **verificados con
  fixtures**, no contra la fuente real. El ciclo 2 puede modificarlos; se documenta con
  `[modifica RF-XXX del ciclo 01-mvp]`.
