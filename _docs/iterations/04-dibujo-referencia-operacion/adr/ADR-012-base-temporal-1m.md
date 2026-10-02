# ADR-012: Base temporal canónica de 1 minuto (reemplaza la base 1 s)

- **Fecha:** 2026-09-28
- **Estado:** Aceptado
- **Decisores:** Arquitecto, usuario (propietario)
- **Requisitos vinculados:** RF-101, RF-103, RNF-102, RI-101, RI-102
- **Reemplaza parcialmente a:** ADR-004 (esquema/serie base), ADR-010 (contrato de salida 1 s)

## Contexto

La iteración 01 fijó la serie canónica a **1 segundo** (ADR-004, RNF-002: ~18M
filas por activo a 2 años) para poder derivar cualquier timeframe, incluidos
sub-minuto (30 s, 15 s). En la práctica:

- La descarga nunca se completó (un mes superó 30 min).
- Los timeframes de estudio reales son **1 m, 5 m, 15 m, 30 m en adelante**; ningún
  cálculo, indicador o fuente de verdad requiere resolución de 1 s.
- El volumen a 1 s obliga a estrategias de escritura por lotes (TASK-051) y
  encarece el almacenamiento sin aportar valor.

El plan de la iteración 02 (§6, D-1) decide abandonar la base 1 s.

## Decisión

La serie canónica pasa a ser **velas OHLC de 1 minuto**, obtenidas directamente de
la API (`INTERVAL_MIN_1`). Los timeframes de visualización 5 m/15 m/30 m/1 h/4 h/1 d
se obtienen por **resampling de la base 1 m**. RNF-002 (18M filas) queda
**reemplazado por RNF-102** (~726k velas/activo a 2 años).

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Mantener base 1 s | Flexibilidad sub-minuto futura | ~18M filas, descarga inviable, escribe por lotes | No hay caso de uso sub-minuto (OUT explícito) |
| Base 1 m + opción 1 s bajo demanda | Cubre un futuro sub-minuto | Dos rutas de ingest, doble complejidad y datos mixtos | Contradice "no tocar demasiado" (RNF-007) y S-2 |
| Base 5 m | Menor volumen | Pierde el TF de estudio mínimo (1 m) | RF-103 exige 1 m |

## Consecuencias

### Positivas
- Volumetría baja de ~18M a ~726k velas/activo (RNF-102): almacenamiento y consulta
  triviales.
- La fuente agrega en origen (sin agregación local de ticks), habilitando RNF-101.
- El frontend ya soporta los TF ≥1 m: sin cambios funcionales (RNF-008).

### Negativas / Trade-offs
- Se pierde la resolución sub-minuto (aceptado, OUT).
- Ruptura controlada y **resuelta** en esta iteración: `pipeline.resample` (origen
  canónico, TASK-059), `storage` (naming `{symbol}.1m.parquet`, TASK-060),
  validación de timeframe base, `benchmark_parquet.py` (TASK-066), referencias a
  RNF-002 (TASK-067) y la nota "1 s UTC" de SCR-002 (TASK-UI-061).

### Neutras
- El contrato `Candle` no cambia (RI-101); solo cambia el intervalo.
- El esquema `time` BIGINT + OHLC numérico se conserva (ADR-004).

## Referencias

- `_docs/iterations/02-optimizacion-descarga/plan.md` §3, §6 (D-1)
- `_docs/iterations/02-optimizacion-descarga/requirements.md` RF-101, RF-103,
  RNF-102, RI-101, RI-102
- `_docs/iterations/01-mvp/adr/ADR-004-persistencia-parquet-duckdb.md`
