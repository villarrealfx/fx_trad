# Monorepo fxtrad — tareas de lint/formato/test (TASK-037)
#
# Orquesta backend (Python: uv + ruff/black/mypy/pytest) y frontend
# (Node: npm + eslint/prettier/tsc/vitest). El worker es la imagen del backend
# con Celery (ADR-006/ADR-009), por lo que comparte el tooling de backend.
#
# `UV` incluye `--extra dev` para que `uv run` instale también las dependencias
# de desarrollo (pytest/black/mypy) en un entorno limpio, como el de CI
# (TASK-039); en local no cambia nada si ya están instaladas.

BACKEND := backend
FRONTEND := frontend
UV := uv run --extra dev

.PHONY: help lint lint-backend lint-frontend format format-backend format-frontend test test-backend test-frontend build compose-up compose-down benchmark-parquet

help:
	@echo "Targets disponibles:"
	@echo "  make lint    # ruff + black --check + mypy (backend) | eslint + tsc + prettier (frontend)"
	@echo "  make format  # ruff --fix + black (backend) | prettier + eslint --fix (frontend)"
	@echo "  make test    # pytest (backend) | vitest (frontend)"
	@echo "  make build   # build de producción del frontend"
	@echo "  make compose-up    # docker compose up --build (4 servicios + volumen data/)"
	@echo "  make compose-down  # docker compose down"
	@echo "  make benchmark-parquet  # benchmark de escritura Parquet (RNF-102, TASK-066)"

lint: lint-backend lint-frontend

lint-backend:
	cd $(BACKEND) && $(UV) ruff check . && $(UV) black --check . && $(UV) mypy src

lint-frontend:
	cd $(FRONTEND) && npm run lint && npm run typecheck && npm run format:check

format: format-backend format-frontend

format-backend:
	cd $(BACKEND) && $(UV) ruff check --fix . && $(UV) black .

format-frontend:
	cd $(FRONTEND) && npm run format && npm run lint:fix

test: test-backend test-frontend

test-backend:
	cd $(BACKEND) && $(UV) pytest

test-frontend:
	cd $(FRONTEND) && npm test

build:
	cd $(FRONTEND) && npm run build

compose-up:
	docker compose up --build

compose-down:
	docker compose down

benchmark-parquet:
	cd $(BACKEND) && PYTHONPATH=src $(UV) python scripts/benchmark_parquet.py
