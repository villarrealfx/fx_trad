# fxtrad — Plataforma de análisis técnico (estilo TradingView)

Aplicación **personal y local** (RNF-005, RNF-006, RNF-007) para descargar datos
históricos de Dukascopy, almacenarlos como Parquet + DuckDB, resamplearlos a
timeframes de visualización y graficarlos como velas con indicadores, dibujos
(línea, rectángulo, Fibonacci, simulación de compra/venta y **referencia de
operación**) y exportación a imagen.

- **Costo $0**: 100% software de código abierto (ver `_docs/iterations/02-optimizacion-descarga/license-audit.md`).
- **Sin nube ni cuenta**: un único entorno local con Docker Compose.
- **Especificación primero (SDD)**: plan, requisitos, arquitectura, ADRs, UX,
  backlog y estado viven en `_docs/iterations/`; el código los materializa.

## Estado actual

| Iteración | Tareas | Requisitos IN | Estado |
|-----------|--------|---------------|--------|
| 01 — MVP (plataforma + visualización) | 66 / 66 | 29 / 29 | ✅ Cerrada |
| 02 — Optimización de descarga y base 1 m | 24 / 24 | 19 / 19 | ✅ Cerrada |
| 03 — Mejoras UX | 35 / 35 | 29 / 29 | ✅ Cerrada |
| 04 — Referencia de operación | 20 / 20 | 19 / 19 | ✅ Cerrada |

| Calidad | Valor |
|---------|-------|
| Backend | 546 tests ✅ + 2 skip · ruff · black · mypy |
| Frontend | 458 tests ✅ (55 archivos) · eslint · tsc · prettier · axe-core |
| Rendimiento | descarga 1 año 1 m = **309,9 s** (≤900 s) · escritura Parquet 726k = **52,1 µs/vela** · UI pan/zoom y edición **≥60 FPS** (`benchmark-ui.md`; frame budget con la operación activa en RNF-302, 0 frames caídos) |

Fuentes de verdad: `_docs/iterations/01-mvp/status.md`,
`_docs/iterations/02-optimizacion-descarga/status.md`,
`_docs/iterations/03-mejoras-ux/status.md` y `_docs/status.md`
(ciclo 04 cerrado; backlog, trazabilidad y cierre en `_docs/`).

### Qué cambió en la iteración 02

La iteración 01 no completaba ninguna descarga: el ingest pedía **ticks** y
fragmentaba el rango **hora a hora**. La iteración 02 reescribió el transporte:

- **Base canónica 1 m** (antes 1 s): `{symbol}.1m.parquet` + derivadas por
  resampling (`ADR-012`). La volumetría baja de ~18M a ~726k velas/activo.
- **Descarga por bloques ≤ 30.000 velas** con precálculo y **pacing de 20 s**
  sobre la API 1 m BID (`ADR-013`, `ADR-014`).
- **Tandas de 6–12 meses** con progreso y **reanudación** por rango restante
  (`ADR-015`).
- Celery/RabbitMQ se conservan (`ADR-016`).

### Qué cambió en la iteración 03 (Mejoras UX)

La base de datos ya era correcta; el cuello de botella pasó a la experiencia de
análisis. El ciclo 03 rediseña el Gráfico, la Descarga y Abrir (`ADR-017…021`):

- **Indicadores a petición**: ninguno por defecto; formulario flotante
  (mostrar/ocultar, configurar, eliminar) en el header (`ADR-019`).
- **Dibujos editables**: mover y redimensionar, con **deshacer/rehacer**
  (command stack) y paleta mate (`ADR-017`).
- **Configuración persistente** por activo+timeframe en `localStorage`
  versionado (activo, timeframe, indicadores, dibujos) (`ADR-018`).
- **Catálogo único** vía `GET /assets?scope=all` (se eliminó el espejo del
  frontend) y **5 pares forex nuevos** (GBPJPY, EURJPY, AUDUSD, USDCAD, EURGBP)
  (`ADR-021`).
- **Ejes** con hora:minuto y **5 decimales**; **fullscreen** vertical; marcas de
  compra/venta fuera de la vela; contrato `Timeframe` **sin `1s`** (`ADR-020`).

### Qué cambió en la iteración 04 (Referencia de operación)

El ciclo 03 dejó los dibujos editables; el 04 añade el dibujo que faltaba para
leer una operación de un vistazo: SL, Entrada y objetivos en **una sola figura**
(`ADR-022…025`).

- **Herramienta `◎` "Operación"** en el Gráfico y el Multigráfico: se crea con
  **2 clics** (Entrada y SL) y la dirección (larga/corta) se deduce de las anclas
  (`ADR-022`). `Shift` restringe el 2.º ancla a horizontal o vertical, como en la
  herramienta de línea (RF-210).
- **Cinco niveles derivados**: SL, Entrada y 3 objetivos (×1.382, ×1.5, ×2) con
  precio a **5 decimales**. Los objetivos se **derivan por proyección**, nunca se
  persisten; el nivel de cálculo 1:1 no se muestra (`ADR-022`).
- **En riesgo nulo** (`Entrada == SL`) los tres objetivos se ocultarían sobre la
  misma línea, así que el render muestra **solo SL y Entrada** y la región viva
  avisa *"R = 0"* (`ADR-024`).
- **Tokens propios** (`ADR-024`) con contraste verificado (5.61 / 16.56 / 6.53 : 1)
  y layout de etiquetas sin solape con línea guía (`ADR-025`).
- **Persistencia aditiva sin bump** (`ADR-023`): el documento v1 y su clave siguen
  igual; la operación se guarda como `{ id, from, to }` y convive con los dibujos
  previos, que se preservan.
- **Accesibilidad y rendimiento**: la creación se anuncia por región viva; mover o
  borrar también; el preview no se anuncia. 5 niveles O(1) por frame mantienen
  **≥60 FPS** con la figura activa (`ADR-017`, RNF-302).

## Stack

| Capa | Tecnología | ADR |
|------|------------|-----|
| Frontend | React 18 + Vite 5 + TypeScript 5 + `lightweight-charts` v4 (MIT) | ADR-003, ADR-005 |
| Backend | Python 3.12 + FastAPI + Uvicorn | ADR-002 |
| Descarga | `dukascopy-python` vía freeserv (`INTERVAL_MIN_1`, BID) | ADR-010, ADR-013, ADR-014 |
| ETL | pandas + DuckDB + Parquet por activo/timeframe | ADR-004, ADR-012 |
| Cola | Celery + RabbitMQ | ADR-006, ADR-016 |
| Caché | in-memory por ventana + Parquet columnar | ADR-007 |
| Observabilidad | `logging` + `structlog` (JSON en prod) | ADR-008 |
| Despliegue | Docker Compose (4 servicios + volumen `data/`) | ADR-009 |
| CI | GitHub Actions (lint + tests) | ADR-008 |

## Arquitectura

Monolito modular. Los módulos del backend exponen una interfaz pública
documentada y respetan direcciones de dependencia (ver
`_docs/iterations/01-mvp/module-interfaces.md`):

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
| `storage` | Persistencia Parquet `{symbol}.1m.parquet` + DuckDB, derivadas, incremental sin duplicados, metadatos, caché |
| `pipeline` | Limpieza, exclusión de mercado cerrado, resampling (desde 1 m), UTC, persistencia, indicadores |
| `ingest` | Catálogo, descarga 1 m por bloques ≤30k con pacing, tandas 6–12 m, reanudación, retry/backoff, tarea Celery |
| `api` | Endpoints REST (`/assets`, `/downloads`, `/downloads/{task_id}`, `/series`) |

El **worker** no es un directorio propio: es la imagen del backend
(`backend/Dockerfile`, stage `worker`) ejecutando Celery con RabbitMQ.

## Estructura del repositorio

```
fxtrad/
├── backend/                  # FastAPI + Celery + pipeline + storage (Python 3.12)
│   ├── src/fxtrad/           #   api · ingest · pipeline · storage · contracts · logging_config
│   ├── tests/                #   pytest (546 tests + 2 skip)
│   ├── scripts/              #   benchmark_parquet.py (RNF-102) · benchmark_download.py (RNF-101)
│   ├── Dockerfile            #   imagen multi-stage: api | worker
│   └── pyproject.toml        #   ruff · black · mypy · pytest (uv)
├── frontend/                 # SPA React 18 + Vite 5 + TS 5 + lightweight-charts
│   ├── src/                  #   components · charting · export · indicators · services
│   ├── Dockerfile            #   Vite dev con proxy a la API
│   ├── package.json          #   eslint · prettier · tsc · vitest (458 tests)
│   └── smoke-test.md         #   checklist de smoke de escritorio (RNF-005)
├── contracts/                # contrato OHLC canónico (JSON schema + md)
├── data/                     # Parquet + DuckDB locales (gitignored; volumen de compose)
├── docker-compose.yml        # 4 servicios: frontend, backend, worker, broker
├── docker-compose.worker.yml # RabbitMQ + worker (E2E de descarga)
├── _docs/                    # SDD: ciclo 04 cerrado (plan/requirements/architecture/ux/backlog/status/traceability) · iterations/01-mvp · 02-optimizacion-descarga · 03-mejoras-ux · adr/ (ADR-001…025) · glossary · logging-contract · license-audit
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
  (`VITE_PROXY_TARGET`), de modo que el navegador usa un **único origen** (sin CORS).

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
apuntar a otro backend, define `VITE_PROXY_TARGET`.

### Verificación rápida

1. `curl http://localhost:8000/assets` → `[]` (catálogo vacío).
2. Abre http://localhost:5173 y navega a **Biblioteca** → estado *empty*.
3. Descarga un activo (SCR-002, periodicidad base **1 minuto UTC**) y, al terminar,
   aparecerá en la biblioteca; desde ahí, **Graficar** abre SCR-003/SCR-004.

> **Limitación conocida (AR-1):** la API pública de Dukascopy puede responder
> `503`/timeout desde algunas IPs; el pacing de 20 s y el retry/backoff por bloque
> lo mitigan, pero el tramo de datos reales puede degradarse. El pipeline y los
> tests usan dobles, por lo que la suite no depende de la red.

---

## Variables de entorno

### Backend / worker

| Variable | Default | Efecto |
|----------|---------|--------|
| `FXTRAD_DATA_DIR` | `data` | Directorio de Parquet + `downloads.duckdb` |
| `FXTRAD_BROKER_URL` | `amqp://guest:guest@localhost:5672//` | Broker Celery (RabbitMQ) |
| `FXTRAD_RESULT_BACKEND` | `rpc://` con AMQP | Dónde se guardan los resultados de las tareas |
| `FXTRAD_TASK_ALWAYS_EAGER` | `false` | Ejecuta tareas síncronas (tests/CI sin broker) |
| `FXTRAD_DERIVED_TIMEFRAMES` | `5m,15m,1h,4h,1d` | Timeframes derivados a regenerar tras cada merge (la base 1 m no es derivado) |
| `FXTRAD_CACHE_MAX_WINDOWS` | `8` | Ventanas de caché in-memory (LRU) |
| `FXTRAD_CACHE_MAX_CANDLES` | `200000` | Tope de velas por ventana cacheada |
| `LOG_JSON` | `false` | `true` emite logs JSON estructurados |
| `LOG_LEVEL` | `INFO` | Nivel mínimo (`DEBUG`…`ERROR`) |
| `SERVICE_NAME` | `fxtrad-backend` | Campo `service` del log |
| `RUN_DUKASCOPY_INTEGRATION` | vacío | `1` habilita el benchmark de descarga real (red a Dukascopy) |

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

`timeframe` ∈ `1m, 5m, 15m, 1h, 4h, 1d` (la base es **1 m**, por defecto en
`/series`). Los timestamps son segundos UTC. El contrato `Timeframe` ya **no
incluye `1s`** (`ADR-020`); una petición con `1s` se rechaza con **422**.

## Flujo de la interfaz

| Pantalla | Ruta | Función |
|----------|------|---------|
| SCR-001 Biblioteca | `#/assets` | Activos guardados con cobertura/estado; Graficar → SCR-003, Actualizar → SCR-002 |
| SCR-002 Descarga | `#/downloads` | Formulario de descarga (nota base **1 minuto UTC**) + progreso asíncrono + historial |
| SCR-003 Abrir gráfico | `#/open` | Activo + periodo (validado contra la cobertura) + timeframe |
| SCR-004 Gráfico | `#/chart` | Velas, indicadores (MA/RSI/ATR), dibujos (línea, rectángulo, Fibonacci, compra/venta, **operación `◎`**), exportar |
| SCR-005 Multigráfico | `#/multichart` | Hasta 3 paneles sincronizados (la herramienta `◎` opera pane a pane) |
| SCR-006 Exportar | `#/export` | Exportación PNG/WebP del gráfico + dibujos |

## Tareas (Make)

```bash
make lint     # ruff + black --check + mypy (backend) | eslint + tsc + prettier (frontend)
make format   # ruff --fix + black (backend) | prettier + eslint --fix (frontend)
make test     # pytest (backend) | vitest (frontend)
make build    # build de producción del frontend
make compose-up    # docker compose up --build (4 servicios + volumen data/)
make compose-down  # docker compose down
make benchmark-parquet  # benchmark de escritura Parquet (RNF-102)
```

Con venv de `uv` (sin Make):

```bash
cd backend
uv run --extra dev ruff check . && uv run --extra dev black --check . && uv run --extra dev mypy src
uv run --extra dev pytest
```

### Benchmarks

**Escritura Parquet (RNF-102)** — 726.000 velas (2 años @ 1 m):

```bash
cd backend && PYTHONPATH=src uv run --extra dev python scripts/benchmark_parquet.py
# o un volumen concreto:
cd backend && PYTHONPATH=src uv run --extra dev python scripts/benchmark_parquet.py --rows 200000
```

Mide `write`/`merge` y proyecta a ~726k filas. Referencia: **52,1 µs/vela**
(×11,5 sobre la línea base fila a fila de 600 µs/vela) con **KPI-4 = 0 duplicados**.

**Descarga real (RNF-101)** — 1 año @ 1 m contra Dukascopy (opt-in, red real):

```bash
cd backend && RUN_DUKASCOPY_INTEGRATION=1 PYTHONPATH=src \
  uv run --extra dev python scripts/benchmark_download.py EURUSD 2025-01-01 2025-12-31
```

Referencia medida: **309,9 s** para 1 año (objetivo ≤900 s; ver
`_docs/iterations/02-optimizacion-descarga/benchmark-download.md`).

## Integración continua

`.github/workflows/ci.yml` corre en cada `push` y `pull_request` con dos jobs en
paralelo, reutilizando el Makefile:

- **backend**: `make lint-backend` + `make test-backend` (vía `uv`).
- **frontend**: `npm ci` + `make lint-frontend` + `make test-frontend` (Node 20).

## Calidad

- **Logging**: `structlog` con campos `timestamp`, `level`, `service`, `module`,
  `message` y `correlation_id`; JSON en prod (`LOG_JSON=true`), texto en dev.
  Cada request propaga `x-correlation-id` y cada tarea Celery correlaciona su
  `task_id` (ver `_docs/logging-contract.md`).
- **Tests**: comportamiento, patrón AAA, cobertura ≥80% en código nuevo.
- **Accesibilidad**: WCAG 2.1 AA, contraste por tokens, foco visible y escaneo
  `axe-core` en las pantallas (ADR-011).
- **Licencias**: todo OSS, sin componentes comerciales
  (`_docs/iterations/02-optimizacion-descarga/license-audit.md`).

## Documentación (SDD)

- **Iteración 01 (MVP):** `_docs/iterations/01-mvp/` (plan, requirements,
  architecture, ux/, backlog, status, traceability, module-interfaces, _cierre).
- **Iteración 02 (Optimización y base 1 m):**
  `_docs/iterations/02-optimizacion-descarga/` (plan, requirements, architecture,
  adr/ADR-012…016, backlog, status, traceability, benchmark-download, license-audit, _cierre).
- **Iteración 03 (Mejoras UX, cerrada):** histórico en
  `_docs/iterations/03-mejoras-ux/` (plan, requirements, architecture,
  adr/ADR-017…021, ux/, backlog, status, traceability, `benchmark-ui.md`, _cierre).
- **Iteración 04 (Referencia de operación, cerrada):** raíz `_docs/` (plan,
  requirements, architecture, adr/ADR-022…025, ux/, backlog, backlog-graph.mmd,
  status, traceability).
- **Transversal:** `_docs/adr/` (ADR-001…025) · `_docs/glossary.md` ·
  `_docs/logging-contract.md` · `_docs/license-audit.md`.
- **Smoke de escritorio:** `frontend/smoke-test.md`.

## Licencia

Software de uso personal compuesto íntegramente por dependencias de código
abierto. El inventario de licencias y la verificación de costo $0 (RNF-006) están
en `_docs/iterations/02-optimizacion-descarga/license-audit.md`.
