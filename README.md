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
│   ├── Dockerfile.worker    #   imagen del worker (misma base que el backend)
│   └── pyproject.toml       #   ruff · black · mypy · pytest (uv)
├── frontend/                # SPA React 18 + Vite 5 + TS 5 + lightweight-charts
│   ├── src/                 #   AppShell, ChartPane, charting, export, indicators, ui
│   ├── package.json         #   eslint · prettier · tsc · vitest
│   └── smoke-test.md        #   checklist de smoke de escritorio (RNF-005)
├── contracts/               # contrato OHLC canónico (JSON schema + md)
├── docker-compose.worker.yml# RabbitMQ + worker Celery (dev)
├── _docs/                   # plan, requirements, architecture, adr/, ux/, backlog…
├── Makefile                 # lint · format · test · build
└── .editorconfig
```

El **worker** no es un directorio propio: es el backend ejecutando Celery con
RabbitMQ como broker (ADR-006, ADR-009) mediante `backend/Dockerfile.worker`.

## Requisitos

- Python 3.12 y [`uv`](https://docs.astral.sh/uv/)
- Node 20+ y `npm`
- (Opcional) Docker para el broker/worker

## Tareas (Make)

```bash
make lint     # ruff + black --check + mypy (backend) | eslint + tsc + prettier (frontend)
make format   # ruff --fix + black (backend) | prettier + eslint --fix (frontend)
make test     # pytest (backend) | vitest (frontend)
make build    # build de producción del frontend
```

## Desarrollo

```bash
# Backend (API en http://localhost:8000)
cd backend && uv run uvicorn --factory fxtrad.api.app:create_app  # (según entrypoint)

# Frontend (http://localhost:5173, proxy /series → :8000)
cd frontend && npm run dev
```

## Documentación

- `_docs/plan.md`, `_docs/requirements.md`, `_docs/architecture.md`
- ADRs en `_docs/adr/`
- UX en `_docs/ux/` · Backlog y estado en `_docs/backlog.md`, `_docs/status.md`
- Smoke de escritorio: `frontend/smoke-test.md`
