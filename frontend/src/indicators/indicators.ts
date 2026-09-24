/**
 * Cálculo de indicadores técnicos MA, RSI y ATR en el frontend (TASK-032, RF-013).
 *
 * Puerto TypeScript del algoritmo de `backend/src/fxtrad/pipeline/indicators.py`
 * (TASK-031): misma convención Wilder, mismos defaults (J-004) y misma
 * validación (serie ordenada sin duplicados — RI-001). El test de parity contra
 * el fixture golden compartido (`backend/tests/pipeline/fixtures/
 * indicators_reference.json`) garantiza coherencia entre backend y frontend.
 *
 * Nota de diseño: el backlog no define un endpoint de indicadores (TASK-043 solo
 * registra indicadores en el backend); TASK-032 computa en el cliente para
 * permitir el redibujo inmediato al cambiar parámetros (RF-013).
 */
import type { Candle } from '../contracts/ohlc';

/** Periodos por defecto de las medias móviles (convención J-004). */
export const MA_PERIODS_DEFAULT = [20, 50, 200] as const;

/** Periodo por defecto del RSI (convención J-004). */
export const RSI_PERIOD_DEFAULT = 14;

/** Periodo por defecto del ATR (convención J-004). */
export const ATR_PERIOD_DEFAULT = 14;

/** Parámetros configurables de los indicadores (RF-013). */
export interface IndicatorParameters {
  /** Ventanas de las medias móviles a calcular. */
  readonly maPeriods: readonly number[];
  /** Ventana del RSI de Wilder. */
  readonly rsiPeriod: number;
  /** Ventana del ATR de Wilder. */
  readonly atrPeriod: number;
  /** Si el RSI se dibuja (default: sí). TASK-UI-042. */
  readonly showRsi?: boolean;
  /** Si el ATR se dibuja (default: sí). TASK-UI-042. */
  readonly showAtr?: boolean;
}

/** Parámetros por defecto (J-004): MA 20/50/200, RSI 14, ATR 14. */
export const DEFAULT_INDICATOR_PARAMETERS: IndicatorParameters = {
  maPeriods: MA_PERIODS_DEFAULT,
  rsiPeriod: RSI_PERIOD_DEFAULT,
  atrPeriod: ATR_PERIOD_DEFAULT,
};

/** Resultado del cálculo, alineado por índice con los tiempos de cada vela. */
export interface IndicatorsResult {
  /** Timestamps (s UTC) de cada vela, en el mismo orden (RI-001). */
  readonly times: readonly number[];
  /** Medias móviles simples por periodo (clave = periodo). */
  readonly ma: ReadonlyMap<number, readonly (number | null)[]>;
  /** RSI de Wilder por periodo (clave = periodo). */
  readonly rsi: ReadonlyMap<number, readonly (number | null)[]>;
  /** ATR de Wilder por periodo (clave = periodo). */
  readonly atr: ReadonlyMap<number, readonly (number | null)[]>;
}

/** Punto de línea listo para lightweight-charts (valor no nulo). */
export interface LinePoint {
  /** Timestamp en segundos UTC de la vela. */
  readonly time: number;
  /** Valor del indicador en esa vela. */
  readonly value: number;
}

/** Error de cálculo: periodos inválidos o serie no válida (RI-001). */
export class IndicatorsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IndicatorsError';
  }
}

/** Valida que el periodo de un indicador sea ≥ 1. */
function validatePeriod(period: number, name: string): void {
  if (period < 1) {
    throw new IndicatorsError(`Periodo de ${name} inválido: ${period}. Debe ser ≥ 1.`);
  }
}

/** Valida que la serie esté ordenada y sin `time` duplicado (RI-001). */
function validateSeries(candles: readonly Candle[]): void {
  let previous: number | undefined;
  for (const candle of candles) {
    if (previous !== undefined && candle.time <= previous) {
      if (candle.time < previous) {
        throw new IndicatorsError(
          `Serie no ordenada: ${candle.time} precede a ${previous} (RI-001).`,
        );
      }
      throw new IndicatorsError(`time duplicado ${candle.time} en la entrada (RI-001).`);
    }
    previous = candle.time;
  }
}

/** Media móvil simple de ventana `period` sobre `values`. */
function sma(values: readonly number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let accumulation = 0;
  for (let i = 0; i < values.length; i += 1) {
    accumulation += values[i];
    if (i >= period) accumulation -= values[i - period];
    out.push(i >= period - 1 ? accumulation / period : null);
  }
  return out;
}

/** Conversión de promedios de ganancia/pérdida a un valor RSI. */
function rsiValue(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0 && avgGain === 0) return 0;
  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** RSI de Wilder: primer valor en el índice `period`, luego suavizado 1/period. */
function rsiWilder(closes: readonly number[], period: number): (number | null)[] {
  const count = closes.length;
  const out: (number | null)[] = new Array<number | null>(count).fill(null);
  if (count < period + 1) return out;

  const diffs = closes.slice(1, period + 1).map((close, j) => close - closes[j]);
  const gains = diffs.filter((diff) => diff > 0);
  const losses = diffs.filter((diff) => diff < 0).map((diff) => -diff);
  let avgGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length : 0;
  let avgLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / losses.length : 0;
  out[period] = rsiValue(avgGain, avgLoss);

  for (let i = period + 1; i < count; i += 1) {
    const change = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    out[i] = rsiValue(avgGain, avgLoss);
  }
  return out;
}

/** True ranges consecutivos: tr[0] es high-low de la primera vela. */
function trueRanges(candles: readonly Candle[]): number[] {
  const ranges: number[] = [];
  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i];
    if (i === 0) {
      ranges.push(candle.high - candle.low);
      continue;
    }
    const previousClose = candles[i - 1].close;
    ranges.push(
      Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previousClose),
        Math.abs(candle.low - previousClose),
      ),
    );
  }
  return ranges;
}

/** ATR de Wilder: primer valor en el índice `period`, luego suavizado 1/period. */
function atrWilder(candles: readonly Candle[], period: number): (number | null)[] {
  const ranges = trueRanges(candles);
  const count = candles.length;
  const out: (number | null)[] = new Array<number | null>(count).fill(null);
  if (count < period + 1) return out;

  let previous = ranges.slice(0, period + 1).reduce((sum, value) => sum + value, 0) / (period + 1);
  out[period] = previous;
  for (let i = period + 1; i < count; i += 1) {
    previous = (previous * (period - 1) + ranges[i]) / period;
    out[i] = previous;
  }
  return out;
}

/**
 * Calcula MA/RSI/ATR sobre la serie con los periodos indicados (TASK-032).
 *
 * Args:
 *   candles: Serie de velas, ordenadas por `time` y sin duplicados (RI-001).
 *   params: Periodos parcialmente especificados; el resto usa los defaults.
 *
 * Raises:
 *   IndicatorsError: Si algún periodo es < 1 o la serie no es válida (RI-001).
 *
 * Returns:
 *   Indicadores alineados por índice con `times`; `null` en el warm-up.
 */
export function computeIndicators(
  candles: readonly Candle[],
  params: Partial<IndicatorParameters> = {},
): IndicatorsResult {
  const maPeriods = params.maPeriods ?? MA_PERIODS_DEFAULT;
  const rsiPeriod = params.rsiPeriod ?? RSI_PERIOD_DEFAULT;
  const atrPeriod = params.atrPeriod ?? ATR_PERIOD_DEFAULT;

  for (const period of maPeriods) validatePeriod(period, 'MA');
  validatePeriod(rsiPeriod, 'RSI');
  validatePeriod(atrPeriod, 'ATR');
  validateSeries(candles);

  const times = candles.map((candle) => candle.time);
  if (candles.length === 0) {
    return { times: [], ma: new Map(), rsi: new Map(), atr: new Map() };
  }

  const closes = candles.map((candle) => candle.close);
  const ma = new Map<number, readonly (number | null)[]>();
  for (const period of maPeriods) ma.set(period, sma(closes, period));
  const rsi = new Map<number, readonly (number | null)[]>([
    [rsiPeriod, rsiWilder(closes, rsiPeriod)],
  ]);
  const atr = new Map<number, readonly (number | null)[]>([
    [atrPeriod, atrWilder(candles, atrPeriod)],
  ]);
  return { times, ma, rsi, atr };
}

/**
 * Convierte un indicador alineado en puntos de línea para lightweight-charts.
 *
 * Descarta los `null` del warm-up; cada punto conserva el `time` de la vela
 * correspondiente (RI-001) y su valor.
 */
export function toLinePoints(
  times: readonly number[],
  values: readonly (number | null)[],
): LinePoint[] {
  const points: LinePoint[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value !== null) points.push({ time: times[i], value });
  }
  return points;
}
