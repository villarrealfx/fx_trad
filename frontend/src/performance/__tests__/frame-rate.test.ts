import { beforeEach, describe, expect, it } from 'vitest';
import {
  FRAME_BUDGET_MS,
  FrameRateMeter,
  measureFrameWork,
  type FrameRateMeterOptions,
} from '../frame-rate';

/**
 * Planificador manual: emula un bucle de `requestAnimationFrame` de una sola
 * cadena con reloj controlable, para tests deterministas.
 */
function createManualScheduler() {
  let currentTime = 0;
  let nextId = 0;
  let pending: { id: number; cb: FrameRequestCallback } | null = null;
  return {
    now: (): number => currentTime,
    schedule: (cb: FrameRequestCallback): number => {
      const id = ++nextId;
      pending = { id, cb };
      return id;
    },
    cancel: (id: number): void => {
      if (pending !== null && pending.id === id) pending = null;
    },
    advance: (ms: number): void => {
      currentTime += ms;
      const job = pending;
      if (job === null) return;
      pending = null;
      job.cb(currentTime);
    },
  };
}

describe('FrameRateMeter', () => {
  let scheduler: ReturnType<typeof createManualScheduler> | null = null;
  let options: FrameRateMeterOptions;

  beforeEach(() => {
    scheduler = createManualScheduler();
    options = {
      now: scheduler.now,
      schedule: scheduler.schedule,
      cancel: scheduler.cancel,
    };
  });

  it('reports average fps and frame count after steady frame cadence', () => {
    const meter = new FrameRateMeter(options);
    meter.start();
    for (let frame = 0; frame < 120; frame += 1) {
      scheduler?.advance(FRAME_BUDGET_MS);
    }
    const metrics = meter.stop();
    expect(metrics.totalFrames).toBe(119);
    expect(metrics.avgFps).toBeGreaterThan(58);
    expect(metrics.avgFps).toBeLessThan(62);
    expect(metrics.maxFrameMs).toBeLessThanOrEqual(FRAME_BUDGET_MS + 1e-9);
  });

  it('counts frames beyond the drop threshold as dropped', () => {
    const meter = new FrameRateMeter(options);
    meter.start();
    scheduler?.advance(FRAME_BUDGET_MS);
    scheduler?.advance(50);
    scheduler?.advance(FRAME_BUDGET_MS);
    const metrics = meter.stop();
    expect(metrics.droppedFrames).toBe(1);
    expect(metrics.maxFrameMs).toBe(50);
  });

  it('computes the p95 frame duration across the sample', () => {
    const meter = new FrameRateMeter(options);
    meter.start();
    for (let frame = 0; frame < 100; frame += 1) {
      scheduler?.advance(frame % 10 === 0 ? 40 : FRAME_BUDGET_MS);
    }
    const metrics = meter.stop();
    expect(metrics.totalFrames).toBe(99);
    expect(metrics.p95FrameMs).toBeLessThanOrEqual(40);
    expect(metrics.droppedFrames).toBeGreaterThan(0);
  });

  it('stop cancels the loop and freezes the metrics', () => {
    const meter = new FrameRateMeter(options);
    meter.start();
    scheduler?.advance(FRAME_BUDGET_MS);
    scheduler?.advance(FRAME_BUDGET_MS);
    const stopped = meter.stop();
    scheduler?.advance(FRAME_BUDGET_MS);
    scheduler?.advance(FRAME_BUDGET_MS);
    expect(meter.report()).toEqual(stopped);
  });

  it('reports empty metrics before any frame elapses', () => {
    const meter = new FrameRateMeter(options);
    meter.start();
    const metrics = meter.report();
    expect(metrics.totalFrames).toBe(0);
    expect(metrics.avgFps).toBe(0);
    expect(metrics.droppedFrames).toBe(0);
    meter.stop();
  });

  it('keeps a single loop even if start is called twice', () => {
    const meter = new FrameRateMeter(options);
    meter.start();
    meter.start();
    scheduler?.advance(FRAME_BUDGET_MS);
    scheduler?.advance(FRAME_BUDGET_MS);
    const metrics = meter.stop();
    expect(metrics.totalFrames).toBe(1);
  });
});

describe('measureFrameWork', () => {
  it('keeps trivial work within the frame budget', () => {
    const result = measureFrameWork(() => undefined);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.withinBudget).toBe(true);
  });

  it('flags heavy work as exceeding the frame budget', () => {
    const result = measureFrameWork(() => {
      let acc = 0;
      for (let i = 0; i < 20_000_000; i += 1) {
        acc += i;
      }
      void acc;
    });
    expect(result.durationMs).toBeGreaterThan(FRAME_BUDGET_MS);
    expect(result.withinBudget).toBe(false);
  });
});
