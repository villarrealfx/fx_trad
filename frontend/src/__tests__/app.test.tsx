import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const exportMocks = vi.hoisted(() => ({
  exportChartPng: vi.fn(async () => ({
    blob: new Blob(['png'], { type: 'image/png' }),
    filename: 'fxtrad-EURUSD-1h-2x.png',
  })),
  downloadBlob: vi.fn(),
}));

vi.mock('../components/ChartPane/ChartPane', async () => {
  const React = await import('react');
  return {
    default: React.forwardRef(function MockChartPane(
      props: {
        onExport?: () => void;
        onChangeTimeframe?: (timeframe: string) => void;
        onStatusChange?: (status: string) => void;
        initialDrawings?: ReadonlyArray<unknown>;
        indicators?: { maPeriods?: number[] };
      },
      ref: unknown,
    ) {
      React.useImperativeHandle(ref as never, () => ({
        compose: () => ({ toDataURL: () => 'data:image/png;base64,AAA' }),
      }));
      return (
        <div>
          <div data-testid="chart-pane" aria-hidden="true" />
          <span data-testid="pane-drawings">{String(props.initialDrawings?.length ?? 0)}</span>
          <span data-testid="pane-ma">{props.indicators?.maPeriods?.join(',') ?? ''}</span>
          <button type="button" onClick={props.onExport}>
            Exportar
          </button>
          <button type="button" onClick={() => props.onChangeTimeframe?.('15m')}>
            cambiar-tf
          </button>
          <button type="button" onClick={() => props.onChangeTimeframe?.('1h')}>
            volver-tf
          </button>
          <button type="button" onClick={() => props.onStatusChange?.('success')}>
            tf-success
          </button>
          <button type="button" onClick={() => props.onStatusChange?.('error')}>
            tf-error
          </button>
        </div>
      );
    }),
  };
});

vi.mock('../components/IndicatorForm/IndicatorForm', () => ({
  default: () => <div data-testid="indicator-form" />,
}));

vi.mock('../export', () => ({
  EXPORT_SCALES: [1, 2, 4],
  EXPORT_FORMATS: ['png', 'webp'],
  exportChartPng: exportMocks.exportChartPng,
  downloadBlob: exportMocks.downloadBlob,
}));

vi.mock('../services/assets', () => {
  const row = {
    symbol: 'EURUSD',
    type: 'forex',
    coverage_start: Math.floor(Date.parse('2024-09-06T00:00:00Z') / 1000),
    coverage_end: Math.floor(Date.parse('2026-08-31T23:59:59Z') / 1000),
    status: 'completo',
  };
  return {
    fetchAssets: vi.fn().mockResolvedValue([row]),
    fetchCatalog: vi.fn().mockResolvedValue([row]),
    AssetsError: class extends Error {},
  };
});

vi.mock('../services/downloads', () => ({
  requestDownload: vi.fn(),
  fetchDownloadStatus: vi.fn(),
  fetchDownloadHistory: vi.fn().mockResolvedValue([]),
  DownloadError: class extends Error {},
}));

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.location.hash = '';
    localStorage.clear();
  });

  it('renders the app heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'fxtrad' })).toBeTruthy();
  });

  it('navigates between screens through the app shell', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Biblioteca' }));
    expect(await screen.findByRole('heading', { name: 'Activos guardados' })).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Descarga' }));
    expect(await screen.findByRole('button', { name: 'Iniciar descarga' })).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Gráfico' }));
    expect(await screen.findByRole('button', { name: 'Exportar' })).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Multigráfico' }));
    await waitFor(() => expect(screen.getAllByTestId('chart-pane')).toHaveLength(2));
  });

  it('opens the chart from the selector with the chosen query (TASK-026)', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Abrir' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir gráfico' }));

    expect(await screen.findByRole('button', { name: 'Exportar' })).toBeTruthy();
  });

  it('retoma la última selección al volver a Gráfico sin query (TASK-404, RF-401)', async () => {
    render(<App />);

    // 1) Selección explícita en la URL: queda recordada como la última.
    window.location.hash = '/chart?symbol=GBPUSD&timeframe=15m';
    await waitFor(() => expect(window.location.hash).toContain('symbol=GBPUSD'));

    // 2) Volver a Gráfico sin query: se hidrata del puntero persistido y la URL
    //    se enriquece con la selección efectiva (sin apilar historial).
    window.location.hash = '/chart';
    await waitFor(() => expect(window.location.hash).toContain('symbol=GBPUSD'));

    expect(window.location.hash).toContain('timeframe=15m');
  });

  it('cambia de timeframe sin salir del gráfico y lo anuncia (TASK-UI-403, RF-403)', async () => {
    render(<App />);
    window.location.hash = '/chart?symbol=GBPUSD&timeframe=1h';
    await screen.findByRole('button', { name: 'Exportar' });

    fireEvent.click(screen.getByRole('button', { name: 'cambiar-tf' }));

    await waitFor(() => expect(window.location.hash).toContain('timeframe=15m'));
    // La selección efectiva queda recordada (RI-402).
    await waitFor(() =>
      expect(localStorage.getItem('fxtrad.chart.last')).toContain('"timeframe":"15m"'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'tf-success' }));

    expect(await screen.findByText('Timeframe 15 minutos.')).toBeTruthy();
  });

  it('revierte al timeframe anterior si el destino falla (TASK-UI-403)', async () => {
    render(<App />);
    window.location.hash = '/chart?symbol=GBPUSD&timeframe=1h';
    await screen.findByRole('button', { name: 'Exportar' });

    fireEvent.click(screen.getByRole('button', { name: 'cambiar-tf' }));
    await waitFor(() => expect(window.location.hash).toContain('timeframe=15m'));

    fireEvent.click(screen.getByRole('button', { name: 'tf-error' }));

    await waitFor(() => expect(window.location.hash).toContain('timeframe=1h'));
    // Sin anuncio de éxito: el cambio no llegó a cuajar.
    expect(screen.queryByText('Timeframe 15 minutos.')).toBeNull();
  });

  it('la ida y vuelta de TF conserva dibujos e indicadores (TASK-UI-405)', async () => {
    localStorage.setItem(
      'fxtrad.chart.v2.GBPUSD',
      JSON.stringify({
        version: 2,
        symbol: 'GBPUSD',
        drawings: [
          { id: 'fib-1', kind: 'fib', from: { time: 1, price: 1 }, to: { time: 2, price: 2 } },
        ],
        indicators: [{ id: 'ma-20', kind: 'MA', period: 20, visible: true }],
        selection: { timeframe: '1h' },
      }),
    );
    render(<App />);
    window.location.hash = '/chart?symbol=GBPUSD&timeframe=1h';

    await waitFor(() => expect(screen.getByTestId('pane-drawings').textContent).toBe('1'));
    expect(screen.getByTestId('pane-ma').textContent).toBe('20');

    fireEvent.click(screen.getByRole('button', { name: 'cambiar-tf' }));
    await waitFor(() => expect(window.location.hash).toContain('timeframe=15m'));
    // La misma figura y los mismos indicadores valen en la escala nueva.
    expect(screen.getByTestId('pane-drawings').textContent).toBe('1');
    expect(screen.getByTestId('pane-ma').textContent).toBe('20');

    fireEvent.click(screen.getByRole('button', { name: 'volver-tf' }));
    await waitFor(() => expect(window.location.hash).toContain('timeframe=1h'));
    expect(screen.getByTestId('pane-drawings').textContent).toBe('1');
  });

  it('lets the chart fill the vertical space without a fixed height (RF-202)', async () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Gráfico' }));
    await screen.findByTestId('chart-pane');

    const graph = container.querySelector('.chart-screen__graph') as HTMLElement | null;
    expect(graph).not.toBeNull();
    expect(graph?.style.height).toBe('');
  });

  it('centers the Abrir form inside a centered content container (RF-218)', async () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Abrir' }));
    await screen.findByRole('button', { name: 'Abrir gráfico' });

    const content = container.querySelector('.open-chart-screen__content');
    expect(content).not.toBeNull();
    expect(content?.querySelector('.chart-selector')).not.toBeNull();
  });

  it('opens the export modal and downloads a PNG', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    expect(screen.getByRole('dialog', { name: 'Exportar captura' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar PNG' }));

    await waitFor(() => expect(exportMocks.downloadBlob).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Captura descargada/)).toBeTruthy();
  });
});
