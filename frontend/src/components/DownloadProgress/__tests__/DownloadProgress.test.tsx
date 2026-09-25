import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DownloadProgress, { type QueuedDownload } from '../DownloadProgress';

const statusMock = vi.hoisted(() => ({ fetchDownloadStatus: vi.fn() }));

vi.mock('../../../services/downloads', () => ({
  fetchDownloadStatus: statusMock.fetchDownloadStatus,
}));

const TASK: QueuedDownload = { taskId: 'task-1', asset: 'EURUSD', start: 0, end: 3599 };

/** Flush de las promesas pendientes del poll inicial. */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('DownloadProgress (TASK-UI-021, SCR-002)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('drives the bar to 100% and notifies once on success', async () => {
    statusMock.fetchDownloadStatus.mockResolvedValue({
      task_id: 'task-1',
      estado: 'exito',
      filas: 3600,
    });
    const onSettled = vi.fn();

    const { container } = render(<DownloadProgress task={TASK} onSettled={onSettled} />);
    await flush();

    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith({ task_id: 'task-1', estado: 'exito', filas: 3600 });
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    expect(container.querySelector('.progress')?.getAttribute('data-status')).toBe('complete');
    const state = screen.getByText(/completada/).textContent ?? '';
    expect(state.replace(/[^0-9]/g, '')).toContain('3600');
    expect(state).toContain('velas');
  });

  it('shows a partial download as paused with the covered fraction', async () => {
    statusMock.fetchDownloadStatus.mockResolvedValue({
      task_id: 'task-1',
      estado: 'parcial',
      filas: 1800,
    });
    const onSettled = vi.fn();

    const { container } = render(<DownloadProgress task={TASK} onSettled={onSettled} />);
    await flush();

    expect(onSettled).toHaveBeenCalledWith({ task_id: 'task-1', estado: 'parcial', filas: 1800 });
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    expect(container.querySelector('.progress')?.getAttribute('data-status')).toBe('paused');
    expect(screen.getByText(/parcial/)).toBeTruthy();
  });

  it('keeps polling while queued and only settles on the terminal state', async () => {
    statusMock.fetchDownloadStatus
      .mockResolvedValueOnce({ task_id: 'task-1', estado: 'encolada', filas: 0 })
      .mockResolvedValueOnce({ task_id: 'task-1', estado: 'exito', filas: 3600 });
    const onSettled = vi.fn();

    render(<DownloadProgress task={TASK} onSettled={onSettled} />);
    await flush();

    expect(onSettled).not.toHaveBeenCalled();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(statusMock.fetchDownloadStatus).toHaveBeenCalledTimes(2);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('shows an error banner and resumes polling on retry', async () => {
    statusMock.fetchDownloadStatus
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValueOnce({ task_id: 'task-1', estado: 'exito', filas: 3600 });
    const onSettled = vi.fn();

    render(<DownloadProgress task={TASK} onSettled={onSettled} />);
    await flush();

    expect(screen.getByText('sin red')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await flush();

    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('sin red')).toBeNull();
  });

  it('stops polling on unmount', async () => {
    statusMock.fetchDownloadStatus.mockReturnValue(new Promise(() => {}));

    const { unmount } = render(<DownloadProgress task={TASK} onSettled={vi.fn()} />);
    await flush();
    expect(statusMock.fetchDownloadStatus).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(statusMock.fetchDownloadStatus).toHaveBeenCalledTimes(1);
  });
});
