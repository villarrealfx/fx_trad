/**
 * Contrato OHLC compartido (implementación TypeScript).
 *
 * Fija la forma y los tipos de la serie OHLC definida en
 * `contracts/ohlc-contract.md` y `contracts/ohlc.schema.json`, consumible
 * directamente por lightweight-charts sin transformaciones ad-hoc (RNF-008).
 *
 * Espejo Python: `backend/src/fxtrad/contracts/ohlc.py`. Toda modificación aquí
 * debe reflejarse también en el schema canónico y en el espejo Python; los tests
 * de alineación (`frontend/src/contracts/__tests__/ohlc.test.ts`) verifican la
 * consistencia contra el schema canónico.
 */

/** Granularidad de agregación de cada vela (RF-009). */
export const TIMEFRAMES = ['1s', '1m', '5m', '15m', '1h', '4h', '1d'] as const;

/** Granularidad de agregación de cada vela (RF-009). */
export type Timeframe = (typeof TIMEFRAMES)[number];

/**
 * Vela OHLC: una fila de la serie en un instante de tiempo.
 *
 * `time` es el timestamp en segundos UTC, único por activo y timeframe (RI-001),
 * y se corresponde con `UTCTimestamp` de lightweight-charts v4 (ADR-005).
 */
export interface Candle {
  /** Timestamp en segundos UTC, único por activo y timeframe (RI-001). */
  time: number;
  /** Precio de apertura del intervalo. */
  open: number;
  /** Precio máximo del intervalo. */
  high: number;
  /** Precio mínimo del intervalo. */
  low: number;
  /** Precio de cierre del intervalo. */
  close: number;
}

/**
 * Respuesta de una serie para el frontend (RX-002).
 *
 * Las velas viajan ordenadas ascendentemente por `time`.
 */
export interface OhlcResponse {
  /** Código del activo, p. ej. EURUSD. */
  symbol: string;
  /** Granularidad de agregación de cada vela. */
  timeframe: Timeframe;
  /** Velas ordenadas ascendentemente por time. */
  candles: Candle[];
}

/** Campos de {@link Candle} en orden canónico (alineado con el schema). */
export const CANDLE_FIELD_NAMES: readonly (keyof Candle)[] = [
  'time',
  'open',
  'high',
  'low',
  'close',
] as const;

/** Campos de {@link OhlcResponse} en orden canónico (alineado con el schema). */
export const OHLC_RESPONSE_FIELD_NAMES: readonly (keyof OhlcResponse)[] = [
  'symbol',
  'timeframe',
  'candles',
] as const;
