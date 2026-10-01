# ADR-004: Persistencia en Parquet + DuckDB

- **Fecha:** 2026-09-17
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RF-005, RF-006, RF-008, RNF-002, RI-001, RI-002

## Contexto

RF-005 impone **Parquet (formato) + DuckDB (motor de consulta)** como restricción tecnológica obligatoria. Los datos llegan a ~18M filas por activo (RNF-002), con `time` único en segundos UTC (RI-001) y control incremental vía metadatos (RI-002, RF-006).

## Decisión

Almacenar cada activo como un archivo **Parquet** en columnas (`time`, `open`, `high`, `low`, `close`), consultado mediante **DuckDB**. `time` es `BIGINT` (segundos UTC, único por activo). Los metadatos de descarga se guardan en una tabla DuckDB separada para soportar incrementales sin duplicar (RF-006).

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| SQLite | Transaccional, conocido | Análisis analítico/columnar más lento para 18M filas | No cumple la restricción RF-005 |
| pandas in-memory / CSV | Simple | No escala a 18M filas, sin consultas eficientes por rango (RNF-002) | Insuficiente para RNF-001/RNF-002 |
| Arrow + DuckDB con particionado | Rendimiento extremo | Complejidad de particionado premature para 1 usuario | DuckDB sobre Parquet por activo cubre el rango de consulta |

*Nota: DuckDB+Parquet es cálculo impuesto, no libre elección; se contrasta con alternativas para confirmar que cumple RNF-002/RNF-008.*

## Consecuencias

### Positivas
- Consultas columnares por rango de fechas eficientes (RNF-002) y análisis directo en dataset (resampling).
- `time` único por activo garantiza RI-001 (rechazo de duplicados).
- Contrato de datos ya consumible por DuckDB → API → frontend (RNF-008).

### Negativas / Trade-offs
- DuckDB no es servidor multiusuario; irrelevante (1 usuario local).

### Neutras
- Formato Parquet versionable y auditable por inspección directa.

## Referencias

- `_docs/plan.md` §5 Restricciones (Parquet + DuckDB)
- `_docs/requirements.md` RF-005, RF-006, RI-001, RI-002, RNF-002
- `_docs/glossary.md` Entidades (Serie OHLC, Metadatos de descarga)