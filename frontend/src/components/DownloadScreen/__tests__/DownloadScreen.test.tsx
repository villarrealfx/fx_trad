import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DownloadScreen from '../DownloadScreen';

const mocks = vi.hoisted(() => ({
  requestDownload: vi.fn(),
  fetchDownloadStatus: vi.fn(),
  fetchDownloadHistory: vi.fn(),
}));

vi.mock('../../../services/downloads', () => ({
  requestDownload: mocks.requestDownload,
  fetchDownloadStatus: mocks.fetchDownloadStatus,
  fetchDownloadHistory: mocks.fetchDownloadHistory,
  DownloadError: class extends Error {},
}));

const HISTORY_ROW = {
  date: '2026-08-18T12:00:00Z',
  active: 'EURUSD',
  range: { start: 0, end: 86399 },
  status: 'exito' as const,
  rows: 87421,
};

/** Flush de las cadenas de promesas encadenadas del polling. */
async function flush(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
}

describe('DownloadScreen (TASK-UI-021, SCR-002)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.requestDownload.mockResolvedValue({ task_id: 'task-1' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('loads and shows the persisted history on mount', async () => {
    mocks.fetchDownloadHistory.mockResolvedValue([HISTORY_ROW]);

    render(<DownloadScreen />);
    await flush();

    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('éxito')).toBeTruthy();
  });

  it('hides the history block when there is none (empty)', async () => {
    mocks.fetchDownloadHistory.mockResolvedValue([]);

    render(<DownloadScreen />);
    await flush();

    expect(screen.queryByRole('table')).toBeNull();
  });

  it('follows the download and shows the success banner, then reloads the history', async () => {
    mocks.fetchDownloadHistory.mockResolvedValueOnce([]).mockResolvedValue([HISTORY_ROW]);
    mocks.fetchDownloadStatus.mockResolvedValue({
      task_id: 'task-1',
      estado: 'exito',
      filas: 3600,
    });

    render(<DownloadScreen />);
    await flush();
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-01-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar descarga' }));
    await flush();

    expect(screen.getByText(/completada/)).toBeTruthy();
    expect(screen.getByRole('table')).toBeTruthy();
    expect(mocks.fetchDownloadHistory).toHaveBeenCalledTimes(2);
  });

  it('marks a partial result and offers to complete the range (RF-006)', async () => {
    const partial = { ...HISTORY_ROW, status: 'parcial' as const, range: { start: 0, end: 86400 } };
    mocks.fetchDownloadHistory.mockResolvedValue([partial]);
    mocks.fetchDownloadStatus.mockResolvedValue({
      task_id: 'task-1',
      estado: 'parcial',
      filas: 1800,
    });

    render(<DownloadScreen />);
    await flush();
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-01-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar descarga' }));
    await flush();

    expect(screen.getByText(/Descarga parcial:/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Completar rango' }));

    expect((screen.getByLabelText('Fecha de inicio') as HTMLInputElement).value).toBe('1970-01-01');
    expect((screen.getByLabelText('Fecha de fin') as HTMLInputElement).value).toBe('1970-01-02');
  });

  it('shows an error banner when the history cannot be loaded and retries', async () => {
    mocks.fetchDownloadHistory
      .mockRejectedValueOnce(new Error('historial caído'))
      .mockResolvedValueOnce([HISTORY_ROW]);

    render(<DownloadScreen />);
    await flush();

    expect(screen.getByText('historial caído')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await flush();

    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.queryByText('historial caído')).toBeNull();
  });
});
