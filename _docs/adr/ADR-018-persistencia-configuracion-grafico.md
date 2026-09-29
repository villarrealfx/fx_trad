# ADR-018: Persistencia de la configuración del gráfico en `localStorage`

- **Fecha:** 2026-09-29
- **Estado:** Propuesto
- **Decisores:** Arquitecto, Tech Lead
- **Requisitos vinculados:** RF-204, RI-201, RNF-201 (modifica RI-003 del ciclo 01)

## Contexto

El insumo pide conservar la última configuración del gráfico (activo, dibujos,
indicadores) al cambiar de hoja y volver. El ciclo 01, con `RI-003`, prohibía
persistir dibujos/estrategias. El ciclo 03 **modifica** esa decisión: se persiste
en el **navegador**, nunca en el backend (RF-W-201 sigue fuera de alcance). La
persistencia debe ser robusta y **versionada** (RNF-201) y tener en cuenta la
**cuota** del almacenamiento.

## Decisión

Persistir la configuración del gráfico en **`localStorage`** con un **esquema
versionado**, usando como clave `fxtrad.chart.v{n}.{symbol}.{timeframe}`. El valor
es un JSON `{version, indicators:[…], drawings:[…]}`. La versión en la clave
permite migrar o descartar configuraciones incompatibles sin corromper el estado.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| `localStorage` versionado | Nativo, síncrono, simple, $0 | Cuota ~5 MB; síncrono | **Elegido**: config pequeña, RNF-006/007 |
| IndexedDB | Gran cuota, asíncrono | API más compleja; más código y pruebas | Sobredimensionado para el alcance |
| Backend (DuckDB) | Compartible entre dispositivos | Fuera de alcance; toca API/schema | RF-W-201; RNF-007 |
| Sin persistencia (estado en memoria) | Cero complejidad | No cumple RF-204 | No satisface el requisito |

## Consecuencias

### Positivas
- La configuración sobrevive a cambios de hoja y recargas (RF-204, RNF-201).
- `RI-003` se modifica de forma explícita y trazable (persistencia local, no backend).
- Clave por activo+timeframe: cada combinación conserva lo suyo.

### Negativas / Trade-offs
- Sujeto a la cuota de `localStorage` (R-203); mitigación: esquema versionado y
  posible migración futura a IndexedDB.
- Requiere lógica de migración/descartes al cambiar de versión.

### Neutras
- No hay cambios en el backend ni en Parquet/DuckDB.

## Referencias

- RI-003 (01-mvp) — modificado
- RI-201, RF-204, RNF-201
- R-203 (corrupción/migración de esquema)
