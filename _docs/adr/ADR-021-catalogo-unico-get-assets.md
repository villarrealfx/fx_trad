# ADR-021: Catálogo único vía `GET /assets`

- **Fecha:** 2026-09-29
- **Estado:** Aceptado (2026-09-29, cierre del ciclo 03)
- **Decisores:** Arquitecto, Tech Lead
- **Requisitos vinculados:** RF-216, RF-217, RF-220, RX-201, RX-202, RI-202

## Contexto

El backend ya expone `GET /assets` (`backend/src/fxtrad/api/routes.py:106`), que
compone el catálogo canónico `ingest.ASSET_CATALOG` con la cobertura y el estado
de descarga (`CatalogQuery`). Aun así, el frontend mantiene un **espejo**
duplicado en `frontend/src/catalog/index.ts` con un `TODO` para migrar. El ciclo 03
añade 5 pares forex (GBPJPY, EURJPY, AUDUSD, USDCAD, EURGBP) y exige que los
ajustes de backend queden operativos. Mantener dos catálogos garantiza
desincronización.

## Decisión

Declarar `GET /assets` como **fuente única del catálogo**, eliminar el espejo del
frontend y ampliar el `ASSET_CATALOG` del backend con los 5 pares, incluyendo su
mapeo `instrument_id` en `ingest.freeserv.FREESERV_INSTRUMENT`.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Consumir `GET /assets` y borrar espejo | Una sola fuente de verdad | Cambio en 3 pantallas + tests | **Elegido**: RF-220, RI-202 |
| Mantener espejo y añadir los 5 pares en ambos | Cambio pequeño | Doble mantenimiento; desincronización | Es la deuda que el ciclo debe saldar |
| Endpoint nuevo específico | Contrato a medida | Duplicaría `GET /assets` existente | Innecesario |

## Consecuencias

### Positivas
- Un único catálogo; el frontend refleja siempre el backend (RF-220).
- Los pares nuevos quedan disponibles en Descarga (RF-216) y Abrir.

### Negativas / Trade-offs
- Requiere pruebas de contrato frontend↔backend y actualizar pantallas que
  consumían el espejo.
- Añadir pares exige que Dukascopy los sirva (RX-201, S-1); si un par no está
  soportado, se excluye solo ese.

### Neutras
- Sin cambios de esquema en Parquet/DuckDB; solo crece `ASSET_CATALOG`.

## Referencias

- `backend/src/fxtrad/api/routes.py` (`GET /assets`)
- `frontend/src/catalog/index.ts` (espejo a eliminar)
- `backend/src/fxtrad/ingest/catalog.py`, `backend/src/fxtrad/ingest/freeserv.py`
- RF-216/217/220, RX-201/202, RI-202
