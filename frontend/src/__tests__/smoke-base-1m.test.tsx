/**
 * Smoke de la app tras el cambio de base 1 m (TASK-073, RNF-005/RNF-008).
 *
 * DoD: recorrer las rutas principales sin errores y comprobar que el gráfico
 * (SCR-004) se monta pidiendo la serie en 1 m.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const chartProps = vi.hoisted(() => ({ calls: [] as { symbol?: string; timeframe?: string }[] }));

vi.mock('../components/ChartPane/ChartPane', async () => {
  const React = await import('react');
  return {
    default: React.forwardRef(function MockChartPane(
      props: { symbol?: string; timeframe?: string },
      ref: unknown,
    ) {
      chartProps.calls.push({ symbol: props.symbol, timeframe: props.timeframe });
      React.useImperativeHandle(ref as never, () => ({ compose: () => null }));
      return <div data-testid="chart-pane" />;
    }),
  };
});

vi.mock('../components/IndicatorForm/IndicatorForm', () => ({
  default: () => <div data-testid="indicator-form" />,
}));

vi.mock('../export', () => ({
  EXPORT_SCALES: [1, 2],
  EXPORT_FORMATS: ['png'],
  exportChartPng: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock('../services/assets', () => ({
  fetchAssets: vi.fn().mockResolvedValue([]),
  fetchCatalog: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/downloads', () => ({
  requestDownload: vi.fn(),
  fetchDownloadStatus: vi.fn(),
  fetchDownloadHistory: vi.fn().mockResolvedValue([]),
  DownloadError: class extends Error {},
}));

describe('Smoke base 1m', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    chartProps.calls.length = 0;
    window.location.hash = '';
  });

  it('renders the chart screen requesting the 1m series', async () => {
    window.location.hash = '#/chart?symbol=EURUSD&timeframe=1m';

    render(<App />);

    expect(await screen.findByTestId('chart-pane')).toBeTruthy();
    await waitFor(() => expect(chartProps.calls.at(-1)?.timeframe).toBe('1m'));
    expect(chartProps.calls.at(-1)?.symbol).toBe('EURUSD');
  });

  it('navigates the main routes without errors', async () => {
    window.location.hash = '#/chart?symbol=EURUSD&timeframe=1m';
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Biblioteca' }));
    expect(await screen.findByRole('heading', { name: 'Activos guardados' })).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Descarga' }));
    expect(await screen.findByRole('button', { name: 'Iniciar descarga' })).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Gráfico' }));
    expect(await screen.findByTestId('chart-pane')).toBeTruthy();
  });
});
