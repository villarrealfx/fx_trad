# ADR-016: Conservar Celery/RabbitMQ para la descarga

- **Fecha:** 2026-09-28
- **Estado:** Aceptado
- **Decisores:** Arquitecto, usuario (propietario)
- **Requisitos vinculados:** RF-104, RNF-007, RX-001
- **Relacionado:** ADR-006 (cola Celery/RabbitMQ), ADR-015

## Contexto

La optimización de descarga plantea si la cola Celery/RabbitMQ aporta o resta a la
eficiencia. Hechos:

- **Celery no afecta al tiempo de descarga**: el overhead es de milisegundos por
  tarea; el cuello de botella estaba en `ingest` (ticks + fragmentación horaria).
- Celery **sí añade complejidad operativa** (RabbitMQ + worker + polling de
  `GET /downloads/{task_id}`) que, para un usuario único sin concurrencia real, no
  aporta escala.
- Retirarlo obligaría a tocar API, `docker-compose`, ADR-006, `tasks.py`, tests y el
  frontend (polling), aumentando la superficie de cambio.

El usuario priorizó **mínimo riesgo** (D-4).

## Decisión

Se **conserva** Celery/RabbitMQ (ADR-006) como mecanismo de ejecución de descargas.
Esta iteración solo modifica el núcleo de `ingest` (ADR-012, ADR-013); no se toca la
orquestación.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Conservar Celery (elegida) | Cambio mínimo, menor riesgo, ya probado (01-mvp) | Mantiene RabbitMQ/worker | — (elegida) |
| Descarga síncrona en el endpoint | Menos infra | Bloquea la request minutos; toca API, compose, frontend y tests | Riesgo y alcance altos (RNF-007) |
| `BackgroundTasks` de FastAPI | Sin RabbitMQ | Pierde estado/reintentos y el contrato `GET /downloads` | Menos robusto que la cola actual |

## Consecuencias

### Positivas
- Cambio acotado a `ingest`+base; el MVP existente no se altera fuera de eso.
- Se conservan estado por tarea, reintentos y correlación de logs (ADR-008).

### Negativas / Trade-offs
- Se mantiene la infraestructura y el polling, innecesarios para un usuario único.
- La reanudación por tanda (ADR-015) depende de la cola.

### Neutras
- Celery sigue siendo OSS ($0, RNF-006) y ya está en la auditoría de licencias.

## Referencias

- `_docs/iterations/02-optimizacion-descarga/plan.md` §3, §6 (D-4)
- `_docs/iterations/02-optimizacion-descarga/requirements.md` RF-104
- `_docs/iterations/01-mvp/adr/ADR-006-cola-celery-rabbitmq.md`
