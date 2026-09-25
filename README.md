# fxtrad — Plataforma de análisis técnico (estilo TradingView)

Aplicación **personal y local** (RNF-005, RNF-006, RNF-007) para descargar datos
históricos de Dukascopy, almacenarlos como Parquet + DuckDB, resamplearlos a
timeframes de visualización y graficarlos como velas con indicadores, dibujos y
exportación a imagen.

- **Costo $0**: 100% software de código abierto (ver `_docs/license-audit.md`).
- **Sin nube ni cuenta**: un único entorno local con Docker Compose.
- **Especificación primero (SDD)**: plan, requisitos, arquitectura, ADRs, UX,
  backlog y estado viven en `_docs/`; el código los materializa.

## Estado actual

| Métrica | Valor |
|---------|-------|
| Tareas | **66 / 66 Done (100%)** |
| Requisitos IN | **29 / 29 al 100%** |
| Trazabilidad | 97 / 97 mapeos de tarea con prueba |
| Backend | 461 tests ✅ + 2 skip · ruff · black · mypy |
| Frontend | 284 tests ✅ · eslint · tsc · prettier · axe-core |

Fuente de verdad: `_docs/status.md`, `_docs/backlog.md`, `_docs/traceability.md`.

## Stack

| Capa | Tecnología | ADR |
|------|------------|-----|
| Frontend | React 18 + Vite 5 + TypeScript 5 + `lightweight-charts` v4 (MIT) | ADR-003, ADR-005 |
| Backend | Python 3.12 + FastAPI + Uvicorn | ADR-002 |
| ETL | pandas + DuckDB + Parquet por activo | ADR-004 |
| Cola | Celery + RabbitMQ | ADR-006 |
| Caché | in-memory por ventana + Parquet columnar | ADR-007 |
| Observabilidad | `logging` + `structlog` (JSON en prod) | ADR-008 |
| Despliegue | Docker Compose (4 servicios + volumen `data/`) | ADR-009 |
| CI | GitHub Actions (lint + tests) | ADR-008 |

## Arquitectura

Monolito modular. Los módulos del backend exponen una interfaz pública
documentada y respetan direcciones de dependencia (ver
`_docs/module-interfaces.md`):

```
contracts ──► storage ──► pipeline ──► ingest ──► api
    (modelos OHLC)   (Parquet/     (limpieza,   (descarga +   (REST)
                      DuckDB)       resampling,  cola Celery)
                                    persistencia,
                                    indicadores)
```

| Módulo | Responsabilidad |
|--------|-----------------|
| `contracts` | Contrato OHLC canónico (tiempo en segundos UTC) |
| `storage` | Persistencia Parquet + DuckDB, incremental sin duplicados, metadatos, caché |
| `pipeline` | Limpieza, exclusión de mercado cerrado, resampling, UTC, persistencia, indicadores |
| `ingest` | Catálogo de activos, descarga Dukascopy, retry/backoff, tarea Celery |
| `api` | Endpoints REST (`/assets`, `/downloads`, `/downloads/{task_id}`, `/series`) |

El **worker** no es un directorio propio: es la imagen del backend
(`backend/Dockerfile`, stage `worker`) ejecutando Celery con RabbitMQ.

## Estructura del repositorio

```
fxtrad/
├── backend/                  # FastAPI + Celery + pipeline + storage (Python 3.12)
│   ├── src/fxtrad/           #   api · ingest · pipeline · storage · contracts · logging_config
│   ├── tests/                #   pytest (461 tests)
│   ├── scripts/              #   benchmark_parquet.py (RNF-002)
│   ├── Dockerfile            #   imagen multi-stage: api | worker
│   └── pyproject.toml        #   ruff · black · mypy · pytest (uv)
├── frontend/                 # SPA React 18 + Vite 5 + TS 5 + lightweight-charts
│   ├── src/                  #   components · charting · export · indicators · services
│   ├── Dockerfile            #   Vite dev con proxy a la API
│   ├── package.json          #   eslint · prettier · tsc · vitest
│   └── smoke-test.md         #   checklist de smoke de escritorio (RNF-005)
├── contracts/                # contrato OHLC canónico (JSON schema + md)
├── data/                     # Parquet + DuckDB locales (gitignored; volumen de compose)
├── docker-compose.yml        # 4 servicios: frontend, backend, worker, broker
├── docker-compose.worker.yml # RabbitMQ + worker (E2E de descarga)
├── _docs/                    # plan, requirements, architecture, adr/, ux/, backlog, status, traceability
├── Makefile                  # lint · format · test · build · compose · benchmark
└── .editorconfig
```

## Requisitos previos

- **Python 3.12** y [`uv`](https://docs.astral.sh/uv/) (backend y worker).
- **Node 20+** y `npm` (frontend).
- **Docker** y **Docker Compose** (stack completo o E2E del worker).
- Git.

---

## Puesta en marcha

### Opción A — Stack completo con Docker Compose (recomendado)

Levanta los 4 servicios (frontend, backend, worker, broker) sin instalar Python
ni Node:

```bash
docker compose up --build
```

| Servicio | URL / puerto |
|----------|--------------|
| Frontend (Vite) | http://localhost:5173 |
| Backend (FastAPI) | http://localhost:8000 |
| RabbitMQ (management) | http://localhost:15672 (guest / guest) |
| AMQP | `localhost:5672` |

- El volumen `./data` se monta en `/app/data` de `backend` y `worker` (Parquet +
  DuckDB compartidos).
- El frontend proxya `/series`, `/downloads` y `/assets` al servicio `backend`
  (`VITE_PROXY_TARGET`), de modo que el navegador usa un **único origen** (sin
  CORS).

Para detenerlo:

```bash
docker compose down
```

### Opción B — Desarrollo local (backend + frontend por separado)

#### 1. Backend (API en `http://localhost:8000`)

```bash
cd backend
uv sync --extra dev
uv run uvicorn --factory fxtrad.api.app:create_default_app --host 0.0.0.0 --port 8000
```

#### 2. Worker Celery + broker (proceso aparte)

Sin worker, las descargas quedan encoladas y no se ejecutan. Para levantar solo
RabbitMQ + worker con Docker:

```bash
docker compose -f docker-compose.worker.yml up --build
```

#### 3. Frontend (SPA en `http://localhost:5173`)

```bash
cd frontend
npm ci            # o: npm install
npm run dev
```

El servidor de Vite proxya la API a `http://localhost:8000` por defecto. Para
apuntar a otro backend, define `VITE_PROXY_TARGET` (p. ej.
`VITE_PROXY_TARGET=http://localhost:9000 npm run dev`).

### Verificación rápida

1. `curl http://localhost:8000/assets` → `[]` (catálogo vacío).
2. Abre http://localhost:5173 y navega a **Biblioteca** → estado *empty* con el
   CTA "Descargar mi primer activo".
3. Descarga un activo (SCR-002) y, al terminar, aparecerá en la biblioteca; desde
   ahí, **Graficar** abre SCR-003/SCR-004.

> **Limitación conocida (AR-1):** la API pública de Dukascopy puede responder
> `503`/timeout desde algunas IPs; el retry/backoff de 20 s lo mitiga, pero el
> tramo de datos reales puede degradarse. El pipeline y los tests usan dobles,
> por lo que la suite no depende de la red.

---

## Variables de entorno

### Backend / worker

| Variable | Default | Efecto |
|----------|---------|--------|
| `FXTRAD_DATA_DIR` | `data` | Directorio de Parquet + `downloads.duckdb` |
| `FXTRAD_BROKER_URL` | `amqp://guest:guest@localhost:5672//` | Broker Celery (RabbitMQ) |
| `FXTRAD_RESULT_BACKEND` | `rpc://` con AMQP | Dónde se guardan los resultados de las tareas |
| `FXTRAD_TASK_ALWAYS_EAGER` | `false` | Ejecuta tareas síncronas (tests/CI sin broker) |
| `FXTRAD_DERIVED_TIMEFRAMES` | `1m,5m,15m,1h,4h,1d` | Timeframes a regenerar tras cada merge |
| `FXTRAD_CACHE_MAX_WINDOWS` | `8` | Ventanas de caché in-memory (LRU) |
| `FXTRAD_CACHE_MAX_CANDLES` | `200000` | Tope de velas por ventana cacheada |
| `LOG_JSON` | `false` | `true` emite logs JSON estructurados |
| `LOG_LEVEL` | `INFO` | Nivel mínimo (`DEBUG`…`ERROR`) |
| `SERVICE_NAME` | `fxtrad-backend` | Campo `service` del log |

### Frontend

| Variable | Default | Efecto |
|----------|---------|--------|
| `VITE_API_BASE_URL` | vacío | Base URL absoluta de la API (vacío = rutas relativas) |
| `VITE_PROXY_TARGET` | `http://localhost:8000` | Destino del proxy de Vite (en compose, `http://backend:8000`) |

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/assets` | Catálogo de activos guardados: `[{symbol, type, coverage_start, coverage_end, status}]` |
| `POST` | `/downloads` | Encola una descarga (`{asset, start, end}`) → `202 {task_id}` |
| `GET` | `/downloads` | Historial de descargas `[{date, active, range, status, rows}]` |
| `GET` | `/downloads/{task_id}` | Estado de una descarga (`encolada`/`exito`/`parcial`/`fallo`) y filas |
| `GET` | `/series` | Serie OHLC: `?symbol&timeframe&start&end` → `{symbol, timeframe, candles:[{time,open,high,low,close}]}` |

`timeframe` ∈ `1s, 1m, 5m, 15m, 1h, 4h, 1d`. Los timestamps son segundos UTC.

## Flujo de la interfaz

| Pantalla | Ruta | Función |
|----------|------|---------|
| SCR-001 Biblioteca | `#/assets` | Activos guardados con cobertura/estado; Graficar → SCR-003, Actualizar → SCR-002 |
| SCR-002 Descarga | `#/downloads` | Formulario de descarga + progreso asíncrono + historial |
| SCR-003 Abrir gráfico | `#/open` | Activo + periodo (validado contra la cobertura) + timeframe |
| SCR-004 Gráfico | `#/chart` | Velas, indicadores (MA/RSI/ATR), dibujos, compra/venta, exportar |
| SCR-005 Multigráfico | `#/multichart` | Hasta 3 paneles sincronizados |
| SCR-006 Exportar | `#/export` | Exportación PNG/WebP del gráfico + dibujos |

## Tareas (Make)

```bash
make lint     # ruff + black --check + mypy (backend) | eslint + tsc + prettier (frontend)
make format   # ruff --fix + black (backend) | prettier + eslint --fix (frontend)
make test     # pytest (backend) | vitest (frontend)
make build    # build de producción del frontend
make compose-up    # docker compose up --build (4 servicios + volumen data/)
make compose-down  # docker compose down
make benchmark-parquet  # benchmark de escritura Parquet (RNF-002, TASK-051)
```

Con venv de `uv` (sin Make):

```bash
cd backend
uv run --extra dev ruff check . && uv run --extra dev black --check . && uv run --extra dev mypy src
uv run --extra dev pytest
```

### Benchmark de escritura (RNF-002)

```bash
cd backend && PYTHONPATH=src uv run --extra dev python scripts/benchmark_parquet.py
# volumen completo de RNF-002 (~18M filas; ≈16 min y ~4 GB):
cd backend && PYTHONPATH=src uv run --extra dev python scripts/benchmark_parquet.py --rows 18000000
```

Mide `write`/`merge` y proyecta a ~18M filas. Referencia: **52,6 µs/vela**
(×11,4 sobre la línea base fila a fila de 600 µs/vela) con **KPI-4 = 0 duplicados**.

## Integración continua

`.github/workflows/ci.yml` corre en cada `push` y `pull_request` con dos jobs en
paralelo, reutilizando el Makefile (sin configuración duplicada):

- **backend**: `make lint-backend` + `make test-backend` (vía `uv`).
- **frontend**: `npm ci` + `make lint-frontend` + `make test-frontend` (Node 20).

> Requiere un remoto de GitHub para ejecutarse; en local se valida con
> `actionlint` y los mismos comandos.

## Calidad

- **Logging**: `structlog` con campos `timestamp`, `level`, `service`, `module`,
  `message` y `correlation_id`; JSON en prod (`LOG_JSON=true`), texto en dev.
  Cada request propaga `x-correlation-id` y cada tarea Celery correlaciona su
  `task_id` (ver `_docs/logging-contract.md`).
- **Tests**: comportamiento, patrón AAA, cobertura ≥80% en código nuevo.
- **Accesibilidad**: WCAG 2.1 AA, contraste por tokens, foco visible y escaneo
  `axe-core` en las pantallas (ADR-011).
- **Licencias**: todo OSS, sin componentes comerciales (`_docs/license-audit.md`).

## Documentación (SDD)

- Plan y KPIs: `_docs/plan.md` · Requisitos: `_docs/requirements.md`
- Arquitectura: `_docs/architecture.md` · Interfaces de módulos: `_docs/module-interfaces.md`
- Decisiones: `_docs/adr/` (ADR-001…ADR-011)
- UX: `_docs/ux/` (design-system, components, interaction-specs, accessibility, wireframes)
- Backlog, estado y trazabilidad: `_docs/backlog.md`, `_docs/status.md`, `_docs/traceability.md`
- Logging: `_docs/logging-contract.md` · Licencias: `_docs/license-audit.md`
- Smoke de escritorio: `frontend/smoke-test.md`

## Licencia

Software de uso personal compuesto íntegramente por dependencias de código
abierto. El inventario de licencias y la verificación de costo $0 (RNF-006)
están en `_docs/license-audit.md`.
