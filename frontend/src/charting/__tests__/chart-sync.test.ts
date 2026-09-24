import { describe, expect, it, vi } from 'vitest';
import { ChartSyncController } from '../chart-sync';

describe('ChartSyncController (TASK-034)', () => {
  it('delivers a message to every subscriber', () => {
    const controller = new ChartSyncController();
    const a = vi.fn();
    const b = vi.fn();
    controller.subscribe(a);
    controller.subscribe(b);

    controller.publish({ source: 'p1', timeRange: { from: 1, to: 2 } });

    expect(a).toHaveBeenCalledWith({ source: 'p1', timeRange: { from: 1, to: 2 } });
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('stops delivering after unsubscribe', () => {
    const controller = new ChartSyncController();
    const a = vi.fn();
    const unsubscribe = controller.subscribe(a);

    unsubscribe();
    controller.publish({ source: 'p1', crosshair: null });

    expect(a).not.toHaveBeenCalled();
  });
});
