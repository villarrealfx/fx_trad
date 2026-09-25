# Auditoría de licencias OSS ($0)

> **Tarea:** TASK-040 · **Requisito:** RNF-006 (costo total $0, solo software de código abierto)
> **ADRs:** ADR-008 (observabilidad/CI sin SaaS), ADR-009 (despliegue local con Docker Compose)
> **Fecha:** 2026-09-25 · **Alcance:** stack del MVP local (backend, frontend, infraestructura y tooling)

## 1. Objetivo y alcance

Verificar que el stack no incluye **componentes comerciales ni de pago** y que todas
las dependencias son software de código abierto. El alcance cubre las dependencias
directas y transitivas realmente instaladas en el backend (entorno `uv`) y en el
frontend (`node_modules`), más las imágenes base y herramientas de infraestructura.

RNF-006 exige que, auditadas las licencias, **no existan componentes comerciales**.
El criterio adoptado: toda licencia debe ser OSI-aprobada y sin costo; se revisan de
forma explícita las copyleft y las licencias no estándar.

## 2. Metodología

La extracción se hizo sobre los artefactos instalados (no a mano). Backend: metadata
PEP 621/639 de cada distribución (`importlib.metadata`); frontend: campo `license` del
`package.json` de cada paquete instalado. El inventario completo (50
paquetes backend y 310 frontend únicos) es reproducible con esos
recuentos; aquí se listan las dependencias directas y la distribución del total.

## 3. Inventario

### 3.1 Backend — dependencias (50 paquetes)

| Paquete | Versión | Licencia | Directa |
|---------|---------|----------|---------|
| `amqp` | 5.3.1 | BSD License | — |
| `annotated-doc` | 0.0.5 | MIT | — |
| `annotated-types` | 0.8.0 | MIT | — |
| `anyio` | 4.15.1 | MIT | — |
| `billiard` | 4.3.0 | BSD License | — |
| `black` | 24.10.0 | MIT License | Sí |
| `celery` | 5.6.3 | BSD-3-Clause | Sí |
| `certifi` | 2026.7.22 | Mozilla Public License 2.0 (MPL 2.0) | — |
| `charset-normalizer` | 3.5.1 | MIT | — |
| `click` | 8.5.0 | BSD-3-Clause | — |
| `click-didyoumean` | 0.3.1 | MIT License | — |
| `click-plugins` | 1.1.1.2 | BSD License | — |
| `click-repl` | 0.4.0 | MIT | — |
| `duckdb` | 1.5.5 | MIT License | Sí |
| `dukascopy-python` | 4.0.1 | MIT License | Sí |
| `fastapi` | 0.141.1 | MIT | Sí |
| `h11` | 0.16.0 | MIT License | — |
| `httpcore` | 1.0.9 | BSD-3-Clause | — |
| `httpx` | 0.28.1 | BSD License | Sí |
| `idna` | 3.20 | BSD-3-Clause | — |
| `iniconfig` | 2.3.0 | MIT | — |
| `kombu` | 5.6.2 | BSD-3-Clause | — |
| `librt` | 0.15.0 | MIT | — |
| `mypy` | 1.20.2 | MIT | Sí |
| `mypy_extensions` | 1.1.0 | MIT | — |
| `numpy` | 2.5.3 | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 | — |
| `packaging` | 26.3 | Apache-2.0 OR BSD-2-Clause | — |
| `pandas` | 3.0.6 | BSD License | — |
| `pathspec` | 1.1.1 | Mozilla Public License 2.0 (MPL 2.0) | — |
| `platformdirs` | 4.11.10 | MIT | — |
| `pluggy` | 1.6.0 | MIT License | — |
| `prompt_toolkit` | 3.0.53 | BSD License | — |
| `pydantic` | 2.13.5 | MIT | Sí |
| `pydantic_core` | 2.46.5 | MIT | — |
| `Pygments` | 2.21.0 | BSD-2-Clause | — |
| `pytest` | 8.4.2 | MIT License | Sí |
| `python-dateutil` | 2.9.0.post0 | BSD License; Apache Software License | — |
| `requests` | 2.34.2 | Apache Software License | — |
| `ruff` | 0.16.8 | MIT | Sí |
| `six` | 1.17.0 | MIT License | — |
| `starlette` | 1.6.0 | BSD-3-Clause | — |
| `structlog` | 25.5.0 | MIT OR Apache-2.0 | Sí |
| `typing-inspection` | 0.4.4 | MIT | — |
| `typing_extensions` | 4.16.0 | PSF-2.0 | — |
| `tzdata` | 2026.4 | Apache-2.0 | — |
| `tzlocal` | 5.4.4 | MIT | — |
| `urllib3` | 2.8.0 | MIT | — |
| `uvicorn` | 0.53.0 | BSD-3-Clause | Sí |
| `vine` | 5.1.0 | BSD License | — |
| `wcwidth` | 0.8.4 | MIT | — |

### 3.2 Frontend — dependencias directas

| Paquete | Versión | Licencia |
|---------|---------|----------|
| `@testing-library/dom` | 10.4.2 | MIT |
| `@testing-library/react` | 16.3.3 | MIT |
| `@types/node` | 22.20.3 | MIT |
| `@types/react` | 18.3.31 | MIT |
| `@types/react-dom` | 18.3.7 | MIT |
| `@typescript-eslint/eslint-plugin` | 8.70.1 | MIT |
| `@typescript-eslint/parser` | 8.70.1 | MIT |
| `@vitejs/plugin-react` | 4.7.0 | MIT |
| `@vitest/coverage-v8` | 2.1.9 | MIT |
| `axe-core` | 4.13.0 | MPL-2.0 |
| `eslint` | 8.57.1 | MIT |
| `eslint-plugin-react-hooks` | 4.6.2 | MIT |
| `eslint-plugin-react-refresh` | 0.4.26 | MIT |
| `jsdom` | 24.1.3 | MIT |
| `lightweight-charts` | 4.2.3 | Apache-2.0 |
| `prettier` | 3.9.8 | MIT |
| `react` | 18.3.1 | MIT |
| `react-dom` | 18.3.1 | MIT |
| `typescript` | 5.9.3 | Apache-2.0 |
| `vite` | 5.4.21 | MIT |
| `vitest` | 2.1.9 | MIT |

### 3.3 Frontend — distribución de licencias (310 paquetes únicos)

| Licencia | Paquetes |
|----------|----------|
| MIT | 249 |
| ISC | 25 |
| Apache-2.0 | 11 |
| BSD-3-Clause | 8 |
| BSD-2-Clause | 8 |
| BlueOak-1.0.0 | 4 |
| MIT-0 | 1 |
| Python-2.0 | 1 |
| MPL-2.0 | 1 |
| CC-BY-4.0 | 1 |
| (MIT OR CC0-1.0) | 1 |

### 3.4 Infraestructura y herramientas

| Componente | Versión/imagen | Licencia | Uso |
|------------|----------------|----------|-----|
| Python | 3.12 | PSF-2.0 | Runtime backend y worker |
| Node.js | 20 (LTS) | MIT | Build/dev del frontend |
| npm | incluido en Node | Artistic-2.0 | Gestor de paquetes |
| RabbitMQ (broker) | `rabbitmq:3-management` | MPL-2.0 | Cola Celery (ADR-006/ADR-009) |
| Erlang/OTP (runtime RabbitMQ) | incluido en la imagen | Apache-2.0 | Runtime del broker |
| Docker Engine / CLI | 29.x | Apache-2.0 | Contenedores locales (ADR-009) |
| Docker Compose | v5.x | Apache-2.0 | Orquestación local |
| GitHub Actions | hosted runners | Plataforma (gratuita en repos públicos) | CI (ADR-008, TASK-039) |
| uv | 0.12 | MIT / Apache-2.0 | Gestión de entorno Python |
| GNU Make | 4.x | GPL-3.0 | Automatización (Makefile) |
| git | 2.x | GPL-2.0 | Control de versiones |

## 4. Chequeo de denylist

Búsqueda de licencias no permisivas o de pago (GPL, AGPL, LGPL, SSPL, CDDL,
`UNLICENSED`, propietaria/comercial) sobre los 360 paquetes auditados:

- **Coincidencias: 0** — ninguna.

| Categoría | Backend | Frontend |
|-----------|---------|----------|
| Permisiva (OSI, sin costo) | 48 | 309 |
| Copyleft débil (MPL-2.0) | 2 | 1 |
| Copyleft fuerte | 0 | 0 |

MPL-2.0 (certifi, pathspec y un paquete de frontend) es copyleft **débil**: obliga a
publicar cambios únicamente de los ficheros modificados de esos paquetes, no del
código propio enlazado, y no tiene costo. Compatible con RNF-006.

## 5. Componentes comerciales descartados por diseño

| Componente | Motivo del descarte | Alternativa OSS adoptada |
|------------|---------------------|--------------------------|
| Docker Desktop | Licencia comercial en empresas grandes | Docker Engine/CLI (Apache-2.0) |
| TradingView (charting hosted) | Servicio de pago | `lightweight-charts` (Apache-2.0, self-hosted) |
| Sentry / APM SaaS | Costo/licencias | `logging` + `structlog` (ADR-008) |
| GitHub Copilot / Advanced Security | Funciones de pago | No se usan |
| Cloud hosting (VPS/PaaS) | Costo y datos en terceros | Docker Compose local (ADR-009) |
| Bases de datos gestionadas | Costo | Parquet + DuckDB (ADR-004) |

> La fuente de datos Dukascopy se consume mediante la librería `dukascopy-python`
> (MIT); los datos de mercado públicos no constituyen un componente de software con
> licencia comercial.

## 6. Observaciones y riesgos

- **GPL en herramientas** (GNU Make, git): software libre sin costo, usado solo en
  desarrollo/CI; no se enlaza ni se distribuye con la aplicación.
- **Docker Desktop**: su licencia comercial no aplica al flujo actual (Engine/CLI).
- **GitHub Actions**: gratuito para repositorios públicos; sin costo para el uso previsto.
- **MPL-2.0**: copyleft débil; se documenta y no impone coste.
- La auditoría refleja el árbol **instalado**; un cambio de versión puede introducir
  nuevas licencias y debe re-auditarse con la metodología de §2.

## 7. Conclusión

El inventario del stack (backend, frontend e infraestructura) **no contiene
componentes comerciales ni de pago**: 357 paquetes son permisivos
OSI y 3 son MPL-2.0 (copyleft débil, sin costo). El chequeo de
denylist no arroja coincidencias de copyleft fuerte ni de licencia propietaria.
**RNF-006 se cumple**: el coste total del software es $0.
