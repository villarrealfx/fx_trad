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
