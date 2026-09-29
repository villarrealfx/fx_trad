/**
 * Posicionamiento de las marcas de compra/venta (RF-208, ADR-017).
 *
 * El triángulo debe quedar **fuera** del rango de la vela de referencia: a 10
 * pips por debajo del mínimo (compra) o por encima del máximo (venta). El valor
 * de un pip depende del par: `0.01` en pares cotizados en JPY y `0.0001` en el
 * resto (tokens `MARKER_TOKENS`).
 */
import { MARKER_TOKENS } from '../styles/tokens';
import type { MarketDirection } from './overlay-geometry';

/** Valor de un pip para el activo dado (JPY usa 0.01; el resto, 0.0001). */
export function pipValueFor(symbol: string): number {
  return symbol.toUpperCase().endsWith('JPY') ? MARKER_TOKENS.pipValueJpy : MARKER_TOKENS.pipValue;
}

/** Distancia de anclaje de la marca: `offsetPips` pips del activo. */
export function markerOffset(symbol: string): number {
  return MARKER_TOKENS.offsetPips * pipValueFor(symbol);
}

/**
 * Precio de anclaje de la marca, fuera del rango de la vela (RF-208).
 *
 * @param symbol Activo (define el valor del pip).
 * @param direction Compra (bajo el mínimo) o venta (sobre el máximo).
 * @param low Mínimo de la vela de referencia.
 * @param high Máximo de la vela de referencia.
 * @returns Precio del ancla, separado de la vela por el offset de pips.
 */
export function markerAnchorPrice(
  symbol: string,
  direction: MarketDirection,
  low: number,
  high: number,
): number {
  const offset = markerOffset(symbol);
  return direction === 'buy' ? low - offset : high + offset;
}
