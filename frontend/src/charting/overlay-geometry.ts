/**
 * Geometría del overlay de dibujos sincronizado con los ejes del gráfico
 * (ADR-005, RF-011, TASK-027).
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

/**
 * Trazo dibujable sobre el overlay (efímero, RI-003). Unión extensible
 * (RF-016): TASK-028/029/030 agregarán rectángulos, Fibonacci y marcadores.
 */
export type OverlayShape = {
  /** Identificador único del trazo dentro de la sesión. */
  id: string;
  kind: 'line';
  from: PriceTimePoint;
  to: PriceTimePoint;
};

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
  { kind: 'line'; from: PixelPoint; to: PixelPoint } | { kind: 'hidden' };

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
  }
}
