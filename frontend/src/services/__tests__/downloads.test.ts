import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DownloadError,
  fetchDownloadHistory,
  fetchDownloadStatus,
  requestDownload,
} from '../downloads';

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

describe('fetchDownloadStatus (TASK-UI-021)', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('gets the status and rows of a queued download', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(jsonResponse({ task_id: 'task-7', estado: 'encolada', filas: 0 }));

    const result = await fetchDownloadStatus('task-7');

    expect(result).toEqual({ task_id: 'task-7', estado: 'encolada', filas: 0 });
    expect(fetchMock).toHaveBeenCalledWith('/downloads/task-7', expect.objectContaining({}));
  });

  it('encodes the task id in the path', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(jsonResponse({ task_id: 'a/b', estado: 'exito', filas: 3 }));

    await fetchDownloadStatus('a/b');

    expect(fetchMock).toHaveBeenCalledWith('/downloads/a%2Fb', expect.anything());
  });

  it('throws DownloadError when the status endpoint fails', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'no disponible' }, 503));

    await expect(fetchDownloadStatus('task-7')).rejects.toBeInstanceOf(DownloadError);
  });
});

describe('fetchDownloadHistory (TASK-UI-021)', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('gets the persisted download history', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          date: '2026-08-26T10:00:00Z',
          active: 'EURUSD',
          range: { start: 1, end: 2 },
          status: 'exito',
          rows: 87421,
        },
      ]),
    );

    const result = await fetchDownloadHistory();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('exito');
    expect(fetchMock).toHaveBeenCalledWith('/downloads', expect.anything());
  });

  it('throws DownloadError with a generic message when the body is not JSON', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));

    await expect(fetchDownloadHistory()).rejects.toThrow(/HTTP 500/);
  });
});
