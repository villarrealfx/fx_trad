import axe from 'axe-core';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FRAME_BUDGET_MS,
  FrameRateMeter,
  type FrameRateMeterOptions,
} from '../../performance/frame-rate';
import { installCanvas2DContextMock } from '../../testing/canvas-2d';
import { ChartSyncController } from '../../charting/chart-sync';
import type { OverlayShape } from '../../charting/overlay-geometry';
import { DEFAULT_INDICATOR_PARAMETERS } from '../../indicators/indicators';
import ChartPane from './ChartPane';
import type { ChartPaneHandle } from './ChartPane';

const RESPONSE = {
  symbol: 'EURUSD',
  timeframe: '1h',
  candles: [
    { time: 1_781_000_000, open: 1.08, high: 1.09, low: 1.07, close: 1.085 },
    { time: 1_781_003_600, open: 1.085, high: 1.1, low: 1.08, close: 1.095 },
  ],
};

const chartMocks = vi.hoisted(() => {
  const setData = vi.fn();
  const fitContent = vi.fn();
  const setVisibleLogicalRange = vi.fn();
  const getVisibleLogicalRange = vi.fn(() => ({ from: 0, to: 100 }));
  const timeToCoordinate = vi.fn(() => 10);
  const priceToCoordinate = vi.fn(() => 40);
  const coordinateToPrice = vi.fn(() => 1.5);
  const coordinateToTime = vi.fn(() => 1_781_000_000);
  const subscribeVisibleLogicalRangeChange = vi.fn();
  const subscribeSizeChange = vi.fn();
  const unsubscribeVisibleLogicalRangeChange = vi.fn();
  const unsubscribeSizeChange = vi.fn();
  const crosshairListeners: ((param: unknown) => void)[] = [];
  const subscribeCrosshairMove = vi.fn((handler: (param: unknown) => void) => {
    crosshairListeners.push(handler);
  });
  const clickListeners: ((param: unknown) => void)[] = [];
  const subscribeClick = vi.fn((handler: (param: unknown) => void) => {
    clickListeners.push(handler);
  });
  const unsubscribeClick = vi.fn();
  const remove = vi.fn();
  const getVisibleRange = vi.fn(() => ({ from: 1_781_000_000, to: 1_781_003_600 }));
  const setVisibleRange = vi.fn();
  const subscribeVisibleTimeRangeChange = vi.fn();
  const unsubscribeVisibleTimeRangeChange = vi.fn();
  const setCrosshairPosition = vi.fn();
  const clearCrosshairPosition = vi.fn();
  const takeScreenshot = vi.fn<() => HTMLCanvasElement>(
    () => ({ width: 800, height: 400 }) as unknown as HTMLCanvasElement,
  );
  const addCandlestickSeries = vi.fn(() => ({
    setData,
    priceToCoordinate,
    coordinateToPrice,
  }));
  const lineSetData = vi.fn();
  const addLineSeries = vi.fn<(...args: unknown[]) => unknown>(() => ({ setData: lineSetData }));
  const removeSeries = vi.fn();
  const applyPriceScaleOptions = vi.fn();
  const priceScale = vi.fn(() => ({ applyOptions: applyPriceScaleOptions }));
  const timeScale = vi.fn(() => ({
    fitContent,
    setVisibleLogicalRange,
    getVisibleLogicalRange,
    timeToCoordinate,
    coordinateToTime,
    subscribeVisibleLogicalRangeChange,
    subscribeSizeChange,
    unsubscribeVisibleLogicalRangeChange,
    unsubscribeSizeChange,
    getVisibleRange,
    setVisibleRange,
    subscribeVisibleTimeRangeChange,
    unsubscribeVisibleTimeRangeChange,
  }));
  const createChart = vi.fn<(...args: unknown[]) => unknown>(() => ({
    addCandlestickSeries,
    addLineSeries,
    removeSeries,
    priceScale,
    timeScale,
    subscribeCrosshairMove,
    subscribeClick,
    unsubscribeClick,
    remove,
    takeScreenshot,
    setCrosshairPosition,
    clearCrosshairPosition,
  }));
  return {
    setData,
    fitContent,
    setVisibleLogicalRange,
    getVisibleLogicalRange,
    timeToCoordinate,
    priceToCoordinate,
    coordinateToPrice,
    coordinateToTime,
    subscribeVisibleLogicalRangeChange,
    subscribeSizeChange,
    unsubscribeVisibleLogicalRangeChange,
    unsubscribeSizeChange,
    subscribeCrosshairMove,
    addCandlestickSeries,
    lineSetData,
    addLineSeries,
    removeSeries,
    applyPriceScaleOptions,
    priceScale,
    remove,
    timeScale,
    createChart,
    takeScreenshot,
    subscribeClick,
    unsubscribeClick,
    clickListeners,
    crosshairListeners,
    getVisibleRange,
    setVisibleRange,
    subscribeVisibleTimeRangeChange,
    unsubscribeVisibleTimeRangeChange,
    setCrosshairPosition,
    clearCrosshairPosition,
  };
});

vi.mock('lightweight-charts', () => ({
  ColorType: { Solid: 'solid' },
  createChart: (...args: unknown[]) => chartMocks.createChart(...args),
}));

const fetchMock = vi.fn();
const createResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** Genera un dataset de 2 años a 1h (~17.5k velas), escenario RNF-001. */
function buildTwoYearsSeries(): {
  symbol: string;
  timeframe: string;
  candles: { time: number; open: number; high: number; low: number; close: number }[];
} {
  const candles = [];
  const startTime = 1_767_225_600;
  const totalHours = 2 * 365 * 24;
  for (let hour = 0; hour < totalHours; hour += 1) {
    const base = 1.08 + Math.sin(hour / 240) * 0.01;
    candles.push({
      time: startTime + hour * 3600,
      open: base,
      high: base + 0.0005,
      low: base - 0.0005,
      close: base + 0.0001,
    });
  }
  return { symbol: 'EURUSD', timeframe: '1h', candles };
}

/** Emite un click del chart con el tiempo/punto ya resueltos por la librería. */
function emitChartClick(time: number | undefined, x: number, y: number): void {
  act(() => {
    for (const handler of chartMocks.clickListeners) {
      handler({ time, point: { x, y } });
    }
  });
}

/** Emite un movimiento de crosshair del chart. */
function emitCrosshairMove(time: number | undefined, x: number, y: number): void {
  act(() => {
    for (const handler of chartMocks.crosshairListeners) {
      handler({ time, point: { x, y }, seriesData: new Map() });
    }
  });
}

/** Planificador manual de frames para el FrameRateMeter (tests deterministas). */
function createManualScheduler() {
  let time = 0;
  let nextId = 0;
  let pending: { id: number; cb: FrameRequestCallback } | null = null;
  return {
    now: (): number => time,
    schedule: (cb: FrameRequestCallback): number => {
      const id = ++nextId;
      pending = { id, cb };
      return id;
    },
    cancel: (id: number): void => {
      if (pending !== null && pending.id === id) pending = null;
    },
    advance: (ms: number): void => {
      time += ms;
      const job = pending;
      if (job === null) return;
      pending = null;
      job.cb(time);
    },
  };
}

describe('ChartPane', () => {
  let ctx: ReturnType<typeof installCanvas2DContextMock>['ctx'];

  beforeEach(() => {
    ({ ctx } = installCanvas2DContextMock());
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    chartMocks.clickListeners.length = 0;
    chartMocks.crosshairListeners.length = 0;
    for (const value of Object.values(chartMocks)) {
      if (typeof value === 'function') {
        (value as ReturnType<typeof vi.fn>).mockClear();
      }
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows loading and then feeds the candles without transforming them', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    expect(screen.getByText('Cargando serie…')).toBeTruthy();
    await waitFor(() => {
      const calls = chartMocks.setData.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls.at(-1)?.[0]).toEqual(RESPONSE.candles);
    });
    expect(chartMocks.fitContent).toHaveBeenCalled();
    expect(screen.getByLabelText('Leyenda OHLC')).toBeTruthy();
  });

  it('shows the empty state when the series has no candles', async () => {
    fetchMock.mockResolvedValue(createResponse({ ...RESPONSE, candles: [] }));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(screen.getByText('Sin datos en este periodo')).toBeTruthy());
  });

  it('shows a candle skeleton with an accessible loading status', () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Cargando serie…');
    expect(status.querySelectorAll('.chart-pane__skeleton-bar')).toHaveLength(14);
  });

  it('warns when the requested range exceeds the available coverage (partial)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" start={1_780_999_000} end={1_781_004_000} />);

    expect(
      await screen.findByText('La cobertura disponible es menor al rango solicitado'),
    ).toBeTruthy();
  });

  it('does not warn about partial coverage for a full range', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(screen.getByText('C 1.09500')).toBeTruthy());

    expect(screen.queryByText('La cobertura disponible es menor al rango solicitado')).toBeNull();
  });

  it('shows an error and retries the request', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => {
      const calls = chartMocks.setData.mock.calls;
      expect(calls.at(-1)?.[0]).toEqual(RESPONSE.candles);
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('exposes the last candle through the textual OHLC legend', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(screen.getByText('C 1.09500')).toBeTruthy());
    expect(screen.getByText('O 1.08500')).toBeTruthy();
    expect(screen.getByText('H 1.10000')).toBeTruthy();
    expect(screen.getByText('L 1.08000')).toBeTruthy();
  });

  it('handles zoom and fit shortcuts on the chart host', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    const host = screen.getByRole('img', { name: 'Gráfico de velas EURUSD 1h' });
    fireEvent.keyDown(host, { key: '+' });
    expect(chartMocks.setVisibleLogicalRange).toHaveBeenCalled();
    fireEvent.keyDown(host, { key: '-' });
    expect(chartMocks.setVisibleLogicalRange).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(host, { key: '1' });
    expect(chartMocks.fitContent).toHaveBeenCalled();
  });

  it('disposes the chart on unmount', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const view = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    view.unmount();
    expect(chartMocks.remove).toHaveBeenCalled();
  });

  it('sustains the frame budget while panning/zooming a two-year dataset', async () => {
    const twoYears = buildTwoYearsSeries();
    fetchMock.mockResolvedValue(createResponse(twoYears));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => {
      const calls = chartMocks.setData.mock.calls;
      expect(calls.at(-1)?.[0]).toEqual(twoYears.candles);
    });
    const host = screen.getByRole('img', { name: 'Gráfico de velas EURUSD 1h' });
    for (let step = 0; step < 60; step += 1) {
      fireEvent.keyDown(host, { key: step % 2 === 0 ? '+' : '1' });
    }
    const scheduler = createManualScheduler();
    const meterOptions: FrameRateMeterOptions = {
      now: scheduler.now,
      schedule: scheduler.schedule,
      cancel: scheduler.cancel,
    };
    const meter = new FrameRateMeter(meterOptions);
    meter.start();
    for (let frame = 0; frame < 60; frame += 1) {
      scheduler.advance(FRAME_BUDGET_MS);
    }
    const metrics = meter.stop();
    expect(metrics.avgFps).toBeGreaterThan(58);
    expect(metrics.droppedFrames).toBe(0);
    expect(chartMocks.setData).toHaveBeenCalledTimes(2);
    expect(chartMocks.createChart).toHaveBeenCalledTimes(1);
  });

  it('sustains the frame budget while editing (dragging) a drawing (RNF-202)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const originalTime = chartMocks.coordinateToTime.getMockImplementation();
    const originalPrice = chartMocks.coordinateToPrice.getMockImplementation();
    chartMocks.coordinateToTime.mockImplementation((x?: number) => 1_781_000_000 + (x ?? 0) * 60);
    chartMocks.coordinateToPrice.mockImplementation((y?: number) => 1.5 + (y ?? 0) / 1000);
    try {
      const { container } = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
      await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
      const host = container.querySelector('.chart-pane__host') as HTMLElement;
      fireEvent.click(screen.getByRole('button', { name: 'Línea' }));
      emitChartClick(1_781_000_000, 5, 5);
      emitChartClick(1_781_003_600, 60, 80);

      const scheduler = createManualScheduler();
      const meter = new FrameRateMeter({
        now: scheduler.now,
        schedule: scheduler.schedule,
        cancel: scheduler.cancel,
      });
      meter.start();
      fireEvent(host, new MouseEvent('pointerdown', { clientX: 10, clientY: 40, bubbles: true }));
      for (let frame = 0; frame < 60; frame += 1) {
        for (let move = 0; move < 5; move += 1) {
          fireEvent(
            host,
            new MouseEvent('pointermove', {
              clientX: 10 + frame + move,
              clientY: 40 + frame,
              bubbles: true,
            }),
          );
        }
        scheduler.advance(FRAME_BUDGET_MS);
      }
      fireEvent(host, new MouseEvent('pointerup', { clientX: 80, clientY: 90, bubbles: true }));

      const metrics = meter.stop();
      expect(metrics.avgFps).toBeGreaterThan(58);
      expect(metrics.droppedFrames).toBe(0);
    } finally {
      chartMocks.coordinateToTime.mockImplementation(originalTime ?? (() => 1_781_000_000));
      chartMocks.coordinateToPrice.mockImplementation(originalPrice ?? (() => 1.5));
    }
  });

  it('edits a drawing by dragging and restores it with undo (RF-212/RF-213)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const originalTime = chartMocks.coordinateToTime.getMockImplementation();
    const originalPrice = chartMocks.coordinateToPrice.getMockImplementation();
    const onDrawingsChange = vi.fn();
    try {
      const { container } = render(
        <ChartPane symbol="EURUSD" timeframe="1h" onDrawingsChange={onDrawingsChange} />,
      );
      await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
      const host = container.querySelector('.chart-pane__host') as HTMLElement;
      fireEvent.click(screen.getByRole('button', { name: 'Línea' }));
      emitChartClick(1_781_000_000, 5, 5);
      emitChartClick(1_781_003_600, 60, 80);

      const original = onDrawingsChange.mock.calls.at(-1)?.[0] as OverlayShape[];
      expect(original).toHaveLength(1);

      chartMocks.coordinateToTime.mockImplementation((x?: number) => 1_781_000_000 + (x ?? 0) * 60);
      chartMocks.coordinateToPrice.mockImplementation((y?: number) => 1.5 + (y ?? 0) / 1000);
      fireEvent(host, new MouseEvent('pointerdown', { clientX: 10, clientY: 40, bubbles: true }));
      fireEvent(host, new MouseEvent('pointermove', { clientX: 20, clientY: 50, bubbles: true }));
      fireEvent(host, new MouseEvent('pointerup', { clientX: 20, clientY: 50, bubbles: true }));

      const moved = onDrawingsChange.mock.calls.at(-1)?.[0] as OverlayShape[];
      expect(moved[0]).not.toEqual(original[0]);

      fireEvent.keyDown(host, { key: 'z', ctrlKey: true });

      const restored = onDrawingsChange.mock.calls.at(-1)?.[0] as OverlayShape[];
      expect(restored).toEqual(original);
    } finally {
      chartMocks.coordinateToTime.mockImplementation(originalTime ?? (() => 1_781_000_000));
      chartMocks.coordinateToPrice.mockImplementation(originalPrice ?? (() => 1.5));
    }
  });

  it('batches crosshair legend updates to a single commit per frame', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(screen.getByText('C 1.09500')).toBeTruthy());
    const handler = chartMocks.subscribeCrosshairMove.mock.calls[0]?.[0] as (param: {
      time: number;
      seriesData: Map<unknown, { open: number; high: number; low: number; close: number }>;
    }) => void;
    const seriesInstance = chartMocks.addCandlestickSeries.mock.results[0]?.value;
    for (let step = 0; step < 20; step += 1) {
      handler({
        time: 1_781_003_600,
        seriesData: new Map([
          [seriesInstance, { open: 1.2, high: 1.21, low: 1.19, close: 1.2 + step * 0.0005 }],
        ]),
      });
    }
    expect(screen.getByText('C 1.09500')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('C 1.20950')).toBeTruthy());
    expect(chartMocks.setData).toHaveBeenCalledTimes(2);
  });

  it('renders an overlay canvas synced with the chart axes on success', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    const overlay = document.querySelector('.chart-pane__graph canvas');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');
    expect(chartMocks.subscribeVisibleLogicalRangeChange).toHaveBeenCalledTimes(1);
    expect(chartMocks.subscribeSizeChange).toHaveBeenCalledTimes(1);
  });

  it('reprojects drawn anchors after a visible range change', async () => {
    const drawing: OverlayShape = {
      id: 'tendencia-1',
      kind: 'line',
      from: { time: 1_781_000_000, price: 1.08 },
      to: { time: 1_781_003_600, price: 1.095 },
    };
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" drawings={[drawing]} />);
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalled());
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 40);
    expect(ctx.lineTo).toHaveBeenCalledWith(10, 40);
    const handler = chartMocks.subscribeVisibleLogicalRangeChange.mock.calls[0]?.[0] as () => void;
    const timeCalls = chartMocks.timeToCoordinate.mock.calls.length;
    ctx.stroke.mockClear();
    handler();
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalledTimes(1));
    expect(chartMocks.timeToCoordinate.mock.calls.length).toBeGreaterThan(timeCalls);
    expect(chartMocks.timeToCoordinate).toHaveBeenCalledWith(1_781_000_000);
    expect(chartMocks.timeToCoordinate).toHaveBeenCalledWith(1_781_003_600);
  });

  it('creates a buy marker anchored below the bar under the cursor (RF-208)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    emitChartClick(1_781_000_000, 5, 5);
    await waitFor(() => expect(ctx.fill).toHaveBeenCalledTimes(1));
    expect(ctx.fillStyle).toBe('#26A69A');
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 40);
  });

  it('switches the simulator to sell and places a sell marker', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    const sell = screen.getByRole('button', { name: 'Venta' });
    fireEvent.click(sell);
    expect(sell.getAttribute('aria-pressed')).toBe('true');
    emitChartClick(1_781_000_000, 5, 5);
    await waitFor(() => expect(ctx.fill).toHaveBeenCalledTimes(1));
    expect(ctx.fillStyle).toBe('#EF5350');
  });

  it('dedupes markers placed on the same bar and direction', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    emitChartClick(1_781_000_000, 5, 5);
    await waitFor(() => expect(ctx.fill).toHaveBeenCalledTimes(1));
    emitChartClick(1_781_000_000, 8, 5);
    await waitFor(() => expect(ctx.fill).toHaveBeenCalledTimes(1));
  });

  it('selects a marker on click and deletes it via inline confirm', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    emitChartClick(1_781_000_000, 5, 5);
    await waitFor(() => expect(ctx.fill).toHaveBeenCalledTimes(1));
    emitChartClick(1_781_000_000, 10, 40);
    const confirm = screen.getByRole('group', { name: 'Marcador de compra seleccionado' });
    expect(confirm).toBeTruthy();
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Borrar'));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'Marcador de compra seleccionado' })).toBeNull(),
    );
  });

  it('keeps the marker when deletion is cancelled', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    emitChartClick(1_781_000_000, 5, 5);
    await waitFor(() => expect(ctx.fill).toHaveBeenCalledTimes(1));
    emitChartClick(1_781_000_000, 10, 40);
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Marcador de compra seleccionado' })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'Marcador de compra seleccionado' })).toBeNull(),
    );
    expect(ctx.fill).toHaveBeenCalledTimes(1);
  });

  it('deselects a marker with Escape', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    const host = screen.getByRole('img', { name: 'Gráfico de velas EURUSD 1h' });
    emitChartClick(1_781_000_000, 5, 5);
    await waitFor(() => expect(ctx.fill).toHaveBeenCalledTimes(1));
    emitChartClick(1_781_000_000, 10, 40);
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Marcador de compra seleccionado' })).toBeTruthy(),
    );
    fireEvent.keyDown(host, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'Marcador de compra seleccionado' })).toBeNull(),
    );
  });

  it('draws a line from two clicks with the line tool', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const { container } = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Línea' }));
    emitChartClick(1_781_000_000, 5, 5);
    emitChartClick(1_781_003_600, 60, 80);
    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('1');
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalled());
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 40);
  });

  it('undoes and redoes a drawn line with keyboard shortcuts', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const { container } = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Línea' }));
    emitChartClick(1_781_000_000, 5, 5);
    emitChartClick(1_781_003_600, 60, 80);
    const host = container.querySelector('.chart-pane__host') as HTMLElement;
    const shapesCount = (): string | null =>
      container.querySelector('.chart-pane')?.getAttribute('data-shapes') ?? null;
    expect(shapesCount()).toBe('1');

    fireEvent.keyDown(host, { key: 'z', ctrlKey: true });
    expect(shapesCount()).toBe('0');

    fireEvent.keyDown(host, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(shapesCount()).toBe('1');
  });

  it('seeds the editable drawings from initialDrawings (TASK-UI-241)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const drawing: OverlayShape = {
      id: 'seed-1',
      kind: 'line',
      from: { time: 1_781_000_000, price: 1.08 },
      to: { time: 1_781_003_600, price: 1.09 },
    };
    const { container } = render(
      <ChartPane symbol="EURUSD" timeframe="1h" initialDrawings={[drawing]} />,
    );
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());

    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('1');
  });

  it('notifies drawings changes through onDrawingsChange (TASK-UI-241)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const onDrawingsChange = vi.fn();
    const { container } = render(
      <ChartPane symbol="EURUSD" timeframe="1h" onDrawingsChange={onDrawingsChange} />,
    );
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Línea' }));
    emitChartClick(1_781_000_000, 5, 5);
    emitChartClick(1_781_003_600, 60, 80);

    const last = onDrawingsChange.mock.calls.at(-1)?.[0] as OverlayShape[];
    expect(last).toHaveLength(1);
    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('1');
  });

  it('draws a rectangle from two clicks with the rect tool', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const { container } = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Rectángulo' }));
    emitChartClick(1_781_000_000, 5, 5);
    emitChartClick(1_781_003_600, 60, 80);
    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('1');
    await waitFor(() => expect(ctx.strokeRect).toHaveBeenCalled());
  });

  it('draws a fibonacci retracement from two clicks', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const { container } = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Fibonacci' }));
    emitChartClick(1_781_000_000, 5, 5);
    emitChartClick(1_781_003_600, 60, 80);
    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('1');
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalled());
  });

  it('erases a drawn shape with the erase tool', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const { container } = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Línea' }));
    emitChartClick(1_781_000_000, 5, 5);
    emitChartClick(1_781_003_600, 60, 80);
    await waitFor(() => expect(ctx.stroke).toHaveBeenCalled());
    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: 'Borrar trazo' }));
    emitChartClick(1_781_000_000, 10, 40);

    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('0');
  });

  it('marks the active tool with aria-pressed', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());

    const line = screen.getByRole('button', { name: 'Línea' });
    fireEvent.click(line);

    expect(line.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Compra' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('fits the view from the header action', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    const fitButton = (): HTMLButtonElement =>
      screen.getByRole('button', { name: 'Ajustar vista' }) as HTMLButtonElement;
    await waitFor(() => expect(fitButton().disabled).toBe(false));
    chartMocks.fitContent.mockClear();

    fireEvent.click(fitButton());

    expect(chartMocks.fitContent).toHaveBeenCalledTimes(1);
  });

  it('triggers export from the header action (TASK-UI-232)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const onExport = vi.fn();
    render(<ChartPane symbol="EURUSD" timeframe="1h" onExport={onExport} />);
    const exportButton = (): HTMLButtonElement =>
      screen.getByRole('button', { name: 'Exportar' }) as HTMLButtonElement;
    await waitFor(() => expect(exportButton().disabled).toBe(false));

    fireEvent.click(exportButton());

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('has no detectable accessibility violations (ACC-201)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const { container } = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Ajustar vista' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );

    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations).toEqual([]);
  });

  it('exposes keyboard-operable chart controls (ACC-201)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Ajustar vista' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );

    const enabledControls = [
      'Indicadores',
      'Exportar',
      'Ajustar vista',
      'Línea',
      'Rectángulo',
      'Fibonacci',
      'Compra',
      'Venta',
      'Borrar trazo',
    ];
    for (const name of enabledControls) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it('configures the axis formats (RF-206/RF-207)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());

    const options = chartMocks.createChart.mock.calls[0]?.[1] as {
      timeScale?: { tickMarkFormatter?: (time: number) => string };
    };
    expect(typeof options.timeScale?.tickMarkFormatter).toBe('function');
    expect(options.timeScale?.tickMarkFormatter?.(Date.UTC(2026, 0, 1, 0, 15) / 1000)).toBe(
      '1 00:15',
    );
    expect(chartMocks.addCandlestickSeries).toHaveBeenCalledWith(
      expect.objectContaining({
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      }),
    );
  });

  it('shows a preview of the pending shape while drawing', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const { container } = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    const host = screen.getByRole('img', { name: 'Gráfico de velas EURUSD 1h' });

    fireEvent.click(screen.getByRole('button', { name: 'Línea' }));
    emitChartClick(1_781_000_000, 5, 5);
    emitCrosshairMove(1_781_003_600, 60, 80);
    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('1');

    fireEvent.keyDown(host, { key: 'Escape' });
    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('0');
  });

  it('erases a marker with the erase tool', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const { container } = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    emitChartClick(1_781_000_000, 5, 5);
    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: 'Borrar trazo' }));
    emitChartClick(1_781_000_000, 10, 40);

    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('0');
  });

  it('cancels a pending draw with Escape', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const { container } = render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    const host = screen.getByRole('img', { name: 'Gráfico de velas EURUSD 1h' });

    fireEvent.click(screen.getByRole('button', { name: 'Línea' }));
    emitChartClick(1_781_000_000, 5, 5);
    fireEvent.keyDown(host, { key: 'Escape' });
    emitChartClick(1_781_003_600, 60, 80);

    expect(container.querySelector('.chart-pane')?.getAttribute('data-shapes')).toBe('0');
  });

  it('renders MA and ATR overlays plus the RSI band with the legend labels', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" indicators={DEFAULT_INDICATOR_PARAMETERS} />);
    await waitFor(() => expect(chartMocks.addLineSeries).toHaveBeenCalledTimes(5));
    expect(chartMocks.lineSetData).toHaveBeenCalledTimes(5);
    expect(chartMocks.priceScale).toHaveBeenCalledWith('right');
    expect(chartMocks.priceScale).toHaveBeenCalledWith('rsi');
    expect(chartMocks.applyPriceScaleOptions).toHaveBeenCalledWith({
      scaleMargins: { top: 0.12, bottom: 0.34 },
    });
    expect(chartMocks.applyPriceScaleOptions).toHaveBeenCalledWith({
      scaleMargins: { top: 0.72, bottom: 0.02 },
    });
    const rsiCalls = chartMocks.addLineSeries.mock.calls.filter(
      (call) => (call[0] as { priceScaleId?: string }).priceScaleId === 'rsi',
    );
    expect(rsiCalls.at(-1)).toBeDefined();
    const ma20Call = chartMocks.addLineSeries.mock.calls.find(
      (call) => (call[0] as { color?: string }).color === '#58A6FF',
    );
    expect(ma20Call).toBeDefined();
    expect(screen.getByText('MA20')).toBeTruthy();
    expect(screen.getByText('MA50')).toBeTruthy();
    expect(screen.getByText('MA200')).toBeTruthy();
    expect(screen.getByText('ATR(14)')).toBeTruthy();
    expect(screen.getByText('RSI(14)')).toBeTruthy();
  });

  it('applies remote range and crosshair from the sync controller (TASK-034)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const controller = new ChartSyncController();
    render(<ChartPane symbol="EURUSD" timeframe="1h" sync={controller} syncId="p1" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());
    expect(chartMocks.subscribeVisibleTimeRangeChange).toHaveBeenCalled();

    act(() => {
      controller.publish({ source: 'p2', timeRange: { from: 1_781_000_000, to: 1_781_003_600 } });
      controller.publish({ source: 'p2', crosshair: { time: 1_781_000_000, price: 1.5 } });
      controller.publish({ source: 'p2', crosshair: null });
      controller.publish({ source: 'p1', timeRange: { from: 0, to: 1 } });
    });

    expect(chartMocks.setVisibleRange).toHaveBeenCalledWith({
      from: 1_781_000_000,
      to: 1_781_003_600,
    });
    expect(chartMocks.setCrosshairPosition).toHaveBeenCalledWith(
      1.5,
      1_781_000_000,
      expect.anything(),
    );
    expect(chartMocks.clearCrosshairPosition).toHaveBeenCalled();
    // El eco del propio panel (source p1) no se reaplica.
    expect(chartMocks.setVisibleRange).toHaveBeenCalledTimes(1);
  });

  it('publishes its own crosshair to the sync controller (TASK-034)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const controller = new ChartSyncController();
    const publishSpy = vi.spyOn(controller, 'publish');
    render(<ChartPane symbol="EURUSD" timeframe="1h" sync={controller} syncId="p1" />);
    await waitFor(() => expect(chartMocks.createChart).toHaveBeenCalled());

    emitCrosshairMove(1_781_000_000, 10, 40);

    expect(publishSpy).toHaveBeenCalledWith({
      source: 'p1',
      crosshair: { time: 1_781_000_000, price: 1.5 },
    });
  });

  it('notifies the latest candle through onLegend (TASK-UI-050)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const onLegend = vi.fn();
    render(<ChartPane symbol="EURUSD" timeframe="1h" onLegend={onLegend} />);

    await waitFor(() =>
      expect(onLegend).toHaveBeenCalledWith(expect.objectContaining({ close: 1.095 })),
    );
  });

  it('skips the hidden RSI and ATR series (TASK-UI-042)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(
      <ChartPane
        symbol="EURUSD"
        timeframe="1h"
        indicators={{
          maPeriods: [20],
          rsiPeriod: 14,
          atrPeriod: 14,
          showRsi: false,
          showAtr: false,
        }}
      />,
    );

    await waitFor(() => expect(chartMocks.addLineSeries).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('RSI(14)')).toBeNull();
    expect(screen.queryByText('ATR(14)')).toBeNull();
  });

  it('redraws the indicators when the parameters change', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const view = render(
      <ChartPane symbol="EURUSD" timeframe="1h" indicators={DEFAULT_INDICATOR_PARAMETERS} />,
    );
    await waitFor(() => expect(chartMocks.addLineSeries).toHaveBeenCalledTimes(5));
    view.rerender(
      <ChartPane
        symbol="EURUSD"
        timeframe="1h"
        indicators={{ ...DEFAULT_INDICATOR_PARAMETERS, maPeriods: [10, 50, 200] }}
      />,
    );
    await waitFor(() => expect(chartMocks.addLineSeries).toHaveBeenCalledTimes(10));
    expect(chartMocks.removeSeries).toHaveBeenCalledTimes(5);
    expect(screen.getByText('MA10')).toBeTruthy();
    expect(screen.queryByText('MA20')).toBeNull();
    expect(screen.getByText('RSI(14)')).toBeTruthy();
  });

  it('skips indicator series when no parameters are provided', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    render(<ChartPane symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(screen.getByText('C 1.09500')).toBeTruthy());
    expect(chartMocks.addLineSeries).not.toHaveBeenCalled();
    expect(chartMocks.priceScale).not.toHaveBeenCalled();
    expect(screen.queryByText('RSI(14)')).toBeNull();
  });

  it('composes chart and overlay layers at the requested scale for export', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const ref = createRef<ChartPaneHandle>();
    const { container } = render(
      <ChartPane
        ref={ref}
        symbol="EURUSD"
        timeframe="1h"
        indicators={DEFAULT_INDICATOR_PARAMETERS}
      />,
    );
    await waitFor(() => expect(chartMocks.setData).toHaveBeenCalled());
    const host = container.querySelector('.chart-pane__host') as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(host, 'clientHeight', { configurable: true, value: 400 });

    const composed = ref.current?.compose(2);

    expect(chartMocks.takeScreenshot).toHaveBeenCalledTimes(1);
    expect(composed).not.toBeNull();
    expect(composed?.width).toBe(1600);
    expect(composed?.height).toBe(800);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1600, 800);
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    expect(ctx.fillText).toHaveBeenCalledWith('EURUSD · 1h', 24, 24);
  });

  it('composes the overlay only when the chart layer is unavailable (partial)', async () => {
    fetchMock.mockResolvedValue(createResponse(RESPONSE));
    const ref = createRef<ChartPaneHandle>();
    const { container } = render(<ChartPane ref={ref} symbol="EURUSD" timeframe="1h" />);
    await waitFor(() => expect(chartMocks.setData).toHaveBeenCalled());
    chartMocks.takeScreenshot.mockImplementationOnce(() => {
      throw new Error('gráfico no listo');
    });
    const host = container.querySelector('.chart-pane__host') as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 640 });
    Object.defineProperty(host, 'clientHeight', { configurable: true, value: 360 });

    const composed = ref.current?.compose(1);

    expect(composed?.width).toBe(640);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });
});
