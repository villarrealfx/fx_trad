# ADR-007: Caché de series (in-memory + Parquet columnar, "Karst")

- **Fecha:** 2026-09-17
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RNF-001, RNF-002, RNF-008, RF-008

## Contexto

RNF-001 exige pan/zoom fluido (60 FPS) y RNF-002 hasta ~18M filas por activo. Consultar DuckDB en cada frame sería inviable; además, resampling por timeframe (RF-009) repetido incrementa latencia. La estructura expuesta al navegador debe consumirse "sin hacks" (RNF-008).

## Decisión

Caché propia de **2 niveles** (`Karst`):
1. **In-memory**: rango visible para el activo+timeframe actual (estructura OHLC ya transformada), servido en los frames de pan/zoom.
2. **Columnar/Parquet**: series pre-resampling por timeframe (`1m/5m/15m/1h/4h/1d`) junto a la base de 1 s, para servir rangos nuevos en un solo acceso a disco.

La API entrega rango+tamaño máximo de filas (ventana), y el frontend sólo pide el rango fenile cuando hace pan/zoom fuera de la ventana cacheada.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Redis/Memcached | Probado, simple | Proceso extra, serialización en red sin necesidad local | Para 1 usuario el caché debe vivir en proceso |
| Consultar DuckDB por request | Simple | Latencia de disco/CPU en cada frame (RNF-001) | Incumple RNF-001/RNF-002 |
| Cache total de 18M filas en memoria | Máxima velocidad | RAM elevada por activo | Innecesario: bastan ventanas por rango |

## Consecuencias

### Positivas
- Pan/zoom servidos desde memoria (60 FPS, RNF-001).
- Resampling precaluable por timeframe (RF-009) sin re-computar en cada carga (RNF-008).
- Costo $0, sin procesos extra (RNF-006).

### Negativas / Trade-offs
- Caché custom a mantener (caché de invalidadción por activo actualizado).

### Neutras
- La caché expuesta usa el mismo contrato OHLC de lightweight-charts (RNF-008).

## Referencias

- `_docs/plan.md` §7 R-002 (volumen degrada UI)
- `_docs/requirements.md` RNF-001, RNF-002, RF-008, RF-009