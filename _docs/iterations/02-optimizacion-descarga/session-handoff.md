# Handoff de Sesión `/sdd-brainstorm`

**Iteración:** 02 — Optimización de descarga y base 1m
**Fecha:** 28 de septiembre de 2026

## Resumen ejecutivo (5 líneas)

La descarga del MVP nunca se completó porque pedía ticks crudos y fragmentaba el
rango hora a hora, cuando `dukascopy_python.fetch` ya pagina internamente a 30.000
puntos. Esta iteración cambia la base de 1 s a 1 m (BID), pagina por bloques de
≤ 30.000 velas con 20 s de espera y estima 1 año en ≤ 900 s. El cambio se acota a
`ingest` y a la base, conservando Celery, la fusión incremental y el filtro de
mercado.

## Artefactos generados

- `_docs/iterations/02-optimizacion-descarga/plan.md`
- `_docs/iterations/02-optimizacion-descarga/requirements.md`
- `_docs/iterations/02-optimizacion-descarga/glossary.md`
- `_docs/iterations/02-optimizacion-descarga/traceability.md`
- `_docs/iterations/02-optimizacion-descarga/session-handoff.md`

## Decisiones tomadas

- **D-1:** Base canónica **1 m** (se abandona 1 s y los timeframes sub-minuto).
- **D-2:** Fuente de precio **BID puro** (`OFFER_SIDE_BID`); se acepta la diferencia
  semántica frente al `mid = (bid+ask)/2` anterior.
- **D-3:** Estrategia de descarga **precálculo → bloques ≤ 30.000 velas → 20 s de
  espera** entre bloques.
- **D-4:** **Mantener Celery/RabbitMQ** (opción de menor riesgo); solo se corrige
  `ingest`. Celery no afecta al tiempo de descarga.
- **D-5:** Descarga por **tandas de 6–12 meses** con progreso y reanudación.
- **D-6:** Objetivo de rendimiento **≤ 900 s/año** y **≤ 1800 s para 2 años**.

## Preguntas abiertas / pendientes

- **P-1 (S-2) [stack]:** ✅ resuelto — validación empírica confirmada por el usuario.
- **P-2 [backlog]:** ✅ resuelto — naming migrado a `{symbol}.1m.parquet` (TASK-060/063).
- **P-3 [backlog]:** ✅ resuelto — RNF-002 reemplazado por RNF-102 en docs (TASK-067),
  `benchmark_parquet.py` reescrito (TASK-066) y nota "1 s UTC" → "1 m" (TASK-UI-061).

## Checklist de completitud

- [x] ¿Hay RNF definidos? (RNF-101, RNF-102 + heredados)
- [x] ¿Hay fuera de alcance explícito? (1 s y sub-minuto, migración, etc.)
- [x] ¿Cada requisito tiene criterio de aceptación? (Dado/Cuando/Entonces)
- [x] ¿Hay al menos un riesgo identificado? (R-001..R-005)
- [x] ¿Hay stakeholders definidos? (usuario único + mantenedor)
- [x] ¿Hay KPIs medibles? (KPI-1..KPI-5)

## Próximo skill sugerido

`/sdd-stack` — Selección de Stack Tecnológico y Arquitectura (ADR de descarga y
resolución base).
