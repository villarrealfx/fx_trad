/**
 * Cobertura real de una serie frente al rango pedido (RF-402, TASK-UI-413).
 *
 * Módulo puro que decide si a la serie le faltan velas **dentro** del rango
 * solicitado. El backend filtra de forma inclusiva sobre velas ya agregadas al
 * bucket del timeframe (`GET /series`), de modo que la primera vela puede estar
 * hasta un bucket después de `start` y la última hasta un bucket antes de `end`:
 * ese desfase es normal y **no** es una falta de cobertura. Un hueco solo cuenta
 * si pierde al menos un bucket completo y no es un cierre de fin de semana.
 */
import type { Candle, Timeframe } from '../contracts/ohlc';

/** Duración en segundos de un bucket de cada timeframe (RF-009). */
export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

/** Segundos de un día UTC. */
const DAY_SECONDS = 86400;

/** Duración máxima de un cierre de fin de semana (vie ~22:00 → dom ~22:00). */
const MAX_WEEKEND_SECONDS = 3 * DAY_SECONDS;

/** Rango pedido al backend (segundos UTC, ambos inclusivos). */
export interface CoverageRange {
  /** Inicio del rango, si se pidió. */
  start?: number;
  /** Fin del rango, si se pidió. */
  end?: number;
}

/** ¿El intervalo `(from, to]` toca sábado o domingo UTC? */
function coversWeekend(from: number, to: number): boolean {
  const firstDay = Math.floor(from / DAY_SECONDS) + 1;
  const lastDay = Math.floor(to / DAY_SECONDS);
  for (let day = firstDay; day <= lastDay; day += 1) {
    const weekday = new Date(day * DAY_SECONDS * 1000).getUTCDay();
    if (weekday === 0 || weekday === 6) return true;
  }
  return false;
}

/** ¿El hueco de `from` a `to` se explica por un cierre de fin de semana? */
function isWeekendClosure(from: number, to: number): boolean {
  return to - from <= MAX_WEEKEND_SECONDS && coversWeekend(from, to);
}

/** ¿Falta al menos un bucket completo entre `from` y `to`? */
function missesBuckets(from: number, to: number, bucket: number): boolean {
  return to - from >= bucket && !isWeekendClosure(from, to);
}

/**
 * Decide si el aviso de cobertura parcial debe mostrarse (RF-402).
 *
 * Sin ningún borde de rango no hay aviso (no se pidió nada que cubrir). Un
 * desfase menor que un bucket es el redondeo normal al bucket del timeframe; un
 * hueco que abarca sábado o domingo UTC y dura como mucho un fin de semana es un
 * cierre de mercado. Todo lo demás —borde o interior— es cobertura insuficiente.
 *
 * @param candles Velas servidas, ordenadas ascendentemente por `time`.
 * @param range Rango pedido en segundos UTC; sus bordes son opcionales.
 * @param timeframe Granularidad de la serie.
 * @returns `true` si faltan velas dentro del rango pedido.
 */
export function hasCoverageGap(
  candles: ReadonlyArray<Candle>,
  range: CoverageRange,
  timeframe: Timeframe,
): boolean {
  if (candles.length === 0) return false;
  if (range.start === undefined && range.end === undefined) return false;
  const bucket = TIMEFRAME_SECONDS[timeframe];
  const first = candles[0] as Candle;
  const last = candles[candles.length - 1] as Candle;
  if (range.start !== undefined && missesBuckets(range.start, first.time, bucket)) return true;
  if (range.end !== undefined && missesBuckets(last.time, range.end, bucket)) return true;
  for (let index = 1; index < candles.length; index += 1) {
    const previous = candles[index - 1] as Candle;
    const current = candles[index] as Candle;
    if (current.time - previous.time > bucket && !isWeekendClosure(previous.time, current.time)) {
      return true;
    }
  }
  return false;
}
