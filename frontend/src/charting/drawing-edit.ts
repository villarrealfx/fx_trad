/**
 * Geometría editable del overlay de dibujos (RF-212, ADR-017).
 *
 * Funciones puras para mover y redimensionar trazos ya colocados: posiciones de
 * los handles (extremos), hit-test de handles con target de 24px (a11y) y
 * transformaciones de anclas en coordenadas de dominio (tiempo/precio). No
 * gestionan estado ni eventos: eso vive en el hook `use-drawing-edit`.
 */
import {
  projectPoint,
  type CoordinateMapper,
  type OverlayShape,
  type PixelPoint,
  type PriceTimePoint,
} from './overlay-geometry';

/** Tamaño del target de agarre de un handle en píxeles (WCAG, `accessibility.md`). */
export const HANDLE_HIT_SIZE = 24;

/** Tamaño visual del cuadro de handle dibujado en el overlay. */
export const HANDLE_DRAW_SIZE = 8;

/** Identificador de un extremo editable de un trazo. */
export type HandleId = 'from' | 'to';

/** Handle proyectado a píxeles. */
export interface DrawingHandle {
  /** Extremo que representa. */
  id: HandleId;
  /** Posición del handle en píxeles del lienzo. */
  point: PixelPoint;
}

/** Trazos con dos anclas editables (línea, rectángulo y Fibonacci). */
export type ResizableShape = Extract<OverlayShape, { kind: 'line' | 'rect' | 'fib' }>;

/** Mapeo inverso píxel → dominio (tiempo/precio) provisto por el chart. */
export interface InverseCoordinateMapper {
  /** Segundo UTC para una coordenada x; null si no hay dato en esa posición. */
  coordinateToTime(x: number): number | null;
  /** Precio para una coordenada y; null si no hay dato en esa posición. */
  coordinateToPrice(y: number): number | null;
}

/** Indica si un trazo admite handles de movimiento/redimensionado (RF-212). */
export function isResizableShape(shape: OverlayShape): shape is ResizableShape {
  return shape.kind === 'line' || shape.kind === 'rect' || shape.kind === 'fib';
}

/** Proyecta los extremos de un trazo a handles en píxeles. */
export function handlePositions(shape: OverlayShape, mapper: CoordinateMapper): DrawingHandle[] {
  if (!isResizableShape(shape)) return [];
  const from = projectPoint(shape.from, mapper);
  const to = projectPoint(shape.to, mapper);
  const handles: DrawingHandle[] = [];
  if (from !== null) handles.push({ id: 'from', point: from });
  if (to !== null) handles.push({ id: 'to', point: to });
  return handles;
}

/**
 * Hit-test de handles contra el cursor con target cuadrado de `size` (24px).
 *
 * Devuelve el extremo impactado o `null`. El target es independiente del tamaño
 * visual del handle para cumplir el mínimo de accesibilidad.
 */
export function hitTestHandle(
  cursor: PixelPoint,
  shape: OverlayShape,
  mapper: CoordinateMapper,
  size: number = HANDLE_HIT_SIZE,
): HandleId | null {
  const half = size / 2;
  for (const handle of handlePositions(shape, mapper)) {
    const withinX = Math.abs(cursor.x - handle.point.x) <= half;
    const withinY = Math.abs(cursor.y - handle.point.y) <= half;
    if (withinX && withinY) return handle.id;
  }
  return null;
}

/**
 * Restringe un ancla a horizontal o vertical respecto de `from` (RF-210).
 *
 * Se usa con la tecla `Shift`: se elige el eje con mayor desplazamiento en
 * píxeles — horizontal (mismo precio que `from`) si `|dx| ≥ |dy|`, vertical
 * (mismo tiempo que `from`) en caso contrario.
 */
export function constrainToAxis(
  from: PriceTimePoint,
  to: PriceTimePoint,
  fromPixel: PixelPoint,
  toPixel: PixelPoint,
): PriceTimePoint {
  const dx = Math.abs(toPixel.x - fromPixel.x);
  const dy = Math.abs(toPixel.y - fromPixel.y);
  return dx >= dy ? { time: to.time, price: from.price } : { time: from.time, price: to.price };
}

/** Convierte un punto de píxeles a un ancla de dominio (inverso del chart). */
export function pixelToAnchor(
  point: PixelPoint,
  mapper: InverseCoordinateMapper,
): PriceTimePoint | null {
  const time = mapper.coordinateToTime(point.x);
  const price = mapper.coordinateToPrice(point.y);
  if (time === null || price === null) return null;
  return { time, price };
}

/** Redimensiona un trazo moviendo el extremo indicado al ancla dada (RF-212). */
export function resizeShape(
  shape: OverlayShape,
  handle: HandleId,
  anchor: PriceTimePoint,
): OverlayShape {
  if (!isResizableShape(shape)) return shape;
  return handle === 'from' ? { ...shape, from: anchor } : { ...shape, to: anchor };
}

/** Desplaza todas las anclas de un trazo por el delta de dominio dado (RF-212). */
export function moveShapeBy(
  shape: OverlayShape,
  deltaTime: number,
  deltaPrice: number,
): OverlayShape {
  const shift = (point: PriceTimePoint): PriceTimePoint => ({
    time: point.time + deltaTime,
    price: point.price + deltaPrice,
  });
  if (shape.kind === 'marker') {
    return { ...shape, position: shift(shape.position) };
  }
  return { ...shape, from: shift(shape.from), to: shift(shape.to) };
}
