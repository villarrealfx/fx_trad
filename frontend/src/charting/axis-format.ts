/**
 * Formato de los ejes del gráfico (RF-206, RF-207, RF-407).
 *
 * El eje X usa el **formato original de una fila** `{día} {HH:mm}` sobre el eje
 * nativo de la librería (que conserva el arrastre/zoom); el eje Y usa la precisión
 * de `AXIS_TOKENS` (5 decimales) en la escala derecha. `formatAxisDate` y
 * `formatAxisTime` se conservan porque los usa la cabecera «fecha · hora» del
 * menú contextual de vela (CMP-024, RF-408).
 */
import { AXIS_TOKENS } from '../styles/tokens';

/**
 * Formatea un instante (segundos epoch UTC) como `{día} {HH:mm}`.
 *
 * @param epochSeconds Marca temporal en segundos UTC.
 * @returns Etiqueta de eje, p. ej. `1 00:15`.
 */
export function formatAxisLabel(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000);
  const day = date.getUTCDate();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day} ${hours}:${minutes}`;
}

/** Meses abreviados en español para la cabecera del menú contextual (CMP-024). */
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

/**
 * Formatea un instante (segundos epoch UTC) como fecha `dd-mmm-aa`.
 *
 * @param epochSeconds Marca temporal en segundos UTC.
 * @returns Fecha, p. ej. `18-nov-25`.
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
 * @returns Hora, p. ej. `00:15`.
 */
export function formatAxisTime(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Formato de precio del eje Y: precisión y paso mínimo de los tokens. */
export const PRICE_FORMAT = {
  type: 'price',
  precision: AXIS_TOKENS.priceDecimals,
  // 1 / 10 ** n y no 10 ** -n: V8 redondea mal el exponente entero negativo en
  // versiones antiguas y minMove pasa a depender del runtime. La division es exacta.
  minMove: 1 / 10 ** AXIS_TOKENS.priceDecimals,
} as const;
