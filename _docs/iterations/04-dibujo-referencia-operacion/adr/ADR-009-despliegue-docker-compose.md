# ADR-009: Despliegue local con Docker Compose

- **Fecha:** 2026-09-17
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RNF-005, RNF-006, RNF-007

## Contexto

La app es de **uso personal local** (plan §4): no hay multiusuarios, ni cloud, ni cumplimiento. Los KPIs (latencia 60 FPS, carga < 2 s) se miden contra datos locales. Se requiere reproducibilidad (RNF-007) y $0 (RNF-006). Navegadores desktop modernos (RNF-005).

## Decisión

Un **Docker Compose** de un solo entorno (dev/use personal) con 4 servicios: `frontend` (Vite), `backend` (FastAPI), `worker` (Celery) y `broker` (RabbitMQ). Los datos (Parquet) y el volumen DuckDB se montan en un volumen `data/`. No se definen staging/prod dedicados: el mismo compose sirve para el usuario; los artefactos Docker permiten versionar y re-desplegar.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Cloud hosting (VPS/PaaS) | Acceso remoto | Costo, latencia de red, datos en terceros | Innecesario y contrario a RNF-006 (uso local) |
| Un solo proceso monilítico (sin broker/worker) | Más simple | Sin colas persistentes (ADR-006) | Las tareas de descarga larga llenen el proceso |
| Instalación manual por script | Rápido | No reproducible en otra máquina | Peor para mantener (RNF-007) |

## Consecuencias

### Positivas
- Reproducible y portable (`docker compose up`), con datos persistentes en volumen.
- Entorno homogéneo para CI (ADR-008) y desarrollo local (RNF-007).
- Costo $0 (RNF-006), sin SaaS.

### Negativas / Trade-offs
- Sin separación dev/staging/prod formales; aceptable por el contexto personal.
- Se asume Docker instalado en la máquina de escritorio (RNF-005).

### Neutras
- Los conteiners servirán de base si en el futuro se decide exponer la app en una red.

## Referencias

- `_docs/plan.md` §4 Stakeholders, §5 Restricciones (plataforma desktop)
- `_docs/requirements.md` RNF-005, RNF-006, RNF-007