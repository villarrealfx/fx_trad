# Contrato de Logging

> Fuente: `_docs/adr/ADR-008-observabilidad-y-cicd.md`
> Alcance inicial: backend (Python). Si el frontend llega a emitir logs propios, requerirá ADR que lo defina antes de agregarlo.

## Niveles

```
TRACE < DEBUG < INFO < WARN < ERROR < FATAL
```

## Formato

- **Dev:** texto legible con colores (configuración local).
- **Prod:** JSON estructurado, una línea por evento (configuración por entorno; en el MVP local se activa con variable de entorno `LOG_JSON=true`).

## Campos obligatorios en prod

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `timestamp` | ISO 8601 UTC | `2025-01-15T10:23:45.123Z` |
| `level` | Nivel del evento | `INFO` |
| `service` | Nombre del servicio | `fxtrad-backend` |
| `module` | Módulo del punto de emisión | `fxtrad.ingest.tasks` |
| `correlation_id` | ID de traza (request o tarea Celery) | `abc-123` |
| `message` | Mensaje en español | `"Descarga completada"` |
| `context` | Objeto con datos extra del evento | `{"activo": "EURUSD"}` |

## Reglas

- Mensajes de negocio en **español**.
- Nombres de campo en **inglés**.
- **NUNCA** loguear PII sin enmascarar. (No hay PII por diseño en este sistema; precaución con símbolos de activos y rutas locales.)
- **NUNCA** `print()` / `console.log()` en código de producción.
- Cada request HTTP debe propagar `correlation_id`; cada tarea Celery debe registrar su `task_id` como correlación.
- Los mensajes de error en español no deben exponer stack traces completos en logs INFO; usar nivel `ERROR` para el evento y `DEBUG` para el stack trace.
- Todo módulo debe obtener su logger como `structlog.get_logger()` al importar.

## Implementación por lenguaje

### Python (structlog)

Configuración única al arrancar en `fxtrad.logging_config` (TASK-041): la API la
aplica en `create_default_app()` y el worker al importar `fxtrad.ingest.tasks`.
`configure_logging()` fija ``renderer`` (JSON en prod, texto en dev), nivel,
``service`` y añade ``timestamp``/``module``; `connect_celery_signals()` bindea
el ``task_id`` en cada tarea. Variables: `LOG_JSON`, `LOG_LEVEL`, `SERVICE_NAME`.

```python
import structlog

logger = structlog.get_logger()

logger.info("descarga_completada", activo="EURUSD", filas=1250000)
logger.warning("imputacion_aplicada", activo="EURUSD", filas_afectadas=12)
logger.error(
    "fallo_descarga",
    activo="EURUSD",
    error="timeout",
    exc_info=True,
)
```

Nivel por defecto: `INFO`. Se ajusta con la variable de entorno `LOG_LEVEL` (`DEBUG`, `INFO`, `WARN`, `ERROR`).
La salida JSON se activa con `LOG_JSON=true` (por defecto, texto legible en dev).

## Cobertura esperada

- Módulo `ingest`: `descarga_iniciada`, `descarga_completada`, `reintento`, `fallo_descarga`.
- Módulo `pipeline`: `serie_limpia`, `resampling_aplicado`, `imputacion_aplicada`, `indicadores_calculados`.
- Módulo `api`: eventos de request con `correlation_id`.
- Módulo `storage`: `parquet_escrito`, `consulta_duckdb`.