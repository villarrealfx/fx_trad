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
    default: React.forwardRef(function MockChartPane(_props: unknown, ref: unknown) {
      React.useImperativeHandle(ref as never, () => ({
        compose: () => ({ toDataURL: () => 'data:image/png;base64,AAA' }),
      }));
      return <div data-testid="chart-pane" aria-hidden="true" />;
    }),
  };
});

vi.mock('../components/IndicatorPanel/IndicatorPanel', () => ({
  default: () => <div data-testid="indicator-panel" />,
}));

vi.mock('../export', () => ({
  EXPORT_SCALES: [1, 2, 4],
  EXPORT_FORMATS: ['png', 'webp'],
  exportChartPng: exportMocks.exportChartPng,
  downloadBlob: exportMocks.downloadBlob,
}));

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.location.hash = '';
  });

  it('renders the app heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'fxtrad' })).toBeTruthy();
  });

  it('navigates between screens through the app shell', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Biblioteca' }));
    expect(await screen.findByRole('heading', { name: 'Biblioteca' })).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Descarga' }));
    expect(await screen.findByRole('button', { name: 'Iniciar descarga' })).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Gráfico' }));
    expect(await screen.findByRole('button', { name: 'Exportar' })).toBeTruthy();
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
