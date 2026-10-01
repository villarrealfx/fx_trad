import { describe, expect, it, vi } from 'vitest';
import {
  FIB_LEVELS,
  MARKER_HIT_RADIUS,
  hitTestFragment,
  hitTestMarker,
  projectPoint,
  projectShape,
  type CoordinateMapper,
  type OverlayShape,
  type PriceTimePoint,
} from '../overlay-geometry';

const POINT: PriceTimePoint = { time: 1_781_000_000, price: 1.08 };

function makeMapper(
  timeToCoordinate: (time: number) => number | null,
  priceToCoordinate: (price: number) => number | null,
): CoordinateMapper {
  return { timeToCoordinate, priceToCoordinate };
}

describe('projectPoint', () => {
  it('projects a domain anchor to pixels using the supplied mapper', () => {
    const mapper = makeMapper(
      () => 10,
      () => 20,
    );
    expect(projectPoint(POINT, mapper)).toEqual({ x: 10, y: 20 });
  });

  it('delegates the anchor (never a cached value) to the mapper', () => {
    const timeToCoordinate = vi.fn(() => 10);
    const priceToCoordinate = vi.fn(() => 20);
    projectPoint(POINT, makeMapper(timeToCoordinate, priceToCoordinate));
    expect(timeToCoordinate).toHaveBeenCalledWith(POINT.time);
    expect(priceToCoordinate).toHaveBeenCalledWith(POINT.price);
  });

  it('returns null when the time axis hides the point', () => {
    const mapper = makeMapper(
      () => null,
      () => 20,
    );
    expect(projectPoint(POINT, mapper)).toBeNull();
  });

  it('returns null when the price axis hides the point', () => {
    const mapper = makeMapper(
      () => 10,
      () => null,
    );
    expect(projectPoint(POINT, mapper)).toBeNull();
  });
});

describe('projectShape', () => {
  const SHAPE: OverlayShape = {
    id: 'trazo-1',
    kind: 'line',
    from: { time: 1_781_000_000, price: 1.08 },
    to: { time: 1_781_003_600, price: 1.095 },
  };

  it('projects both ends of a line shape', () => {
    const mapper = makeMapper(
      (time) => (time === 1_781_000_000 ? 0 : 100),
      (price) => (price === 1.08 ? 50 : 25),
    );
    expect(projectShape(SHAPE, mapper)).toEqual({
      kind: 'line',
      from: { x: 0, y: 50 },
      to: { x: 100, y: 25 },
    });
  });

  it('hides a line when any endpoint leaves the visible range', () => {
    const mapper = makeMapper(
      (time) => (time === 1_781_000_000 ? 0 : null),
      () => 50,
    );
    expect(projectShape(SHAPE, mapper)).toEqual({ kind: 'hidden' });
  });

  it('reprojects the same anchors to new pixels after a pan/zoom', () => {
    const beforePan = makeMapper(
      () => 10,
      () => 20,
    );
    const afterPan = makeMapper(
      () => 300,
      () => 150,
    );
    const before = projectPoint(POINT, beforePan);
    const after = projectPoint(POINT, afterPan);
    expect(before).toEqual({ x: 10, y: 20 });
    expect(after).toEqual({ x: 300, y: 150 });
    expect(POINT).toEqual({ time: 1_781_000_000, price: 1.08 });
  });
});

describe('projectShape marker (TASK-030)', () => {
  const MARKER: OverlayShape = {
    id: 'buy-1',
    kind: 'marker',
    position: { time: 1_781_000_000, price: 1.5 },
    direction: 'buy',
  };

  it('projects a visible marker to its anchor pixel with direction', () => {
    const mapper = makeMapper(
      () => 10,
      () => 40,
    );
    expect(projectShape(MARKER, mapper)).toEqual({
      kind: 'marker',
      position: { x: 10, y: 40 },
      direction: 'buy',
    });
  });

  it('hides a marker whose anchor leaves the visible range', () => {
    const mapper = makeMapper(
      () => null,
      () => 40,
    );
    expect(projectShape(MARKER, mapper)).toEqual({ kind: 'hidden' });
  });
});

describe('hitTestMarker', () => {
  it('hits a marker inside the grab radius', () => {
    expect(hitTestMarker({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true);
  });

  it('misses a marker outside the grab radius', () => {
    const far = MARKER_HIT_RADIUS + 1;
    expect(hitTestMarker({ x: 0, y: 0 }, { x: far, y: 0 })).toBe(false);
  });
});

describe('projectShape rect (TASK-028)', () => {
  const RECT: OverlayShape = {
    id: 'rect-1',
    kind: 'rect',
    from: { time: 1_781_000_000, price: 1.08 },
    to: { time: 1_781_003_600, price: 1.095 },
  };

  it('projects both corners of a rectangle', () => {
    const mapper = makeMapper(
      (time) => (time === 1_781_000_000 ? 0 : 100),
      (price) => (price === 1.08 ? 50 : 25),
    );
    expect(projectShape(RECT, mapper)).toEqual({
      kind: 'rect',
      from: { x: 0, y: 50 },
      to: { x: 100, y: 25 },
    });
  });

  it('hides a rectangle when any corner leaves the visible range', () => {
    const mapper = makeMapper(
      () => 0,
      (price) => (price === 1.08 ? 50 : null),
    );
    expect(projectShape(RECT, mapper)).toEqual({ kind: 'hidden' });
  });
});

describe('projectShape fib (TASK-029)', () => {
  const FIB: OverlayShape = {
    id: 'fib-1',
    kind: 'fib',
    from: { time: 1_781_000_000, price: 1.0 },
    to: { time: 1_781_003_600, price: 2.0 },
  };

  it('projects every fibonacci level between both anchors', () => {
    const mapper = makeMapper(
      (time) => (time === 1_781_000_000 ? 0 : 100),
      (price) => price * 100,
    );
    const fragment = projectShape(FIB, mapper);
    if (fragment.kind !== 'fib') throw new Error('expected fib fragment');

    expect(fragment.levels).toHaveLength(FIB_LEVELS.length);
    expect(fragment.levels[0]).toEqual({ ratio: 0, y: 100 });
    expect(fragment.levels[fragment.levels.length - 1]).toEqual({ ratio: 1, y: 200 });
  });

  it('hides the fib when an anchor leaves the visible range', () => {
    const mapper = makeMapper(
      () => null,
      () => 100,
    );
    expect(projectShape(FIB, mapper)).toEqual({ kind: 'hidden' });
  });

  it('drops levels whose price is not visible', () => {
    const mapper = makeMapper(
      () => 0,
      (price) => (price === 1.5 ? null : 100),
    );
    const fragment = projectShape(FIB, mapper);
    if (fragment.kind !== 'fib') throw new Error('expected fib fragment');

    expect(fragment.levels.length).toBeLessThan(FIB_LEVELS.length);
    expect(fragment.levels.every((level) => level.y === 100)).toBe(true);
  });
});

describe('projectShape operation (TASK-304)', () => {
  const OPERATION: OverlayShape = {
    id: 'op-1',
    kind: 'operation',
    from: { time: 1_781_000_000, price: 1.1 },
    to: { time: 1_781_003_600, price: 1.095 },
  };
  // Precio → y: crece hacia abajo; separa los cinco precios del ejemplo RF-303.
  const priceMapper = makeMapper(
    () => 0,
    (price) => (1.12 - price) * 100_000,
  );

  it('projects exactly the five levels with their mapped y', () => {
    const fragment = projectShape(OPERATION, priceMapper);
    if (fragment.kind !== 'operation') throw new Error('expected an operation fragment');

    expect(fragment.levels.map((level) => level.key)).toEqual([
      'tp2',
      'tp15',
      'tp1382',
      'entry',
      'sl',
    ]);
    const yByKey = Object.fromEntries(fragment.levels.map((level) => [level.key, level.y]));
    expect(yByKey.tp2).toBeCloseTo(1000, 4);
    expect(yByKey.tp15).toBeCloseTo(1250, 4);
    expect(yByKey.tp1382).toBeCloseTo(1309, 4);
    expect(yByKey.entry).toBeCloseTo(2000, 4);
    expect(yByKey.sl).toBeCloseTo(2500, 4);
  });

  it('keeps the label and color role of each level', () => {
    const fragment = projectShape(OPERATION, priceMapper);
    if (fragment.kind !== 'operation') throw new Error('expected an operation fragment');

    const byKey = new Map(fragment.levels.map((level) => [level.key, level]));
    expect(byKey.get('tp1382')?.label).toBe('TP 1.382');
    expect(byKey.get('tp1382')?.colorRole).toBe('tp');
    expect(byKey.get('sl')?.colorRole).toBe('sl');
    expect(byKey.get('entry')?.colorRole).toBe('entry');
  });

  it('drops levels whose price leaves the visible range', () => {
    const partial = makeMapper(
      () => 0,
      (price) => (price > 1.109 ? null : 100),
    );
    const fragment = projectShape(OPERATION, partial);
    if (fragment.kind !== 'operation') throw new Error('expected an operation fragment');

    expect(fragment.levels.map((level) => level.key)).toEqual(['tp15', 'tp1382', 'entry', 'sl']);
  });

  it('projects five coincident levels on zero risk without NaN', () => {
    const zeroRisk: OverlayShape = {
      id: 'op-0',
      kind: 'operation',
      from: { time: 1_781_000_000, price: 1.1 },
      to: { time: 1_781_000_000, price: 1.1 },
    };
    const fragment = projectShape(zeroRisk, priceMapper);
    if (fragment.kind !== 'operation') throw new Error('expected an operation fragment');

    expect(fragment.levels).toHaveLength(5);
    expect(new Set(fragment.levels.map((level) => level.y)).size).toBe(1);
  });
});

describe('hitTestFragment (TASK-028)', () => {
  it('hits a line near its segment and misses far away', () => {
    const line = { kind: 'line' as const, from: { x: 0, y: 0 }, to: { x: 100, y: 0 } };
    expect(hitTestFragment({ x: 50, y: 5 }, line)).toBe(true);
    expect(hitTestFragment({ x: 50, y: 30 }, line)).toBe(false);
  });

  it('hits a rectangle on its edges but not its empty center', () => {
    const rect = { kind: 'rect' as const, from: { x: 0, y: 0 }, to: { x: 100, y: 80 } };
    expect(hitTestFragment({ x: 0, y: 40 }, rect)).toBe(true);
    expect(hitTestFragment({ x: 50, y: 40 }, rect)).toBe(false);
  });

  it('hits a fibonacci level line (TASK-029)', () => {
    const fib = {
      kind: 'fib' as const,
      from: { x: 0, y: 0 },
      to: { x: 100, y: 100 },
      levels: [{ ratio: 0.5, y: 50 }],
    };
    expect(hitTestFragment({ x: 50, y: 52 }, fib)).toBe(true);
    expect(hitTestFragment({ x: 50, y: 0 }, fib)).toBe(false);
  });

  it('never hits a hidden fragment', () => {
    expect(hitTestFragment({ x: 0, y: 0 }, { kind: 'hidden' })).toBe(false);
  });
});

describe('hitTestFragment operation (TASK-304)', () => {
  const fragment = {
    kind: 'operation' as const,
    levels: [
      {
        key: 'entry' as const,
        label: 'Entrada',
        price: 1.1,
        multiplier: null,
        colorRole: 'entry' as const,
        y: 100,
      },
      {
        key: 'sl' as const,
        label: 'SL',
        price: 1.095,
        multiplier: null,
        colorRole: 'sl' as const,
        y: 200,
      },
    ],
  };

  it('hits any of the five lines within the 6px radius', () => {
    expect(hitTestFragment({ x: 999, y: 104 }, fragment)).toBe(true);
    expect(hitTestFragment({ x: 0, y: 196 }, fragment)).toBe(true);
  });

  it('misses a line beyond the grab radius', () => {
    expect(hitTestFragment({ x: 0, y: 107 }, fragment)).toBe(false);
    expect(hitTestFragment({ x: 0, y: 150 }, fragment)).toBe(false);
  });
});

describe('operation projection and hit-test (TASK-305)', () => {
  const OPERATION: OverlayShape = {
    id: 'op-1',
    kind: 'operation',
    from: { time: 1_781_000_000, price: 1.1 },
    to: { time: 1_781_003_600, price: 1.095 },
  };
  const priceMapper = makeMapper(
    () => 0,
    (price) => (1.12 - price) * 100_000,
  );

  it('hits each of the five projected levels and misses just outside the radius', () => {
    const fragment = projectShape(OPERATION, priceMapper);
    if (fragment.kind !== 'operation') throw new Error('expected an operation fragment');
    expect(fragment.levels).toHaveLength(5);

    for (const level of fragment.levels) {
      expect(hitTestFragment({ x: 0, y: level.y }, fragment)).toBe(true);
      expect(hitTestFragment({ x: 0, y: level.y + 7 }, fragment)).toBe(false);
    }
  });

  it('keeps the three targets finite and coincident with the entry on zero risk', () => {
    const zeroRisk: OverlayShape = {
      id: 'op-0',
      kind: 'operation',
      from: { time: 1_781_000_000, price: 1.1 },
      to: { time: 1_781_000_000, price: 1.1 },
    };
    const fragment = projectShape(zeroRisk, priceMapper);
    if (fragment.kind !== 'operation') throw new Error('expected an operation fragment');

    expect(fragment.levels.every((level) => Number.isFinite(level.y))).toBe(true);
    const entry = fragment.levels.find((level) => level.key === 'entry');
    const targets = fragment.levels.filter((level) => level.colorRole === 'tp');
    expect(targets).toHaveLength(3);
    for (const target of targets) {
      expect(target.price).toBe(entry?.price);
      expect(target.y).toBe(entry?.y);
    }
  });
});
