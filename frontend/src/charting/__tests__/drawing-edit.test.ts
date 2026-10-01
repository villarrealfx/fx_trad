// @vitest-environment node
/**
 * Tests de la geometría editable de dibujos (TASK-UI-221, RF-212).
 *
 * Verifican posiciones de handles, hit-test con target de 24px, conversión de
 * píxeles a dominio y las transformaciones de mover/redimensionar. Patrón AAA.
 */
import { describe, expect, it } from 'vitest';
import {
  HANDLE_HIT_SIZE,
  constrainToAxis,
  hitTestHandle,
  handlePositions,
  isResizableShape,
  moveShapeBy,
  pixelToAnchor,
  resizeShape,
} from '../drawing-edit';
import type { CoordinateMapper, OverlayShape } from '../overlay-geometry';

/** Mapeo identidad: dominio y píxeles coinciden para tests deterministas. */
const identityMapper: CoordinateMapper = {
  timeToCoordinate: (time) => time,
  priceToCoordinate: (price) => price,
};

const LINE: OverlayShape = {
  id: 'line-1',
  kind: 'line',
  from: { time: 0, price: 0 },
  to: { time: 10, price: 10 },
};

const MARKER: OverlayShape = {
  id: 'buy-1',
  kind: 'marker',
  position: { time: 5, price: 5 },
  direction: 'buy',
};

const OPERATION: OverlayShape = {
  id: 'op-1',
  kind: 'operation',
  from: { time: 0, price: 1.1 },
  to: { time: 10, price: 1.095 },
};

describe('isResizableShape', () => {
  it('acepta línea, rectángulo, fibonacci y operación', () => {
    expect(isResizableShape(LINE)).toBe(true);
    expect(isResizableShape({ ...LINE, kind: 'rect' })).toBe(true);
    expect(isResizableShape({ ...LINE, kind: 'fib' })).toBe(true);
    expect(isResizableShape(OPERATION)).toBe(true);
  });

  it('rechaza los marcadores', () => {
    expect(isResizableShape(MARKER)).toBe(false);
  });
});

describe('handlePositions', () => {
  it('proyecta los dos extremos de un trazo', () => {
    expect(handlePositions(LINE, identityMapper)).toEqual([
      { id: 'from', point: { x: 0, y: 0 } },
      { id: 'to', point: { x: 10, y: 10 } },
    ]);
  });

  it('proyecta los dos handles de la operación (RF-307)', () => {
    expect(handlePositions(OPERATION, identityMapper)).toEqual([
      { id: 'from', point: { x: 0, y: 1.1 } },
      { id: 'to', point: { x: 10, y: 1.095 } },
    ]);
  });

  it('devuelve [] para trazos no redimensionables', () => {
    expect(handlePositions(MARKER, identityMapper)).toEqual([]);
  });
});

describe('hitTestHandle', () => {
  it('impacta dentro del target de 24px', () => {
    expect(HANDLE_HIT_SIZE).toBe(24);
    expect(hitTestHandle({ x: 11, y: 0 }, LINE, identityMapper)).toBe('from');
    expect(hitTestHandle({ x: 22, y: 10 }, LINE, identityMapper)).toBe('to');
  });

  it('no impacta fuera del target', () => {
    expect(hitTestHandle({ x: 30, y: 30 }, LINE, identityMapper)).toBeNull();
  });
});

describe('pixelToAnchor', () => {
  it('convierte píxeles a ancla de dominio', () => {
    const inverse = { coordinateToTime: (x: number) => x, coordinateToPrice: (y: number) => y };
    expect(pixelToAnchor({ x: 3, y: 4 }, inverse)).toEqual({ time: 3, price: 4 });
  });

  it('devuelve null si el mapeo no resuelve', () => {
    const inverse = { coordinateToTime: () => null, coordinateToPrice: (y: number) => y };
    expect(pixelToAnchor({ x: 1, y: 1 }, inverse)).toBeNull();
  });
});

describe('resizeShape', () => {
  it('mueve el extremo indicado al ancla', () => {
    expect(resizeShape(LINE, 'from', { time: 3, price: 3 })).toEqual({
      ...LINE,
      from: { time: 3, price: 3 },
    });
    expect(resizeShape(LINE, 'to', { time: 8, price: 8 })).toEqual({
      ...LINE,
      to: { time: 8, price: 8 },
    });
  });

  it('deja intactos los trazos no redimensionables', () => {
    expect(resizeShape(MARKER, 'from', { time: 1, price: 1 })).toBe(MARKER);
  });

  it('mueve el extremo del Stop Loss de una operación (RF-307)', () => {
    expect(resizeShape(OPERATION, 'to', { time: 10, price: 1.09 })).toEqual({
      ...OPERATION,
      to: { time: 10, price: 1.09 },
    });
  });
});

describe('constrainToAxis (RF-210)', () => {
  const FROM = { time: 0, price: 1 };
  const TO = { time: 100, price: 2 };

  it('fija el precio (horizontal) cuando el desplazamiento es mayor en X', () => {
    const result = constrainToAxis(FROM, TO, { x: 0, y: 0 }, { x: 50, y: 10 });
    expect(result).toEqual({ time: 100, price: 1 });
  });

  it('fija el tiempo (vertical) cuando el desplazamiento es mayor en Y', () => {
    const result = constrainToAxis(FROM, TO, { x: 0, y: 0 }, { x: 5, y: 40 });
    expect(result).toEqual({ time: 0, price: 2 });
  });

  it('elige horizontal ante desplazamientos iguales', () => {
    expect(constrainToAxis(FROM, TO, { x: 0, y: 0 }, { x: 20, y: 20 })).toEqual({
      time: 100,
      price: 1,
    });
  });
});

describe('moveShapeBy', () => {
  it('desplaza ambos extremos de un trazo', () => {
    expect(moveShapeBy(LINE, 2, 3)).toEqual({
      ...LINE,
      from: { time: 2, price: 3 },
      to: { time: 12, price: 13 },
    });
  });

  it('desplaza la posición de un marcador', () => {
    expect(moveShapeBy(MARKER, -1, 0.5)).toEqual({
      ...MARKER,
      position: { time: 4, price: 5.5 },
    });
  });
});
