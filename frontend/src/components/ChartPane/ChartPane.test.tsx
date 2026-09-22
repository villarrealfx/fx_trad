import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChartPane from './ChartPane';

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
  const subscribeCrosshairMove = vi.fn();
  const remove = vi.fn();
  const addCandlestickSeries = vi.fn(() => ({
    setData,
  }));
  const timeScale = vi.fn(() => ({
    fitContent,
    setVisibleLogicalRange,
    getVisibleLogicalRange,
  }));
  const createChart = vi.fn<(...args: unknown[]) => unknown>(() => ({
    addCandlestickSeries,
    timeScale,
    subscribeCrosshairMove,
    remove,
  }));
  return {
    setData,
    fitContent,
    setVisibleLogicalRange,
    getVisibleLogicalRange,
    subscribeCrosshairMove,
    remove,
    timeScale,
    createChart,
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

describe('ChartPane', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    for (const mock of Object.values(chartMocks)) {
      mock.mockClear();
    }
  });

  afterEach(() => {
    cleanup();
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
});
