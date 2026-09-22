/**
 * Geometría del overlay de dibujos sincronizado con los ejes del gráfico
 * (ADR-005, RF-011/RF-012, TASK-027/030).
 *
 * Un trazo se define por anclas de dominio (segundo UTC + precio) y se
 * proyecta a píxeles con el mapeo actual de lightweight-charts. El anclaje
 * durante pan/zoom se garantiza re-proyectando las anclas en cada redibujo
 * (nunca se cachean píxeles): un cambio de rango produce píxeles nuevos para
 * las mismas anclas de precio/tiempo.
 */

/** Ancla de un trazo en coordenadas del dominio del gráfico. */
export interface PriceTimePoint {
  /** Segundo UTC del ancla horizontal. */
  time: number;
  /** Precio del ancla vertical. */
  price: number;
}

/** Dirección de un marcador del simulador de compra/venta (RF-012). */
export type MarketDirection = 'buy' | 'sell';

/** Trazo efímero (RI-003) superpuesto al gráfico. Unión extensible (RF-016):
 *  TASK-028/029 agregan rectángulos y Fibonacci; TASK-030 introduce marcador. */
export type OverlayShape =
  | {
      /** Identificador único del trazo dentro de la sesión. */
      id: string;
      kind: 'line';
      from: PriceTimePoint;
      to: PriceTimePoint;
    }
  | {
      /** Identificador único del marcador dentro de la sesión. */
      id: string;
      kind: 'marker';
      /** Ancla del marcador: barra (precio/tiempo) bajo el cursor (RF-012). */
      position: PriceTimePoint;
      direction: MarketDirection;
    };

/** Subtipo específico de marcador del simulador (compra/venta). */
export type MarkerShape = Extract<OverlayShape, { kind: 'marker' }>;

/** Mapeo precio/tiempo → píxeles provisto por el chart (TASK-027). */
export interface CoordinateMapper {
  /** Coordenada x para un segundo UTC; null si quedó fuera de vista. */
  timeToCoordinate(time: number): number | null;
  /** Coordenada y para un precio; null si quedó fuera de vista. */
  priceToCoordinate(price: number): number | null;
}

/** Punto proyectado a píxeles del lienzo. */
export interface PixelPoint {
  x: number;
  y: number;
}

/** Resultado de proyectar un trazo (o descartarlo si sale de la vista). */
export type OverlayFragment =
  | { kind: 'line'; from: PixelPoint; to: PixelPoint }
  | { kind: 'marker'; position: PixelPoint; direction: MarketDirection }
  | { kind: 'hidden' };

/** Proyecta una ancla de dominio a píxeles; null si sale de la vista. */
export function projectPoint(point: PriceTimePoint, mapper: CoordinateMapper): PixelPoint | null {
  const x = mapper.timeToCoordinate(point.time);
  const y = mapper.priceToCoordinate(point.price);
  if (x === null || y === null) return null;
  return { x, y };
}

/**
 * Proyecta un trazo completo al lienzo. Si alguna ancla no es visible, el
 * fragmento queda oculto (lightweight-charts devuelve null fuera de vista).
 */
export function projectShape(shape: OverlayShape, mapper: CoordinateMapper): OverlayFragment {
  switch (shape.kind) {
    case 'line': {
      const from = projectPoint(shape.from, mapper);
      const to = projectPoint(shape.to, mapper);
      if (from === null || to === null) return { kind: 'hidden' };
      return { kind: 'line', from, to };
    }
    case 'marker': {
      const position = projectPoint(shape.position, mapper);
      if (position === null) return { kind: 'hidden' };
      return { kind: 'marker', position, direction: shape.direction };
    }
  }
}

/** Radio de grabado para seleccionar un marcador con el cursor (TASK-030). */
export const MARKER_HIT_RADIUS = 12;

/** Hit-test euclidiano de un marcador proyectado contra el punto del cursor. */
export function hitTestMarker(
  cursor: PixelPoint,
  position: PixelPoint,
  radius: number = MARKER_HIT_RADIUS,
): boolean {
  const dx = cursor.x - position.x;
  const dy = cursor.y - position.y;
  return dx * dx + dy * dy <= radius * radius;
}
