# ADR-001: Estilo arquitectónico (monolito modular)

- **Fecha:** 2026-09-17
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RF-016, RNF-006, RNF-007

## Contexto

Aplicación personal de análisis técnico con subtareas heterogéneas: un pipeline de datos pesado (descarga, limpieza, resampling de ~18M filas/activo) y una interfaz de visualización en canvas. Restricciones del proyecto: costo $0 (RNF-006) y MVP en 2 semanas (RNF-007) con un único desarrollador/usuario, sin concurrencia y sin despliegue multi-tenant.

## Decisión

Adoptar un **monolito modular**: un solo proceso de backend (FastAPI) organizado en módulos con contratos internos claros (`ingest`, `pipeline`, `storage`, `api`, `export`), un frontend SPA React y un worker Celery para descargas asíncronas. Los módulos se comunican por interfaces explícitas para preservar la extensibilidad (RF-016).

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Microservicios | Independencia de despliegue/scale | Sobrecarga operacional y de red, requiere orquestación | Sin sentido para 1 usuario; viola RNF-007 (2 semanas) y RNF-006 ($0) |
| Serverless (Lambda/Functions) | Sin servidores, escala a demanda | Cold start, límite de duración de ejecución, costo variable por invocación | Descargas largas con backoff de 20 s y procesamiento de 18M filas exceden límites; no suma valor para 1 usuario |
| SPA + ETL en script único | Máxima simplicidad | Mescla de responsabilidades, difícil agregar características (RF-016) | Violaría RF-016: sin fronteras de módulos |

## Consecuencias

### Positivas
- Despliegue simple (docker compose), iteración rápida (RNF-007).
- Fronteras de módulos habilitan RF-016 (agregar indicadores o fuentes sin reescribir).
- Un solo stack de despliegue mantiene el costo en $0 (RNF-006).

### Negativas / Trade-offs
- Escala vertical limitada: no hay escala horizontal por componente (no es necesaria: 1 usuario local).

### Neutras
- El worker Celery (ADR-006) introduce un proceso adicional, pero sigue dentro del mismo repositorio/configuración.

## Referencias

- `_docs/plan.md` §5 Restricciones, §7 R-002
- `_docs/requirements.md` RF-016, RNF-006, RNF-007