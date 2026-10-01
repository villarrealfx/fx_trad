# ADR-008: Observabilidad (logging estructurado) y CI/CD (GitHub Actions + Docker)

- **Fecha:** 2026-09-17
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RNF-006, RNF-007

## Contexto

El MVP de 2 semanas (RNF-007) necesita visibilidad de fallos (descargas, pipeline, API) con costo $0 (RNF-006) y sin infraestructura SaaS. No aplican métricas de producción (app local de 1 usuario).

## Decisión

- **Observabilidad:** `logging` estándar + `structlog` para logs estructurados (JSON) por módulo (`ingest`, `pipeline`, `api`), con niveles y correlación de tareas Celery.
- **CI/CD:** **GitHub Actions** ejecuta lint + tests al hacer push; **Docker** envuelve frontend/backend/worker para reproducibilidad local y despliegue (ADR-009).

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Sentry / SaaS APM | Alertas y trazas | Licencias/costo, exige credenciales e infra | Viola RNF-006 y desproporcionado para 1 usuario |
| ELK / Grafana stack | Dashboards potentes | Pesado, muchos procesos para un MVP local | Sobrecarga operativa innecesaria |
| Sin observabilidad | Cero esfuerzo | Sin trazabilidad de fallos de descarga/pipeline | El debug en ETL sin logs cuesta más que los logs (RNF-007) |

## Consecuencias

### Positivas
- Diagnóstico rápido de descargas/pipeline (RNF-007) con logs JSON parseables.
- CI da feedback temprano de regresiones sin costo (RNF-006).
- Docker hace el entorno reproducible (RNF-007).

### Negativas / Trade-offs
- Cobertura de observabilidad limitada frente a SaaS (monitoring/alerting); aceptable por el contexto local.

## Referencias

- `_docs/plan.md` §5 Restricciones (presupuesto $0, MVP 2 semanas)
- `_docs/requirements.md` RNF-006, RNF-007