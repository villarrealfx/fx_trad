# ADR-002: Backend en Python + FastAPI

- **Fecha:** 2026-09-17
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RF-001, RF-003, RF-005, RF-009, RX-002, RNF-004, RNF-006, RNF-007

## Contexto

El backend debe ejecutar ETL sobre datos financieros (descarga, limpieza, imputación, resampling a timeframes), consultar DuckDB/Parquet y exponer una API HTTP al frontend. El usuario declara como restricción "Python (backend)" y el presupuesto es $0 (RNF-006).

## Decisión

Backend en **Python 3.12** con **FastAPI** servido por **Uvicorn**, exponiendo una API REST. El ETL usa el ecosistema nativo de Python (pandas, duckdb), alineado con la restricción tecnológica de Parquet + DuckDB (RF-005).

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Node.js/TypeScript | Un solo idioma con el frontend | Integración pobre con pandas/duckdb y el ecosistema de datos Python | No cumple la restricción del usuario ni facilita el ETL |
| Go | Rendimiento alto | Mayor esfuerzo de desarrollo para ETL/data (RNF-007), ecosistema data menor | Riesgo para el plazo de 2 semanas |
| Django + DRF | Baterías incluidas | Pesado para una API consumida por SPA; incluye admin/ORM no usados | FastAPI es más ligero y suficiente |

## Consecuencias

### Positivas
- Reutiliza el ecosistema de datos de Python (pandas, duckdb) para pipeline y storage (RF-003/005/009).
- FastAPI es código 100% open-source (RNF-006) y de entrega rápida (RNF-007).
- Modelo de datos consumible por el frontend vía REST (RX-002).

### Negativas / Trade-offs
- Rendimiento de concurrencia inferior a Go/Node; irrelevante por ser uso personal de 1 usuario.

### Neutras
- Compatibilidad de versiones Python (3.12) a fijar en el contrato del toolchain.

## Referencias

- `_docs/plan.md` §5 Restricciones (stack Python)
- `_docs/requirements.md` RF-003, RF-005, RX-002, RNF-006