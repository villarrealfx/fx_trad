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

/** Niveles de retroceso de Fibonacci por defecto (RF-011, SCR-004). */
export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

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
      /** Identificador único del rectángulo dentro de la sesión. */
      id: string;
      kind: 'rect';
      /** Esquina de anclaje 1 (tiempo/precio). */
      from: PriceTimePoint;
      /** Esquina de anclaje 2 (tiempo/precio). */
      to: PriceTimePoint;
    }
  | {
      /** Identificador único del retroceso de Fibonacci (RF-011). */
      id: string;
      kind: 'fib';
      /** Ancla del swing 1 (0%). */
      from: PriceTimePoint;
      /** Ancla del swing 2 (100%). */
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
  | { kind: 'rect'; from: PixelPoint; to: PixelPoint }
  | {
      kind: 'fib';
      from: PixelPoint;
      to: PixelPoint;
      levels: { ratio: number; y: number }[];
    }
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
    case 'rect': {
      const from = projectPoint(shape.from, mapper);
      const to = projectPoint(shape.to, mapper);
      if (from === null || to === null) return { kind: 'hidden' };
      return { kind: 'rect', from, to };
    }
    case 'fib': {
      const from = projectPoint(shape.from, mapper);
      const to = projectPoint(shape.to, mapper);
      if (from === null || to === null) return { kind: 'hidden' };
      const levels = FIB_LEVELS.flatMap((ratio) => {
        const price = shape.from.price + ratio * (shape.to.price - shape.from.price);
        const y = mapper.priceToCoordinate(price);
        return y === null ? [] : [{ ratio, y }];
      });
      return { kind: 'fib', from, to, levels };
    }
    case 'marker': {
      const position = projectPoint(shape.position, mapper);
      if (position === null) return { kind: 'hidden' };
      return { kind: 'marker', position, direction: shape.direction };
    }
  }
}

/** Distancia euclidiana de un punto al segmento ``a``–``b``. */
function distanceToSegment(point: PixelPoint, a: PixelPoint, b: PixelPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/**
 * Hit-test de un fragmento proyectado contra el cursor (TASK-028).
 *
 * `line` usa la distancia al segmento; `rect` la distancia a sus cuatro
 * aristas; `marker` el radio de grabado; `hidden` nunca impacta.
 */
export function hitTestFragment(
  cursor: PixelPoint,
  fragment: OverlayFragment,
  radius: number = MARKER_HIT_RADIUS,
): boolean {
  if (fragment.kind === 'hidden') return false;
  if (fragment.kind === 'marker') return hitTestMarker(cursor, fragment.position, radius);
  if (fragment.kind === 'line') {
    return distanceToSegment(cursor, fragment.from, fragment.to) <= radius;
  }
  if (fragment.kind === 'fib') {
    const x1 = Math.min(fragment.from.x, fragment.to.x);
    const x2 = Math.max(fragment.from.x, fragment.to.x);
    return fragment.levels.some(
      (level) => distanceToSegment(cursor, { x: x1, y: level.y }, { x: x2, y: level.y }) <= radius,
    );
  }
  const { from, to } = fragment;
  const topLeft = { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y) };
  const bottomRight = { x: Math.max(from.x, to.x), y: Math.max(from.y, to.y) };
  const topRight = { x: bottomRight.x, y: topLeft.y };
  const bottomLeft = { x: topLeft.x, y: bottomRight.y };
  const edges: [PixelPoint, PixelPoint][] = [
    [topLeft, topRight],
    [topRight, bottomRight],
    [bottomRight, bottomLeft],
    [bottomLeft, topLeft],
  ];
  return edges.some(([a, b]) => distanceToSegment(cursor, a, b) <= radius);
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
