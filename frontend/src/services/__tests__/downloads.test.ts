import { afterEach, describe, expect, it, vi } from 'vitest';
import { DownloadError, requestDownload } from '../downloads';

const fetchMock = vi.fn();
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('requestDownload (TASK-UI-020)', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('posts the payload and returns the task id', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(jsonResponse({ task_id: 'task-1' }, 202));

    const result = await requestDownload({ asset: 'EURUSD', start: 1, end: 2 });

    expect(result).toEqual({ task_id: 'task-1' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/downloads',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ asset: 'EURUSD', start: 1, end: 2 }),
      }),
    );
  });

  it('throws DownloadError with the backend detail on failure', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Activo desconocido' }, 422));

    await expect(requestDownload({ asset: 'NOPE', start: 1, end: 2 })).rejects.toBeInstanceOf(
      DownloadError,
    );
  });
});
