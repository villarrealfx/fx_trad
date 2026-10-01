/**
 * Modelo y serialización del overlay de dibujos (RF-209, RI-201, ADR-017/018).
 *
 * Define la versión del documento de dibujos, resuelve el color de cada trazo
 * desde los tokens del design system (`color-draw-*`) y (de)serializa el estado
 * a JSON para su persistencia en el navegador (ver TASK-UI-240).
 *
 * El modelo reutiliza `OverlayShape` de `overlay-geometry` para no duplicar el
 * contrato geométrico; aquí solo se añade la capa de documento/validación/color.
 */
import { COLOR_TOKENS, DRAWING_COLORS } from '../styles/tokens';
import type { MarketDirection, OverlayShape, PriceTimePoint } from './overlay-geometry';

/** Versión del esquema del documento de dibujos (ADR-018). */
export const DRAWING_DOCUMENT_VERSION = 1;

/** Tipos de trazo soportados por el documento de dibujos. */
export const DRAWING_KINDS = ['line', 'rect', 'fib', 'operation', 'marker'] as const;

/** Tipo de trazo del documento de dibujos. */
export type DrawingKind = (typeof DRAWING_KINDS)[number];

/** Documento versionado con los trazos del gráfico. */
export interface DrawingDocument {
  /** Versión del esquema, para migrar/descartar (RNF-201). */
  version: number;
  /** Trazos serializados. */
  shapes: OverlayShape[];
}

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

/** Construye el documento versionado a partir de los trazos actuales. */
export function toDrawingDocument(shapes: ReadonlyArray<OverlayShape>): DrawingDocument {
  return { version: DRAWING_DOCUMENT_VERSION, shapes: [...shapes] };
}

/**
 * Extrae los trazos de un documento serializado.
 *
 * Devuelve `[]` si el documento es inválido, de una versión desconocida o
 * contiene formas malformadas (se filtran las inválidas).
 */
export function fromDrawingDocument(value: unknown): OverlayShape[] {
  if (typeof value !== 'object' || value === null) return [];
  const document = value as Partial<DrawingDocument>;
  if (document.version !== DRAWING_DOCUMENT_VERSION) return [];
  if (!Array.isArray(document.shapes)) return [];
  return document.shapes.filter(isOverlayShape);
}

/** Serializa los trazos a una cadena JSON versionada (RI-201). */
export function serializeDrawings(shapes: ReadonlyArray<OverlayShape>): string {
  return JSON.stringify(toDrawingDocument(shapes));
}

/** Deserializa una cadena JSON a trazos; `[]` ante cualquier valor inválido. */
export function deserializeDrawings(raw: string | null | undefined): OverlayShape[] {
  if (raw === null || raw === undefined || raw === '') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return fromDrawingDocument(parsed);
}
