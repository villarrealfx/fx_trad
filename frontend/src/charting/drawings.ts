/**
 * Modelo y validación del overlay de dibujos (RF-209, RI-201, ADR-017).
 *
 * Define los tipos de trazo soportados, resuelve el color de cada trazo desde los
 * tokens del design system (`color-draw-*`) y valida las formas al deserializar.
 *
 * El contrato del **documento** de configuración vive desde TASK-401 en
 * `state/chart-config` (ADR-027): este módulo ya no lo posee, de modo que
 * `charting/` no depende de `indicators/`.
 */
import { COLOR_TOKENS, DRAWING_COLORS } from '../styles/tokens';
import type { MarketDirection, OverlayShape, PriceTimePoint } from './overlay-geometry';

/** Tipos de trazo soportados por el documento de dibujos. */
export const DRAWING_KINDS = ['line', 'rect', 'fib', 'operation', 'marker'] as const;

/** Tipo de trazo del documento de dibujos. */
export type DrawingKind = (typeof DRAWING_KINDS)[number];

/** Direcciones válidas del simulador de compra/venta (RF-012). */
const MARKET_DIRECTIONS: readonly MarketDirection[] = ['buy', 'sell'];

/**
 * Devuelve el color del trazo según su tipo, tomado del design system (RF-209).
 *
 * Los trazos (línea, rectángulo, Fibonacci) usan la paleta mate; los marcadores
 * de compra/venta usan los tokens de velas (`up`/`down`).
 */
export function colorForShape(shape: OverlayShape): string {
  switch (shape.kind) {
    case 'rect':
      return DRAWING_COLORS.rect;
    case 'fib':
      return DRAWING_COLORS.fib;
    case 'marker':
      return shape.direction === 'buy' ? COLOR_TOKENS.up : COLOR_TOKENS.down;
    case 'line':
      return DRAWING_COLORS.line;
    case 'operation':
      return COLOR_TOKENS.drawOpEntry;
  }
}

/** Comprueba que un valor sea un punto precio/tiempo válido. */
function isPriceTimePoint(value: unknown): value is PriceTimePoint {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as Partial<PriceTimePoint>;
  return typeof point.time === 'number' && typeof point.price === 'number';
}

/**
 * Type guard de un trazo del overlay.
 *
 * Valida el `kind` y las anclas mínimas; descarta formas malformadas al
 * deserializar (robustez ante configuraciones corruptas, R-203).
 */
export function isOverlayShape(value: unknown): value is OverlayShape {
  if (typeof value !== 'object' || value === null) return false;
  const shape = value as Record<string, unknown>;
  if (typeof shape.id !== 'string') return false;
  if (
    shape.kind === 'line' ||
    shape.kind === 'rect' ||
    shape.kind === 'fib' ||
    shape.kind === 'operation'
  ) {
    return isPriceTimePoint(shape.from) && isPriceTimePoint(shape.to);
  }
  if (shape.kind === 'marker') {
    return (
      isPriceTimePoint(shape.position) &&
      MARKET_DIRECTIONS.includes(shape.direction as MarketDirection)
    );
  }
  return false;
}
