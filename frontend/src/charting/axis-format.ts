/**
 * Formato del eje temporal en dos filas (RF-407, RF-206, RF-207, TASK-UI-406).
 *
 * La fila **superior** muestra la fecha `dd-mmm-aa` y la **inferior** `hh:mm`, en
 * UTC, según `AXIS_TOKENS.xFormatTop`/`xFormatBottom`. `selectAxisRows` elige las
 * marcas visibles aplicando el **umbral de separación** que evita el solape a zoom
 * de 2 años (R-406). El eje Y conserva su precisión (`PRICE_FORMAT`).
 */
import { AXIS_TOKENS } from '../styles/tokens';

/** Meses abreviados en español, como el `{día}` del design system (`18-nov-25`). */
const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/** Umbral de separación entre etiquetas de fecha contiguas (R-406). */
export const AXIS_DATE_MIN_GAP_PX = AXIS_TOKENS.axisRowGap * 6;

/** Umbral de separación entre etiquetas de hora contiguas. */
export const AXIS_TIME_MIN_GAP_PX = AXIS_TOKENS.axisRowGap * 4;

/**
 * Formatea un instante (segundos epoch UTC) como fecha `dd-mmm-aa`.
 *
 * @param epochSeconds Marca temporal en segundos UTC.
 * @returns Etiqueta de la fila superior, p. ej. `18-nov-25`.
 */
export function formatAxisDate(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = MONTHS_ES[date.getUTCMonth()];
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/**
 * Formatea un instante (segundos epoch UTC) como `hh:mm`.
 *
 * @param epochSeconds Marca temporal en segundos UTC.
 * @returns Etiqueta de la fila inferior, p. ej. `00:15`.
 */
export function formatAxisTime(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Marca de eje ya posicionada en píxeles. */
export interface AxisTick {
  /** Marca temporal de la vela (segundos UTC). */
  time: number;
  /** Coordenada horizontal dentro de la franja. */
  x: number;
  /** Texto de la etiqueta. */
  label: string;
}

/** Las dos filas del eje X. */
export interface AxisRows {
  /** Fila superior: fechas. */
  top: AxisTick[];
  /** Fila inferior: horas. */
  bottom: AxisTick[];
}

/** Opciones de selección de marcas del eje. */
export interface AxisRowsOptions {
  /** Ancho disponible de la franja en píxeles. */
  width: number;
  /** Umbral de separación de la fila de fechas (por defecto `AXIS_DATE_MIN_GAP_PX`). */
  minDateGapPx?: number;
  /** Umbral de separación de la fila de horas (por defecto `AXIS_TIME_MIN_GAP_PX`). */
  minTimeGapPx?: number;
}

/**
 * Selecciona las marcas visibles de las dos filas del eje X.
 *
 * Recorre las marcas temporales en orden y descarta las que caen fuera de la
 * franja (`[0, width]`). La fila superior emite una fecha **cuando cambia el día
 * UTC** y hay sitio respecto a la anterior; la inferior emite una hora si respeta
 * su umbral. El umbral es lo que garantiza que no haya solape a zoom de 2 años.
 *
 * @param times Marcas temporales de las velas (segundos UTC), en orden.
 * @param coordinateOf Proyecta un instante a píxeles (`null` si no es visible).
 * @param options Ancho de la franja y umbrales.
 */
export function selectAxisRows(
  times: ReadonlyArray<number>,
  coordinateOf: (time: number) => number | null,
  options: AxisRowsOptions,
): AxisRows {
  const minDateGapPx = options.minDateGapPx ?? AXIS_DATE_MIN_GAP_PX;
  const minTimeGapPx = options.minTimeGapPx ?? AXIS_TIME_MIN_GAP_PX;
  const top: AxisTick[] = [];
  const bottom: AxisTick[] = [];
  let emittedDay = '';
  let lastDateX = Number.NEGATIVE_INFINITY;
  let lastTimeX = Number.NEGATIVE_INFINITY;

  for (const time of times) {
    const x = coordinateOf(time);
    if (x === null || x < 0 || x > options.width) continue;

    const day = formatAxisDate(time);
    if (day !== emittedDay && x - lastDateX >= minDateGapPx) {
      top.push({ time, x, label: day });
      emittedDay = day;
      lastDateX = x;
    }
    if (x - lastTimeX >= minTimeGapPx) {
      bottom.push({ time, x, label: formatAxisTime(time) });
      lastTimeX = x;
    }
  }

  return { top, bottom };
}

/** Formato de precio del eje Y: precisión y paso mínimo de los tokens. */
export const PRICE_FORMAT = {
  type: 'price',
  precision: AXIS_TOKENS.priceDecimals,
  // 1 / 10 ** n y no 10 ** -n: V8 redondea mal el exponente entero negativo en
  // versiones antiguas y minMove pasa a depender del runtime. La division es exacta.
  minMove: 1 / 10 ** AXIS_TOKENS.priceDecimals,
} as const;
