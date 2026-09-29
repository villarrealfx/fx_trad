/**
 * Formato de los ejes del gráfico (RF-206, RF-207, TASK-UI-230).
 *
 * El eje X muestra `{día} {HH:mm}` (día del mes + hora:minuto UTC de apertura
 * de la vela); el eje Y usa la precisión de `AXIS_TOKENS` (5 decimales), en la
 * escala de precios situada a la derecha.
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

/** Formato de precio del eje Y: precisión y paso mínimo de los tokens. */
export const PRICE_FORMAT = {
  type: 'price',
  precision: AXIS_TOKENS.priceDecimals,
  minMove: 10 ** -AXIS_TOKENS.priceDecimals,
} as const;
