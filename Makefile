# Monorepo fxtrad — tareas de lint/formato/test (TASK-037)
#
# Orquesta backend (Python: uv + ruff/black/mypy/pytest) y frontend
# (Node: npm + eslint/prettier/tsc/vitest). El worker es la imagen del backend
# con Celery (ADR-006/ADR-009), por lo que comparte el tooling de backend.

BACKEND := backend
FRONTEND := frontend

.PHONY: help lint lint-backend lint-frontend format format-backend format-frontend test test-backend test-frontend build

help:
	@echo "Targets disponibles:"
	@echo "  make lint    # ruff + black --check + mypy (backend) | eslint + tsc + prettier (frontend)"
	@echo "  make format  # ruff --fix + black (backend) | prettier + eslint --fix (frontend)"
	@echo "  make test    # pytest (backend) | vitest (frontend)"
	@echo "  make build   # build de producción del frontend"

lint: lint-backend lint-frontend

lint-backend:
	cd $(BACKEND) && uv run ruff check . && uv run black --check . && uv run mypy src

lint-frontend:
	cd $(FRONTEND) && npm run lint && npm run typecheck && npm run format:check

format: format-backend format-frontend

format-backend:
	cd $(BACKEND) && uv run ruff check --fix . && uv run black .

format-frontend:
	cd $(FRONTEND) && npm run format && npm run lint:fix

test: test-backend test-frontend

test-backend:
	cd $(BACKEND) && uv run pytest

test-frontend:
	cd $(FRONTEND) && npm test

build:
	cd $(FRONTEND) && npm run build
