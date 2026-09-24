import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FRAME_BUDGET_MS,
  FrameRateMeter,
  type FrameRateMeterOptions,
} from '../../performance/frame-rate';
import { installCanvas2DContextMock } from '../../testing/canvas-2d';
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
  const coordinateToTime = vi.fn(() => 1_781_000_000);
  const subscribeVisibleLogicalRangeChange = vi.fn();
  const subscribeSizeChange = vi.fn();
  const unsubscribeVisibleLogicalRangeChange = vi.fn();
  const unsubscribeSizeChange = vi.fn();
  const subscribeCrosshairMove = vi.fn();
  const clickListeners: ((param: unknown) => void)[] = [];
  const subscribeClick = vi.fn((handler: (param: unknown) => void) => {
    clickListeners.push(handler);
  });
  const unsubscribeClick = vi.fn();
  const remove = vi.fn();
  const takeScreenshot = vi.fn<() => HTMLCanvasElement>(
    () => ({ width: 800, height: 400 }) as unknown as HTMLCanvasElement,
  );
  const addCandlestickSeries = vi.fn(() => ({
    setData,
    priceToCoordinate,
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
  }));
  return {
    setData,
    fitContent,
    setVisibleLogicalRange,
    getVisibleLogicalRange,
    timeToCoordinate,
    priceToCoordinate,
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

  it('creates a buy marker at the close of the bar under the cursor', async () => {
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
