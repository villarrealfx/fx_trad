# Auditoría de licencias OSS — Iteración 02 ($0)

> **Tarea:** TASK-072 · **Requisito:** RNF-006 (costo total $0, solo software de código abierto)
> **Fecha:** 2026-09-28 · **Alcance:** stack del backend (entorno `uv`) y del frontend (`node_modules`)
> **Precede:** `_docs/iterations/01-mvp/license-audit.md` (TASK-040)

## 1. Objetivo

Reverificar que la iteración 02 **no introdujo dependencias nuevas** ni componentes
comerciales: la optimización de descarga y el cambio de base 1 m se implementaron con
el stack existente (no se añadió ninguna librería). RNF-006 se cumple si la denylist
de copyleft fuerte/propietaria queda en 0.

## 2. Metodología (reproducible)

- **Backend:** metadata PEP 621/639 de cada distribución instalada
  (`importlib.metadata.distributions()`), con los clasificadores `License ::` como
  respaldo cuando el campo `License` viene vacío.
- **Frontend:** campo `license` del `package.json` de cada paquete instalado en
  `node_modules` (incluye anidados).
- **Denylist:** se marcan como bloqueantes `GPL`, `AGPL`, `SSPL`, `BUSL`,
  `PROPRIETARY` y `COMMERCIAL` (se excluye `LGPL`, débil y sin coste).

## 3. Resultado

| Entorno | Paquetes (directos + transitivos) | Denylist |
|---------|-----------------------------------|----------|
| Backend (`uv`, Python 3.12) | 50 | **0** |
| Frontend (`node_modules`) | 310 únicos | **0** |

Sin cambios respecto a la auditoría del MVP (50 backend · 310 frontend): **no se
añadieron dependencias** en esta iteración.

## 4. Dependencias directas

### 4.1 Backend (`backend/pyproject.toml`)

| Paquete | Versión | Licencia |
|---------|---------|----------|
| `celery[amqp]` | 5.6.3 | BSD-3-Clause |
| `duckdb` | 1.5.5 | MIT |
| `dukascopy-python` | 4.0.1 | MIT |
| `fastapi` | 0.141.1 | MIT |
| `pydantic` | 2.13.5 | MIT |
| `structlog` | 25.5.0 | MIT |
| `uvicorn` | 0.53.0 | BSD-3-Clause |
| `pandas` (transitiva de `dukascopy-python`) | 3.0.6 | BSD |

Dev: `httpx` (BSD-3-Clause), `pytest` (MIT), `ruff` (MIT), `black` (MIT),
`mypy` (MIT).

### 4.2 Frontend (`frontend/package.json`)

Runtime: `lightweight-charts` (Apache-2.0), `react` y `react-dom` (MIT).
Dev/build: `vite`, `vitest`, `typescript`, `eslint`, `prettier`,
`@testing-library/*`, `jsdom`, `axe-core`, `@vitest/coverage-v8` — todas MIT/BSD/Apache.

### 4.3 Infraestructura

Docker Compose + imágenes base oficiales `python` (PSF) y `node` (MIT);
RabbitMQ (MPL-2.0). Sin servicios de pago ni SaaS (ADR-008/ADR-009).

## 5. Conclusión

**RNF-006 cumplido:** costo total $0, 0 componentes comerciales y 0 copyleft fuerte.
La iteración 02 no introdujo dependencias nuevas.
