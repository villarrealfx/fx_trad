import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import type { OverlayBinding } from '../chart-binding';
import { installCanvas2DContextMock } from '../../testing/canvas-2d';
import type { OverlayShape } from '../overlay-geometry';
import OverlayCanvas from '../OverlayCanvas';

const ANCHORED_LINE: OverlayShape = {
  id: 'tendencia-1',
  kind: 'line',
  from: { time: 1_781_000_000, price: 1.5 },
  to: { time: 1_781_003_600, price: 1.75 },
};

const BUY_MARKER: OverlayShape = {
  id: 'buy-1',
  kind: 'marker',
  position: { time: 1_781_000_000, price: 1.5 },
  direction: 'buy',
};

/** Binding falso que recuerda los listeners suscritos para dispararlos a mano. */
function createFakeBinding(): {
  binding: OverlayBinding;
  listeners: Array<() => void>;
  timeToCoordinate: ReturnType<typeof vi.fn>;
  priceToCoordinate: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
} {
  const listeners: Array<() => void> = [];
  const timeToCoordinate = vi.fn((time: number) => (time - 1_781_000_000) / 3600);
  const priceToCoordinate = vi.fn((price: number) => (price - 1.5) * 100 + 20);
  const unsubscribe = vi.fn();
  return {
    binding: {
      timeToCoordinate,
      priceToCoordinate,
      subscribeRedraw(listener) {
        listeners.push(listener);
        return unsubscribe;
      },
    },
    listeners,
    timeToCoordinate,
    priceToCoordinate,
    unsubscribe,
  };
}

/** Observador de tamaño stub que captura el target observado. */
function installResizeObserverMock(): { observed: Array<Element | null> } {
  const observed: Array<Element | null> = [];
  class ResizeObserverMock {
    observe(target: Element): void {
      observed.push(target);
    }
    disconnect(): void {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  return { observed };
}

function renderWithHost(binding: OverlayBinding | null, shapes: ReadonlyArray<OverlayShape>) {
  const hostRef = createRef<HTMLDivElement>();
  const view = render(
    <div ref={hostRef}>
      <OverlayCanvas hostRef={hostRef} binding={binding} shapes={shapes} />
    </div>,
  );
  return { hostRef, view };
}

describe('OverlayCanvas', () => {
  let ctx: ReturnType<typeof installCanvas2DContextMock>['ctx'];

  beforeEach(() => {
    ({ ctx } = installCanvas2DContextMock());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('projects anchored strokes to pixels on the first paint', async () => {
    const { binding } = createFakeBinding();
    renderWithHost(binding, [ANCHORED_LINE]);
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalled());
    expect(ctx.moveTo).toHaveBeenCalledTimes(1);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 20);
    expect(ctx.lineTo).toHaveBeenCalledWith(1, 45);
  });

  it('redraws reprojecting the anchors when the visible range changes', async () => {
    const { binding, listeners, timeToCoordinate } = createFakeBinding();
    renderWithHost(binding, [ANCHORED_LINE]);
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalled());
    const callsBeforePan = timeToCoordinate.mock.calls.length;
    ctx.stroke.mockClear();
    listeners[0]();
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalledTimes(1));
    expect(timeToCoordinate.mock.calls.length).toBeGreaterThan(callsBeforePan);
    expect(timeToCoordinate).toHaveBeenCalledWith(ANCHORED_LINE.from.time);
    expect(timeToCoordinate).toHaveBeenCalledWith(ANCHORED_LINE.to.time);
  });

  it('coalesces a burst of redraw triggers into a single frame', async () => {
    const { binding, listeners } = createFakeBinding();
    renderWithHost(binding, [ANCHORED_LINE]);
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalled());
    ctx.stroke.mockClear();
    for (let step = 0; step < 20; step += 1) {
      listeners[0]();
    }
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalledTimes(1));
  });

  it('keeps the canvas sized with the host via ResizeObserver', async () => {
    installResizeObserverMock();
    const { binding, listeners } = createFakeBinding();
    const { hostRef } = renderWithHost(binding, [ANCHORED_LINE]);
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalled());
    Object.defineProperty(hostRef.current, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(hostRef.current, 'clientHeight', { value: 400, configurable: true });
    ctx.stroke.mockClear();
    listeners[0]();
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalledTimes(1));
    const canvas = document.querySelector('canvas');
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    expect(canvas?.width).toBe(800);
    expect(canvas?.height).toBe(400);
  });

  it('tears down subscriptions and observer on unmount', async () => {
    installResizeObserverMock();
    const { binding, unsubscribe } = createFakeBinding();
    const { view } = renderWithHost(binding, [ANCHORED_LINE]);
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalled());
    view.unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('paints nothing until a binding is available', () => {
    renderWithHost(null, [ANCHORED_LINE]);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('stacks the overlay above the chart canvases (z-index, TASK-048)', () => {
    const { binding } = createFakeBinding();
    renderWithHost(binding, [ANCHORED_LINE]);

    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    expect(Number(canvas.style.zIndex)).toBeGreaterThanOrEqual(3);
    // El canvas es un elemento reemplazado: sin tamaño CSS explícito usaría su
    // tamaño intrínseco (×devicePixelRatio) y el overlay quedaría desalineado.
    expect(canvas.style.width).toBe('100%');
    expect(canvas.style.height).toBe('100%');
  });

  it('fills a buy marker triangle anchored to its price/time', async () => {
    const { binding } = createFakeBinding();
    renderWithHost(binding, [BUY_MARKER]);
    await waitFor(() => expect(ctx.fill).toHaveBeenCalledTimes(1));
    expect(ctx.fillStyle).toBe('#26A69A');
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 20);
  });
});
