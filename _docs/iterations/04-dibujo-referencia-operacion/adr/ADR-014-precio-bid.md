# ADR-014: Semántica de precio BID puro

- **Fecha:** 2026-09-28
- **Estado:** Aceptado
- **Decisores:** Arquitecto, usuario (propietario)
- **Requisitos vinculados:** RF-101, RX-101
- **Relacionado:** ADR-012, ADR-013

## Contexto

Con la base anterior (ticks) el sistema calculaba el precio de la vela como
**precio medio** `mid = (bid + ask) / 2` a partir de los ticks bid y ask
(`freeserv.py:aggregate_to_ohlc`). Al pasar a `INTERVAL_MIN_1`, la API agrega en
origen y devuelve OHLC de un **único lado del libro**, seleccionable con
`offer_side` (`B` = BID, `A` = ASK). No es posible obtener el `mid` sin volver a
los ticks, lo que devolvería la lentitud del problema original (ADR-013).

## Decisión

La serie canónica 1 m usa **BID puro** (`OFFER_SIDE_BID`). Se acepta que la
semántica del precio difiere de la base anterior (`mid`) y se documenta como
supuesto S-1 / riesgo R-004.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| BID puro | 1 request por bloque, rápido, coherente para análisis de compra | Diferente del `mid` histórico | — (elegida) |
| ASK puro | Similar a BID | Mismo trade-off y menos convencional para cierre de vela | BID es la convención del usuario |
| Reconstruir `mid` desde ticks | Consistente con la base previa | Reintroduce `INTERVAL_TICK` y la lentitud | Contradice RNF-101/ADR-013 |

## Consecuencias

### Positivas
- Habilita la descarga rápida (RF-101/RNF-101) sin agregación local.
- Serie consistente y reproducible: una sola fuente de precio por vela.

### Negativas / Trade-offs
- Las series descargadas **no son directamente comparables** con cualquier dato
  previo basado en `mid` (no existe Parquet previo, por lo que no hay conflicto
  material).
- Los indicadores calculados sobre BID difieren ligeramente de los calculados sobre
  `mid`; es aceptable para análisis manual de un único feed.

### Neutras
- El contrato `Candle` no cambia; solo el origen del valor.
- No hay requisito de arbitraje ni de ejecución real que exija `mid`.

## Referencias

- `_docs/iterations/02-optimizacion-descarga/plan.md` §6 (S-1, D-2), §7 (R-004)
- `_docs/iterations/02-optimizacion-descarga/requirements.md` RF-101, RX-101
- `dukascopy_python/__init__.py:50-51`
