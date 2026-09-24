/**
 * Tests de la composición del lienzo de export (TASK-035, RF-015).
 *
 * Verifica que el canvas compuesto integra las tres capas (velas+indicadores,
 * dibujos y anotación) a la escala pedida, y que degrada a `null` (empty) o
 * a composición parcial cuando faltan capas. Patrón AAA, sin canvas real.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installCanvas2DContextMock, type Canvas2DContextMock } from '../../testing/canvas-2d';
import { composeChartCanvas } from '../compose';

function fakeCanvas(): HTMLCanvasElement {
  return document.createElement('canvas');
}

describe('composeChartCanvas', () => {
  let ctx: Canvas2DContextMock;

  beforeEach(() => {
    ({ ctx } = installCanvas2DContextMock());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when there are no layers (empty)', () => {
    const result = composeChartCanvas({ layers: {}, width: 800, height: 400 });
    expect(result).toBeNull();
  });

  it('returns null when the viewport has no size', () => {
    const result = composeChartCanvas({
      layers: { chartCanvas: fakeCanvas() },
      width: 0,
      height: 400,
    });
    expect(result).toBeNull();
  });

  it('composes background, chart and overlay at 2x by default', () => {
    const chart = fakeCanvas();
    const overlay = fakeCanvas();

    const result = composeChartCanvas({
      layers: { chartCanvas: chart, overlayCanvas: overlay },
      width: 800,
      height: 400,
    });

    expect(result).not.toBeNull();
    expect(result?.width).toBe(1600);
    expect(result?.height).toBe(800);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1600, 800);
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    expect(ctx.drawImage.mock.calls[0]?.[0]).toBe(chart);
    expect(ctx.drawImage.mock.calls[1]?.[0]).toBe(overlay);
  });

  it('scales the output to the requested factor', () => {
    const result = composeChartCanvas({
      layers: { chartCanvas: fakeCanvas() },
      width: 500,
      height: 250,
      scale: 4,
    });

    expect(result?.width).toBe(2000);
    expect(result?.height).toBe(1000);
  });

  it('draws the ticker/timeframe annotation when provided', () => {
    composeChartCanvas({
      layers: { chartCanvas: fakeCanvas() },
      width: 400,
      height: 200,
      scale: 2,
      annotation: 'EURUSD · 1h',
    });

    expect(ctx.fillText).toHaveBeenCalledWith('EURUSD · 1h', 24, 24);
  });

  it('composes only the overlay when the chart layer is missing (partial)', () => {
    const overlay = fakeCanvas();

    const result = composeChartCanvas({
      layers: { overlayCanvas: overlay },
      width: 320,
      height: 240,
    });

    expect(result).not.toBeNull();
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(ctx.drawImage.mock.calls[0]?.[0]).toBe(overlay);
  });
});
