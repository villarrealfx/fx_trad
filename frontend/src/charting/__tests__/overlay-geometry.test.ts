import { describe, expect, it, vi } from 'vitest';
import {
  MARKER_HIT_RADIUS,
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
