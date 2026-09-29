# Contrato OHLC compartido

> **Fuente de verdad lógica:** este documento (legible) + `contracts/ohlc.schema.json` (machine-readable).
> **Implementaciones en espejo:** `backend/src/fxtrad/contracts/ohlc.py` (Pydantic) y
> `frontend/src/contracts/ohlc.ts` (TypeScript).
> **Alineación garantizada por tests:** `backend/tests/contracts/test_ohlc_contract.py` y
> `frontend/src/contracts/__tests__/ohlc.test.ts` leen el mismo schema canónico.
> **Origen:** RF-003, RI-001, RNF-008 (ADR-004, ADR-005). Mitiga AR-3.

## 1. Propósito

Fijar, antes de construir el ETL (decisión DP-3), el contrato de datos que el pipeline produce
y que el frontend consume directamente, sin transformaciones ad-hoc (RNF-008). Cualquier cambio
en este contrato debe reflejarse en el schema canónico, en el modelo Pydantic y en los tipos TS,
y los tests de alineación lo verifican.

## 2. Invariantes globales

1. `time` es **único** por activo y timeframe (RI-001).
2. Las velas de una serie se ordenan **ascendentemente por `time`**.
3. Todos los timestamps están en **segundos UTC** (RNF-004).
4. No se permiten claves adicionales a las definidas (contrato estricto).

## 3. `Candle`

Una vela OHLC: una fila de la serie en un instante de tiempo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `time` | `integer` (int64) | Timestamp en segundos UTC. Único por activo y timeframe. `>= 0`. |
| `open` | `number` (float64) | Precio de apertura del intervalo. |
| `high` | `number` (float64) | Precio máximo del intervalo. |
| `low` | `number` (float64) | Precio mínimo del intervalo. |
| `close` | `number` (float64) | Precio de cierre del intervalo. |

El campo `time` se corresponde con `UTCTimestamp` de `lightweight-charts` v4 (ADR-005): en el
contrato viaja como `number` de segundos; el frontend aplica únicamente un *cast* de tipo
(no una transformación de datos) al pasar del DTO al modelo de la librería.

## 4. `OhlcResponse`

Respuesta de una serie para el frontend (RX-002, endpoint `GET /series`).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `symbol` | `string` | Código del activo, p. ej. `EURUSD`. |
| `timeframe` | `enum[Timeframe]` | Granularidad de cada vela. |
| `candles` | `array<Candle>` | Velas ordenadas ascendentemente por `time`. |

## 5. `Timeframe`

| Valor | Significado |
|-------|-------------|
| `1m` | 1 minuto (base canónica, ADR-012) |
| `5m` / `15m` / `1h` / `4h` / `1d` | Granularidades de visualización por resampling (RF-009) |

> `1s` se retiró del contrato (ADR-020): la base es 1 m y no existe serie sub-minuto.

## 6. Límite de la validación en el contrato

Este contrato define **forma y tipos**, no la semántica de precio:

| Invariante de precio | ¿Dónde se valida? |
|----------------------|-------------------|
| `high >= max(open, close)` y `low <= min(open, close)` | Pipeline (TASK-010/011) |
| `time` sin duplicados en la serie persistida | Storage (RI-001, TASK-015) |
| Ausencia de NaN/Inf | Pipeline (TASK-010) |

El contrato solo rechaza un `time` negativo y claves desconocidas; el resto de invariantes se
validan en las capas de transformación (TASK-010/011) para no duplicar responsabilidades.

## 7. Referencia canónica

- Schema machine-readable: `contracts/ohlc.schema.json` (JSON Schema draft 2020-12).
- Espejo Python: `backend/src/fxtrad/contracts/ohlc.py`.
- Espejo TS: `frontend/src/contracts/ohlc.ts`.