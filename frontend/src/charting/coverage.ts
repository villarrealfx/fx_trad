/**
 * Cobertura real de una serie frente al rango pedido (RF-402, TASK-UI-413).
 *
 * Módulo puro que decide si a la serie le faltan velas **dentro** del rango
 * solicitado. El backend filtra de forma inclusiva sobre velas ya agregadas al
 * bucket del timeframe (`GET /series`), de modo que la primera vela puede estar
 * hasta un bucket después de `start` y la última hasta un bucket antes de `end`:
 * ese desfase es normal y **no** es una falta de cobertura.
 *
 * El mercado de divisas no cotiza de forma continua: cierra el viernes por la
 * tarde (20:00/21:00 UTC según el horario de verano) y reabre el domingo por la
 * noche (21:00/22:00 UTC). Cualquier hueco contenido en esa **ventana semanal de
 * cierre** es un cierre de mercado, no una vela ausente. La ventana se modela
 * como `[viernes 19:00 UTC, lunes 00:00 UTC)` para absorber el desplazamiento
 * por DST; el margen de una hora al abrir la ventana puede eximir un hueco de la
 * última hora del viernes (límite conocido y deliberado).
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

/** Hora UTC (viernes) a la que empieza la ventana semanal de cierre. */
const WEEK_CLOSE_HOUR = 19;

/** Duración de la ventana `[viernes 19:00, lunes 00:00)`: 2 días y 5 horas. */
const WEEK_CLOSE_SECONDS = 2 * DAY_SECONDS + 5 * 3600;

/** Rango pedido al backend (segundos UTC, ambos inclusivos). */
export interface CoverageRange {
  /** Inicio del rango, si se pidió. */
  start?: number;
  /** Fin del rango, si se pidió. */
  end?: number;
}

/** Día de la semana UTC del instante dado (0 = lunes … 6 = domingo). */
function utcWeekday(timestamp: number): number {
  // El 1 de enero de 1970 (epoch) fue jueves, es decir índice 3 contando desde lunes.
  return (Math.floor(timestamp / DAY_SECONDS) + 3) % 7;
}

/** Inicio de la ventana de cierre de la semana a la que pertenece el instante. */
function weekCloseStart(timestamp: number): number {
  const monday = timestamp - utcWeekday(timestamp) * DAY_SECONDS - (timestamp % DAY_SECONDS);
  return monday + 4 * DAY_SECONDS + WEEK_CLOSE_HOUR * 3600;
}

/** ¿El hueco de `from` a `to` cae dentro de la ventana semanal de cierre? */
function isMarketClosure(from: number, to: number): boolean {
  const start = weekCloseStart(from);
  return from >= start && to <= start + WEEK_CLOSE_SECONDS;
}

/** ¿Falta al menos un bucket completo entre `from` y `to`, sin ser cierre? */
function missesBuckets(from: number, to: number, bucket: number): boolean {
  return to - from >= bucket && !isMarketClosure(from, to);
}

/**
 * Decide si el aviso de cobertura parcial debe mostrarse (RF-402).
 *
 * Sin ningún borde de rango no hay aviso (no se pidió nada que cubrir). Un
 * desfase menor que un bucket es el redondeo normal al bucket del timeframe; un
 * hueco contenido en la ventana semanal de cierre es el fin de semana del
 * mercado. Todo lo demás —borde o interior— es cobertura insuficiente.
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
    if (current.time - previous.time > bucket && !isMarketClosure(previous.time, current.time)) {
      return true;
    }
  }
  return false;
}
