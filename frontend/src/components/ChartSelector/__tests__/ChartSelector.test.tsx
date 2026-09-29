import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChartSelector from '../ChartSelector';
import type { AssetRow } from '../../../services/assets';

const mocks = vi.hoisted(() => ({ fetchAssets: vi.fn() }));

vi.mock('../../../services/assets', () => ({
  fetchAssets: mocks.fetchAssets,
  AssetsError: class extends Error {},
}));

const day = (iso: string): number => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 1000);

const EURUSD: AssetRow = {
  symbol: 'EURUSD',
  type: 'forex',
  coverage_start: day('2024-09-06'),
  coverage_end: day('2026-08-31') + 86399,
  status: 'completo',
};
const XAUUSD: AssetRow = {
  symbol: 'XAUUSD',
  type: 'metal',
  coverage_start: day('2026-01-02'),
  coverage_end: day('2026-08-31') + 86399,
  status: 'parcial',
};

async function renderLoaded(): Promise<void> {
  render(<ChartSelector onOpen={vi.fn()} onDownload={vi.fn()} />);
  await screen.findByLabelText('Activo (de la biblioteca)');
}

describe('ChartSelector (TASK-026/TASK-UI-030, SCR-003)', () => {
  beforeEach(() => {
    mocks.fetchAssets.mockResolvedValue([EURUSD, XAUUSD]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the controls and the coverage of the selected asset', async () => {
    await renderLoaded();

    expect(screen.getByLabelText('Fecha de inicio')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Timeframe (agregado desde 1 m)' })).toBeTruthy();
    expect(screen.getByText(/Cobertura: 2024-09-06 → 2026-08-31/)).toBeTruthy();
  });

  it('offers no 1s timeframe option (RF-219)', async () => {
    await renderLoaded();

    expect(screen.queryByRole('radio', { name: '1s' })).toBeNull();
    expect(screen.getByRole('radio', { name: '1m' })).toBeTruthy();
  });

  it('shows a loading skeleton while reading coverage', () => {
    mocks.fetchAssets.mockReturnValue(new Promise(() => {}));
    render(<ChartSelector onOpen={vi.fn()} />);

    expect(screen.getByRole('status').textContent).toContain('Cargando activos');
    expect(screen.queryByLabelText('Activo (de la biblioteca)')).toBeNull();
  });

  it('blocks opening and offers the download CTA when the library is empty', async () => {
    mocks.fetchAssets.mockResolvedValue([]);
    const onDownload = vi.fn();
    render(<ChartSelector onOpen={vi.fn()} onDownload={onDownload} />);

    const open = await screen.findByRole('button', { name: 'Abrir gráfico' });
    expect((open as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar datos' }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it('shows an error banner and retries the coverage load', async () => {
    mocks.fetchAssets.mockRejectedValueOnce(new Error('cobertura caída'));
    render(<ChartSelector onOpen={vi.fn()} />);

    expect(await screen.findByText('cobertura caída')).toBeTruthy();

    mocks.fetchAssets.mockResolvedValueOnce([EURUSD]);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByLabelText('Activo (de la biblioteca)')).toBeTruthy();
  });

  it('opens the chart with the default selection', async () => {
    const onOpen = vi.fn();
    render(<ChartSelector onOpen={onOpen} />);
    await screen.findByLabelText('Activo (de la biblioteca)');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir gráfico' }));

    expect(onOpen).toHaveBeenCalledWith('/chart?symbol=EURUSD&timeframe=1h');
  });

  it('includes the asset, timeframe and range in the url', async () => {
    const onOpen = vi.fn();
    render(<ChartSelector onOpen={onOpen} />);
    await screen.findByLabelText('Activo (de la biblioteca)');

    fireEvent.change(screen.getByLabelText('Activo (de la biblioteca)'), {
      target: { value: 'XAUUSD' },
    });
    fireEvent.click(screen.getByLabelText('4h'));
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-03-01' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir gráfico' }));

    expect(onOpen).toHaveBeenCalledWith(
      '/chart?symbol=XAUUSD&timeframe=4h&start=2026-03-01&end=2026-04-01',
    );
  });

  it('rejects a start outside coverage, focuses the field and does not open', async () => {
    const onOpen = vi.fn();
    render(<ChartSelector onOpen={onOpen} />);
    await screen.findByLabelText('Activo (de la biblioteca)');
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2024-01-01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Abrir gráfico' }));

    expect(screen.getByText(/fuera de la cobertura/)).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Fecha de inicio'));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('rejects an end outside coverage and focuses the field', async () => {
    render(<ChartSelector onOpen={vi.fn()} />);
    await screen.findByLabelText('Activo (de la biblioteca)');
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2027-01-01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Abrir gráfico' }));

    expect(document.activeElement).toBe(screen.getByLabelText('Fecha de fin'));
  });

  it('rejects a start after the end and focuses the field', async () => {
    const onOpen = vi.fn();
    render(<ChartSelector onOpen={onOpen} />);
    await screen.findByLabelText('Activo (de la biblioteca)');
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-01-01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Abrir gráfico' }));

    expect(document.activeElement).toBe(screen.getByLabelText('Fecha de fin'));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('warns the exact useful range for a partial asset', async () => {
    render(<ChartSelector onOpen={vi.fn()} />);
    await screen.findByLabelText('Activo (de la biblioteca)');

    fireEvent.change(screen.getByLabelText('Activo (de la biblioteca)'), {
      target: { value: 'XAUUSD' },
    });

    expect(screen.getByText(/cobertura de XAUUSD es parcial/)).toBeTruthy();
    expect(screen.getByText(/Rango útil exacto: 2026-01-02 → 2026-08-31/)).toBeTruthy();
  });
});
