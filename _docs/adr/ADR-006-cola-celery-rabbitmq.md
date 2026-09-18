# ADR-006: Cola de descargas con Celery + RabbitMQ

- **Fecha:** 2026-09-17
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RF-001, RF-002, RX-001, RNF-003, R-001, R-002

## Contexto

Las descargas de Dukascopy (RX-001) son tareas largas: hasta 2 años de datos (RNF-003) con retardos de hasta 20 s entre requests (R-001, mitigación del plan) y la limpieza posterior. Ejecutarlas en el request HTTP bloquearía la API (RNF-007) y perdería estado si el servidor se reinicia a mitad.

## Decisión

Descargas y procesamiento como **tareas asíncronas** en **Celery** con **RabbitMQ** como broker. La API encola `download_asset(activo, inicio, fin)` y devuelve inmediatamente; el worker descarga con retry/backoff (20 s entre batches), ejecuta el pipeline y actualiza MetadatosDescarga (RI-002). El frontend consulta el estado.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| asyncio puro (tareas en background) | Sin infraestructura extra | Las tareas se pierden al reiniciar; reintentos y backoff a mano | No robusto para R-001/R-002 |
| FastAPI BackgroundTasks | Sencillo | Fire-and-forget sin persistencia ni reintentos ni métricas | Riesgoso para descargas largas |
| Redis + redis-rq | Ligero, persistencia | Redis requiere proceso extra igual que RabbitMQ | RabbitMQ ofrece reinientos/ack más maduros |

## Consecuencias

### Positivas
- Descargas persistentes con reintentos (R-001) y sin bloquear la UI (RNF-007).
- Estado auditable vía MetadatosDescarga (RI-002, RF-006).
- Incremental: cada tarea cubre rango no descargado, sin duplicar (RF-006).

### Negativas / Trade-offs
- Proceso adicional (broker) en la config del entorno local (ADR-009).
- Configuración de Celery añade complejidad al arranque del MVP.

### Neutras
- RabbitMQ y Celery son software open-source (RNF-006).

## Referencias

- `_docs/plan.md` §7 R-001 (retardos de 20 s), ciclo descarga
- `_docs/requirements.md` RF-001, RF-002, RF-006, RX-001, RNF-003