import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetRow } from '../../../services/assets';
import DownloadForm from '../DownloadForm';

const downloadMocks = vi.hoisted(() => ({ requestDownload: vi.fn() }));
const assetsMocks = vi.hoisted(() => ({ fetchCatalog: vi.fn() }));

vi.mock('../../../services/downloads', () => ({
  requestDownload: downloadMocks.requestDownload,
  DownloadError: class extends Error {},
}));

vi.mock('../../../services/assets', () => ({
  fetchCatalog: assetsMocks.fetchCatalog,
}));

const REFERENCE = '2026-09-24';

const CATALOG: AssetRow[] = [
  { symbol: 'EURUSD', type: 'forex', coverage_start: 1, coverage_end: 2, status: 'completo' },
  { symbol: 'GBPUSD', type: 'forex', coverage_start: 1, coverage_end: 2, status: 'completo' },
  {
    symbol: 'XAUUSD',
    type: 'metal',
    coverage_start: null,
    coverage_end: null,
    status: 'sin_datos',
  },
];

function fillRange(start: string, end: string): void {
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: end } });
}

/** Renderiza y espera a que el catálogo esté cargado (activo inicial). */
async function renderReady(): Promise<void> {
  render(<DownloadForm referenceDate={REFERENCE} />);
  await screen.findByRole('option', { name: 'EURUSD' });
}

describe('DownloadForm (SCR-002)', () => {
  beforeEach(() => {
    downloadMocks.requestDownload.mockResolvedValue({ task_id: 'task-9' });
    assetsMocks.fetchCatalog.mockResolvedValue(CATALOG);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the labeled fields, the fixed UTC note and the submit button', () => {
    render(<DownloadForm referenceDate={REFERENCE} />);

    expect(screen.getByLabelText('Tipo')).toBeTruthy();
    expect(screen.getByLabelText('Activo')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de inicio')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de fin')).toBeTruthy();
    expect(screen.getByText(/1 minuto \(UTC\)/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar descarga' })).toBeTruthy();
  });

  it('offers the 5 new forex pairs from the catalog (RF-216, TASK-UI-252)', async () => {
    const pairs = ['GBPJPY', 'EURJPY', 'AUDUSD', 'USDCAD', 'EURGBP'];
    assetsMocks.fetchCatalog.mockResolvedValue(
      pairs.map((symbol) => ({
        symbol,
        type: 'forex',
        coverage_start: null,
        coverage_end: null,
        status: 'sin_datos',
      })),
    );

    render(<DownloadForm referenceDate={REFERENCE} />);
    await screen.findByRole('option', { name: 'GBPJPY' });

    for (const symbol of pairs) {
      expect(screen.getByRole('option', { name: symbol })).toBeTruthy();
    }
    expect(assetsMocks.fetchCatalog).toHaveBeenCalledTimes(1);
  });

  it('changes the asset options with the type', async () => {
    await renderReady();

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'metal' } });

    expect(screen.getByRole('option', { name: 'XAUUSD' })).toBeTruthy();
  });

  it('keeps submit disabled until the range is complete', async () => {
    await renderReady();
    const button = screen.getByRole('button', { name: 'Iniciar descarga' }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    fillRange('2026-01-01', '2026-08-31');
    expect(button.disabled).toBe(false);
  });

  it('enqueues the download in UTC seconds and notifies the queued task', async () => {
    const onQueued = vi.fn();
    render(<DownloadForm referenceDate={REFERENCE} onQueued={onQueued} />);
    await screen.findByRole('option', { name: 'EURUSD' });
    fillRange('2026-01-01', '2026-01-02');

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar descarga' }));

    const start = Math.floor(Date.parse('2026-01-01T00:00:00Z') / 1000);
    const end = Math.floor(Date.parse('2026-01-02T23:59:59Z') / 1000);
    await waitFor(() => expect(onQueued).toHaveBeenCalledTimes(1));
    expect(downloadMocks.requestDownload).toHaveBeenCalledWith({ asset: 'EURUSD', start, end });
    expect(onQueued).toHaveBeenCalledWith({ taskId: 'task-9', asset: 'EURUSD', start, end });
  });

  it('applies the prefill of a partial download range (RF-006)', async () => {
    render(
      <DownloadForm
        referenceDate={REFERENCE}
        prefill={{ asset: 'XAUUSD', start: '2026-02-01', end: '2026-03-01' }}
      />,
    );
    await screen.findByRole('option', { name: 'XAUUSD' });

    await waitFor(() =>
      expect((screen.getByLabelText('Activo') as HTMLSelectElement).value).toBe('XAUUSD'),
    );
    expect((screen.getByLabelText('Tipo') as HTMLSelectElement).value).toBe('metal');
    expect((screen.getByLabelText('Fecha de inicio') as HTMLInputElement).value).toBe('2026-02-01');
    expect((screen.getByLabelText('Fecha de fin') as HTMLInputElement).value).toBe('2026-03-01');
  });

  it('disables the fields and the submit while a download is in progress', () => {
    const { container } = render(<DownloadForm referenceDate={REFERENCE} disabled />);

    expect(container.querySelector('.download-form__fieldset')?.hasAttribute('disabled')).toBe(
      true,
    );
    expect(
      (screen.getByRole('button', { name: 'Iniciar descarga' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('shows an error banner when the catalog cannot be loaded', async () => {
    assetsMocks.fetchCatalog.mockRejectedValueOnce(new Error('catálogo caído'));

    render(<DownloadForm referenceDate={REFERENCE} />);

    expect(await screen.findByText('catálogo caído')).toBeTruthy();
  });

  it('shows an error banner and preserves the values when the request fails', async () => {
    downloadMocks.requestDownload.mockRejectedValueOnce(new Error('falló la descarga'));
    await renderReady();
    fillRange('2026-01-01', '2026-01-02');

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar descarga' }));

    expect(await screen.findByText('falló la descarga')).toBeTruthy();
    expect((screen.getByLabelText('Fecha de inicio') as HTMLInputElement).value).toBe('2026-01-01');
  });

  it('rejects a start older than two years (RNF-003)', async () => {
    await renderReady();

    fillRange('2020-01-01', '2026-01-02');

    expect(screen.getByText(/fuera de la cobertura/)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Iniciar descarga' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
