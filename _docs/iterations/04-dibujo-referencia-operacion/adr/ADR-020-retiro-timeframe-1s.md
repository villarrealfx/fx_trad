# ADR-020: Retiro de `"1s"` del contrato `Timeframe`

- **Fecha:** 2026-09-29
- **Estado:** Aceptado (2026-09-29, cierre del ciclo 03)
- **Decisores:** Arquitecto, Tech Lead
- **Requisitos vinculados:** RF-219 (deuda del ciclo 02)

## Contexto

El ciclo 02 migró la base canónica a 1 m (ADR-012) y el `storage` ya **rechaza**
`"1s"` con `InvalidTimeframeError`. Sin embargo, el contrato `Timeframe` aún
declara `"1s"` en el backend (`backend/src/fxtrad/contracts/ohlc.py:18`) y su
espejo TypeScript (`frontend/src/contracts/ohlc.ts:15`). La pantalla Abrir todavía
referencia ese timeframe obsoleto. Mantener `"1s"` en el contrato permite
peticiones que el backend no puede satisfacer (422 tardío) y confunde la UI.

## Decisión

**Retirar `"1s"` del literal `Timeframe`** en el contrato backend y en el espejo
TypeScript, en un cambio coordinado, y actualizar la UI (pantalla Abrir) y los
tests que lo referencian.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Retirar `"1s"` del contrato | Contrato coherente con la base 1 m | Cambio coordinado API+TS+tests | **Elegido**: RF-219 |
| Mantener `"1s"` aceptado pero rechazado en runtime | Cero cambio | Contrato miente; errores tardíos | Deuda arrastrada del ciclo 02 |
| Aceptar `"1s"` y resamplear desde 1 m | Compatibilidad | No existe base sub-minuto; no tiene sentido | Fuera de dominio (OUT) |

## Consecuencias

### Positivas
- El contrato refleja la realidad (base 1 m, ADR-012).
- La UI deja de ofrecer un timeframe inválido.

### Negativas / Trade-offs
- Rompe compatibilidad con consumidores que envíen `"1s"` (solo la UI propia
  identificada; S-4). Requiere actualizar tests que usan `"1s"`
  (`backend/tests/contracts/test_ohlc_contract.py`, `frontend/.../ohlc.test.ts`).

### Neutras
- `GET /series` mantiene su default `1m`.

## Referencias

- ADR-012 (base temporal 1 m)
- RF-219, S-4, R-204
- `_docs/iterations/02-optimizacion-descarga/_cierre.md` (deuda asumida)
