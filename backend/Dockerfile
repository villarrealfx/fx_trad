# Imagen del backend y del worker Celery (TASK-038, ADR-002/ADR-006/ADR-009).
#
# Una sola base con las dependencias de runtime: el target `api` ejecuta Uvicorn
# y `worker` ejecuta Celery; el compose elige el stage y publica los puertos. El
# volumen `data/` (Parquet + DuckDB) se monta en ejecución vía `FXTRAD_DATA_DIR`,
# nunca se hornea en la imagen.
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/src

WORKDIR /app

# Dependencias de runtime declaradas en `pyproject.toml`. Se instalan aquí en
# lugar de `pip install .` porque el proyecto no declara backend de build.
COPY pyproject.toml ./
RUN pip install \
    "celery[amqp]>=5,<6" \
    "duckdb>=1,<2" \
    "dukascopy-python>=4.0.1,<5" \
    "fastapi>=0.110,<1" \
    "pydantic>=2.6,<3" \
    "structlog>=24,<26" \
    "uvicorn>=0.29,<1"

COPY src ./src

EXPOSE 8000

FROM base AS api

CMD ["uvicorn", "--factory", "fxtrad.api.app:create_default_app", "--host", "0.0.0.0", "--port", "8000"]

FROM base AS worker

CMD ["celery", "-A", "fxtrad.ingest.tasks:celery_app", "worker", "--loglevel=info"]
