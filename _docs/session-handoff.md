# Handoff de Sesión `/sdd-brainstorm`

## Resumen ejecutivo (5 líneas)

1. MVP personal de análisis técnico (estilo TradingView) para validar estrategias de trading con datos históricos.
2. Fuente de datos única: Dukascopy, solo forex, metales y petróleo; descargas en timeframe 1s UTC e incrementales (sin duplicar ni borrar).
3. Pipeline de limpieza (índice temporal, resampling, imputación, feature engineering) que alimenta Parquet + DuckDB.
4. Interfaz web con velas japonesas, zoom/pan, dibujos (líneas, rectángulos, Fibonacci, simulador compra/venta), indicadores (RSI, ATR, MM) y hasta 3 gráficos del mismo activo en distintos timeframes.
5. Sin costos ($0), plazo 2 semanas, y arquitectura deliberadamente extensible.

## Artefactos generados

- `_docs/plan.md`
- `_docs/requirements.md`
- `_docs/glossary.md`
- `_docs/traceability.md`
- `_docs/session-handoff.md`

## Decisiones tomadas

- **D-1:** Fuente de datos exclusiva Dukascopy; fuera de alcance: otras fuentes y activos distintos a forex/metales/petróleo.
- **D-2:** Descarga base a 1 segundo en UTC; timeframes de visualización 1m/5m/15m/1h/4h/1d por resampling.
- **D-3:** Almacenamiento obligatorio Parquet + DuckDB.
- **D-4:** Descargas incrementales que completan activos existentes sin duplicar ni borrar (control por metadatos de descarga).
- **D-5:** Persistencia de estrategias: solo export a imagen (PNG) con gráfico + dibujos; los dibujos no se guardan en la app.
- **D-6:** Carga desde la base local con selección de activo + rango de fechas (fecha inicio/fin) por el usuario.
- **D-7:** Alcance OUT explícito: sin tiempo real, sin creador/evaluación automática de estrategias, sin trading en vivo, sin autenticación/multiusuario.
- **D-8:** Extensibilidad como requisito (RF-016) y estructura de datos consumible por el framework de visualización (RNF-008 / R-005).
- **D-9:** Riesgo de descargas masivas mitigado con retardos de hasta 20 s; plazo 2 semanas negociable.

## Preguntas abiertas / pendientes

- **P-1:** Meta numérica del KPI-1 (tiempo máximo de descarga de 2 años de datos). [impacta en: backlog]
- **P-2:** Formato exacto de la imagen exportada (PNG) y resolución/dimensiones. [impacta en: stack/implement]
- **P-3:** Política específica de imputación de NaN/gaps (p. ej. forward-fill, eliminación). [impacta en: stack/implement]
- **P-4:** Framework/librería de gráficos con contrato de datos compatible con el esquema final (vinculado a R-005). [impacta en: stack]

## Checklist de completitud

- [x] ¿Hay RNF definidos?
- [x] ¿Hay fuera de alcance explícito?
- [x] ¿Cada requisito tiene criterio de aceptación?
- [x] ¿Hay al menos un riesgo identificado?
- [x] ¿Hay stakeholders definidos?
- [x] ¿Hay KPIs medibles?

## Próximo skill sugerido

`/sdd-stack` — Selección de Stack Tecnológico y Arquitectura.

---

# Handoff de Sesión — viernes 2026-09-18 (implementación EP-001)

## Estado del proyecto

- **8/61 tareas Done (13.1%)** · 🔨 Doing 0 · 👀 Review 0 · 🔴 Blocked 0 · `master` limpio, sin remoto.
- Cerrado hoy: **TASK-004 ✅** (Celery + RabbitMQ, ADR-006). Commits `8382e48` → `6d5fbfc` (feat TASK-004 + docs traceability + docs estado). Rama `feature/TASK-004-celery` eliminada tras merge ff.
- Suite backend: **126 passed + 2 skipped**, ruff/black/mypy OK, cobertura `ingest` y `pipeline` 100%.

## Qué se validó en vivo (TASK-004 E2E en Docker)

- `docker compose -f docker-compose.worker.yml up`: worker + RabbitMQ arriba, worker conectado a `amqp://` y con `ingest.download_asset` registrada.
- Encolado por el seam de la API → broker → worker ejecutó con `task_id` correlacionado en logs; flujo de horas UTC y URL bien formada (`eurusd/2026/07/06/09h_ticks.bi5`).
- **AR-1 confirmado:** Dukascopy devuelve 503/timeout desde esta IP (4/4 intentos, también fechas pasadas) → el tramo de datos reales está degradado; no es un fallo del pipeline.
- `summary.md`/`status.md`/`backlog.md`/`traceability.md` actualizados y commiteados.

## Lo más importante para el lunes

1. **Iniciar TASK-005** (Retry/backoff 20 s, deps TASK-002 ✅ + TASK-004 ✅) → mitiga **AR-1**.
2. **TASK-002 live optativo pendiente** (`RUN_CELERY_INTEGRATION=1`), probar descarga real cuando el feed responda para cerrar el ciclo con datos.
3. Alertas abiertas: **PA-1** (impacta TASK-005/008) y **PA-2** (impacta TASK-036/UI-060), RNF sin verificación programada, **DP-8** (184 pts > capacidad 2 semanas).
4. Próximos candidatos en orden: TASK-005 → TASK-006 (GET /downloads/{task_id}) → TASK-007 → TASK-015.

## Comandos de retoma

```bash
docker compose -f docker-compose.worker.yml up   # E2E si hace falta
docker compose -f docker-compose.worker.yml down
cd backend && .venv/bin/python -m pytest         # suite completa
cd backend && .venv/bin/ruff check src tests && .venv/bin/black --check src tests && .venv/bin/mypy src
```