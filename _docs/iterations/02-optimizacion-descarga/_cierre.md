# Cierre de Ciclo: 02 — Optimización de descarga y base 1 m

> Snapshot de cierre del ciclo 2 del pipeline SDD.
> Inicio: 2026-09-28 (`/sdd-brainstorm`) · Cierre: 2026-09-28
> Estado final: **24/24 tareas ✅ (100%)** · 19/19 requisitos al 100% · 0 bloqueos

## Resumen del ciclo

Hacer viable la descarga de datos históricos y cambiar la base canónica de 1 s a 1 m.
La iteración 01 no había completado **ninguna** descarga: el ingest pedía ticks crudos y
fragmentaba el rango hora a hora. Este ciclo reescribe el transporte (1 m directo de la
API), pagina por bloques con pacing, añade tandas/reanudación y migra toda la base a 1 m.
Un solo desarrollador, mismo día de trabajo efectivo, 98 puntos estimados, stack 100 % OSS ($0).

| Dimensión | Valor al cierre |
|-----------|-----------------|
| Tareas | 24 (+1 deuda `TECH-002`) |
| 📥 / 🔨 / 👀 / 🔴 | 0 / 0 / 0 / 0 |
| ✅ Done | 24 (100%) |
| Requisitos IN | 19/19 🟢 (6 RF · 8 RNF · 3 RI · 2 RX) |
| Épicas | 4 dominio (EP-005…008) · 1 UI (EP-UI-007) · 1 técnica (TEC-005) |
| Historias | 5 |
| Capas | backend 12 · test 8 · docs 3 · frontend 1 |
| Ruta crítica | 5/5 completadas (100%) |
| ADRs | 5 (ADR-012…016) |
| Tests | backend 536 ✅ + 2 skip · frontend 286 ✅ |
| Duplicados (KPI-4) | 0 |

## Qué se logró

- **Descarga viable (EP-005):** `FreeservClient.download_range` a 1 m BID (TASK-053),
  planificador de bloques ≤ 30.000 con precálculo (TASK-052), pacing de 20 s (TASK-054),
  retry por bloque (TASK-055), orquestación en Celery (TASK-056) y retiro del código de
  ticks (TASK-057). **RF-101/RF-102 al 100 %.**
- **Base 1 m de punta a punta (EP-006):** resample canónico 1 m (TASK-059), naming
  `{symbol}.1m.parquet` y rechazo de `1s` (TASK-060/062), refresh de derivadas desde 1 m
  (TASK-061) y guard de regresión (TASK-063). **RF-103, RI-101, RI-102 al 100 %.**
- **Tandas y reanudación (EP-007):** descomposición en tandas de 6–12 m con progreso
  (TASK-064) y reanudación por rango restante sin duplicados (TASK-065). **RF-104 al 100 %.**
- **Integridad y mercado (EP-008):** integridad de paginación KPI-5 (TASK-058), upsert +
  metadatos (TASK-068) y exclusión weekend/feriados (TASK-069). **RF-105/RF-106 al 100 %.**
- **Verificación y UI (EP-UI-007/TEC):** UTC + contrato OHLC (TASK-070), ventana 2 años
  (TASK-071), nota 1 m en SCR-002 (TASK-UI-061) y smoke de rutas (TASK-073).

## Resultados de rendimiento y calidad

| Medición | Resultado |
|----------|-----------|
| RNF-101 · descarga 1 año @1 m | **309,9 s** ≤ 900 s (`benchmark-download.md`) |
| RNF-102 · escritura Parquet 726k | **52,1 µs/vela** (×11,5), 0 duplicados (`benchmark_parquet.py`) |
| RNF-004/RNF-008 · UTC y contrato | `time` BIGINT UTC + OHLC DOUBLE, payload del chart sin transformar |
| RNF-006 · licencias | backend 50 · frontend 310 · denylist 0 (`license-audit.md`) |
| Suite | backend 536 + 2 skip · frontend 286 |

## Decisiones registradas

- **ADR-012** Base temporal canónica 1 m (reemplaza 1 s).
- **ADR-013** Paginación por bloques ≤ 30.000 con precálculo y pacing 20 s.
- **ADR-014** Semántica de precio BID puro.
- **ADR-015** Descarga por tandas de 6–12 m con progreso y reanudación.
- **ADR-016** Conservar Celery/RabbitMQ.
- Decisiones de planificación: D-1…D-6 (`session-handoff.md`) y DP-1…DP-4 (`backlog.md`).

## Verificación de RNF-007 (plazo de la iteración)

La iteración 02 se completó **el mismo día** en que se inició (2026-09-28): las 24 tareas
y los 19 requisitos quedaron cerrados dentro del plazo de 2 semanas. **RNF-007 cumplido.**

## Deuda asumida / fuera de alcance

- `contracts.ohlc.Timeframe` conserva `"1s"` en el contrato API (y su espejo TS); el
  storage ya lo rechaza con `InvalidTimeframeError`. Retirarlo del contrato es un cambio
  de contrato aparte (no planificado en esta iteración).
- Disparador de reanudación en la UI (PA-1): la reanudación se resuelve por solicitud
  del rango restante; no se añadió control en pantalla.

## Próximos pasos sugeridos

1. Iteración 03 (si procede): retirar `"1s"` del contrato `Timeframe` (API + espejo TS) y
   actualizar la UI de selección de timeframe.
2. Evaluar la reanudación desde la UI (PA-1) sobre `resume_download`.
