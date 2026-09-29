import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AssetLibraryScreen from '../AssetLibraryScreen';
import type { AssetRow } from '../../../services/assets';
import type { DownloadHistoryEntry } from '../../../services/downloads';

const mocks = vi.hoisted(() => ({
  fetchAssets: vi.fn(),
  fetchDownloadHistory: vi.fn(),
}));

vi.mock('../../../services/assets', () => ({
  fetchAssets: mocks.fetchAssets,
  AssetsError: class extends Error {},
}));

vi.mock('../../../services/downloads', () => ({
  fetchDownloadHistory: mocks.fetchDownloadHistory,
  DownloadError: class extends Error {},
}));

const ASSET: AssetRow = {
  symbol: 'EURUSD',
  type: 'forex',
  coverage_start: 0,
  coverage_end: 0,
  status: 'completo',
};

const HISTORY: DownloadHistoryEntry = {
  date: '2026-08-26T12:00:00Z',
  active: 'EURUSD',
  range: { start: 0, end: 1 },
  status: 'exito',
  rows: 87421,
};

describe('AssetLibraryScreen (TASK-UI-010, SCR-001)', () => {
  beforeEach(() => {
    mocks.fetchAssets.mockResolvedValue([ASSET]);
    mocks.fetchDownloadHistory.mockResolvedValue([HISTORY]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the assets table and the last download footer', async () => {
    render(<AssetLibraryScreen />);

    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.getByText(/Última descarga: 26-08-2026 · EURUSD ·/)).toBeTruthy();
  });

  it('shows the loading skeleton while the catalog is read (RF-220)', () => {
    mocks.fetchAssets.mockReturnValue(new Promise(() => {}));

    render(<AssetLibraryScreen />);

    expect(screen.getByRole('status').textContent).toContain('Cargando activos');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('lists the stored assets (including a new pair) from GET /assets (RF-220)', async () => {
    mocks.fetchAssets.mockResolvedValue([
      ASSET,
      { symbol: 'GBPJPY', type: 'forex', coverage_start: 10, coverage_end: 20, status: 'completo' },
    ]);

    render(<AssetLibraryScreen />);

    expect(await screen.findByRole('cell', { name: 'EURUSD' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'GBPJPY' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Cobertura' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeTruthy();
  });

  it('shows the empty CTA and navigates to SCR-002', async () => {
    mocks.fetchAssets.mockResolvedValue([]);
    const onNavigate = vi.fn();
    render(<AssetLibraryScreen onNavigate={onNavigate} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Descargar mi primer activo' }));

    expect(onNavigate).toHaveBeenCalledWith('/downloads');
  });

  it('shows an error banner and retries the catalog load', async () => {
    mocks.fetchAssets.mockRejectedValueOnce(new Error('catálogo caído'));
    render(<AssetLibraryScreen />);

    expect(await screen.findByText('catálogo caído')).toBeTruthy();

    mocks.fetchAssets.mockResolvedValueOnce([ASSET]);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('table')).toBeTruthy();
  });

  it('marks partial assets on their row', async () => {
    mocks.fetchAssets.mockResolvedValue([{ ...ASSET, symbol: 'XAUUSD', status: 'parcial' }]);
    render(<AssetLibraryScreen />);

    expect(await screen.findByText('parcial')).toBeTruthy();
  });

  it('navigates to SCR-003 with the selected asset', async () => {
    const onNavigate = vi.fn();
    render(<AssetLibraryScreen onNavigate={onNavigate} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Graficar' }));

    expect(onNavigate).toHaveBeenCalledWith('/open?symbol=EURUSD');
  });

  it('navigates to SCR-002 for the incremental update', async () => {
    const onNavigate = vi.fn();
    render(<AssetLibraryScreen onNavigate={onNavigate} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Actualizar activos' }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('/downloads'));
  });
});
