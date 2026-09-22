import { describe, expect, it, vi } from 'vitest';
import { createFrameBatcher } from '../frame-batch';

/** Planificador manual equivalente a un `requestAnimationFrame` de una cadena. */
function createManualScheduler() {
  let nextId = 0;
  let pending: { id: number; cb: FrameRequestCallback } | null = null;
  const frames = vi.fn();
  const cancels = vi.fn();
  return {
    frames,
    cancels,
    schedule: (cb: FrameRequestCallback): number => {
      const id = ++nextId;
      pending = { id, cb };
      frames();
      return id;
    },
    cancel: (id: number): void => {
      if (pending !== null && pending.id === id) pending = null;
      cancels();
    },
    tick: (): void => {
      const job = pending;
      if (job === null) return;
      pending = null;
      job.cb(0);
    },
  };
}

describe('createFrameBatcher', () => {
  it('coalesces any number of schedules into a single invocation per frame', () => {
    const scheduler = createManualScheduler();
    const batcher = createFrameBatcher({
      schedule: scheduler.schedule,
      cancel: scheduler.cancel,
    });
    const update = vi.fn();
    batcher.schedule(update);
    batcher.schedule(update);
    batcher.schedule(update);
    expect(scheduler.frames).toHaveBeenCalledTimes(1);
    scheduler.tick();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('runs only the last pending update when the frame commits', () => {
    const scheduler = createManualScheduler();
    const batcher = createFrameBatcher({
      schedule: scheduler.schedule,
      cancel: scheduler.cancel,
    });
    const first = vi.fn();
    const last = vi.fn();
    batcher.schedule(first);
    batcher.schedule(last);
    scheduler.tick();
    expect(last).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('schedules again after a committed frame', () => {
    const scheduler = createManualScheduler();
    const batcher = createFrameBatcher({
      schedule: scheduler.schedule,
      cancel: scheduler.cancel,
    });
    const update = vi.fn();
    batcher.schedule(update);
    scheduler.tick();
    batcher.schedule(update);
    expect(scheduler.frames).toHaveBeenCalledTimes(2);
    scheduler.tick();
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('flush executes the pending update synchronously', () => {
    const scheduler = createManualScheduler();
    const batcher = createFrameBatcher({
      schedule: scheduler.schedule,
      cancel: scheduler.cancel,
    });
    const update = vi.fn();
    batcher.schedule(update);
    batcher.flush();
    expect(update).toHaveBeenCalledTimes(1);
    expect(scheduler.cancels).toHaveBeenCalled();
    scheduler.tick();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('cancel discards the pending update without running it', () => {
    const scheduler = createManualScheduler();
    const batcher = createFrameBatcher({
      schedule: scheduler.schedule,
      cancel: scheduler.cancel,
    });
    const update = vi.fn();
    batcher.schedule(update);
    batcher.cancel();
    scheduler.tick();
    expect(update).not.toHaveBeenCalled();
  });
});
