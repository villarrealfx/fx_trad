# fxtrad — Plataforma de análisis técnico (estilo TradingView)

Monorepo de uso personal local (RNF-005, RNF-006, RNF-007). La especificación
vive en `_docs/` (pipeline SDD); este README describe la **estructura** y las
**tareas de tooling**.

## Estructura

```
fxtrad/
├── backend/                 # FastAPI + Celery + pipeline + storage (Python 3.12)
│   ├── src/fxtrad/          #   módulos: ingest, pipeline, storage, api, contracts
│   ├── tests/               #   pytest
│   ├── Dockerfile           #   imagen del backend y del worker (multi-stage)
│   └── pyproject.toml       #   ruff · black · mypy · pytest (uv)
├── frontend/                # SPA React 18 + Vite 5 + TS 5 + lightweight-charts
│   ├── src/                 #   AppShell, ChartPane, charting, export, indicators, ui
│   ├── package.json         #   eslint · prettier · tsc · vitest
│   ├── Dockerfile           #   Vite dev con proxy a la API (compose)
│   └── smoke-test.md        #   checklist de smoke de escritorio (RNF-005)
├── contracts/               # contrato OHLC canónico (JSON schema + md)
├── docker-compose.yml       # 4 servicios: frontend, backend, worker, broker (TASK-038)
├── docker-compose.worker.yml# RabbitMQ + worker Celery (E2E dev)
├── _docs/                   # plan, requirements, architecture, adr/, ux/, backlog…
├── Makefile                 # lint · format · test · build · compose
└── .editorconfig
```

El **worker** no es un directorio propio: es la misma imagen del backend
(`backend/Dockerfile`, stage `worker`) ejecutando Celery con RabbitMQ como broker
(ADR-006, ADR-009).

## Requisitos

- Python 3.12 y [`uv`](https://docs.astral.sh/uv/)
- Node 20+ y `npm`
- Docker y Docker Compose (opcional, para levantar el stack completo)

## Tareas (Make)

```bash
make lint     # ruff + black --check + mypy (backend) | eslint + tsc + prettier (frontend)
make format   # ruff --fix + black (backend) | prettier + eslint --fix (frontend)
make test     # pytest (backend) | vitest (frontend)
make build    # build de producción del frontend
make compose-up    # docker compose up --build (4 servicios + volumen data/)
make compose-down  # docker compose down
```

## Desarrollo

```bash
# Backend (API en http://localhost:8000)
cd backend && uv run uvicorn --factory fxtrad.api.app:create_default_app --port 8000

# Frontend (http://localhost:5173, proxy /series → :8000)
cd frontend && npm run dev
```

## Stack completo con Docker Compose (TASK-038)

```bash
docker compose up --build     # frontend :5173 · backend :8000 · worker · RabbitMQ :5672/:15672
docker compose down
```

El volumen `./data` se monta en `/app/data` de `backend` y `worker` (Parquet +
DuckDB). El frontend proxya `/series`, `/downloads` y `/assets` al servicio
`backend`, de modo que el navegador usa un único origen (sin CORS).

## Integración continua (TASK-039)

`.github/workflows/ci.yml` corre en cada `push` y `pull_request` con dos jobs en
paralelo: **backend** (`make lint-backend` + `make test-backend`, vía `uv`) y
**frontend** (`npm ci` + `make lint-frontend` + `make test-frontend`, Node 20).
Usa los mismos comandos que `make`, sin configuración duplicada.

## Documentación

- `_docs/plan.md`, `_docs/requirements.md`, `_docs/architecture.md`
- ADRs en `_docs/adr/`
- UX en `_docs/ux/` · Backlog y estado en `_docs/backlog.md`, `_docs/status.md`
- Smoke de escritorio: `frontend/smoke-test.md`
