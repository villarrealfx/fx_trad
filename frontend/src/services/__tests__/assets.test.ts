import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetsError, fetchAssets, fetchCatalog } from '../assets';

const fetchMock = vi.fn();
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const ROW = {
  symbol: 'EURUSD',
  type: 'forex',
  coverage_start: 1,
  coverage_end: 2,
  status: 'completo',
};

describe('fetchAssets (TASK-UI-010)', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('gets the stored assets catalog (scope=stored)', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(jsonResponse([ROW]));

    const result = await fetchAssets();

    expect(result).toEqual([ROW]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/assets?scope=stored',
      expect.objectContaining({}),
    );
  });

  it('gets the full canonical catalog (scope=all, TASK-204)', async () => {
    vi.stubGlobal('fetch', fetchMock);
    const uncovered = {
      symbol: 'GBPJPY',
      type: 'forex',
      coverage_start: null,
      coverage_end: null,
      status: 'sin_datos',
    };
    fetchMock.mockResolvedValue(jsonResponse([ROW, uncovered]));

    const result = await fetchCatalog();

    expect(result).toEqual([ROW, uncovered]);
    expect(fetchMock).toHaveBeenCalledWith('/assets?scope=all', expect.objectContaining({}));
  });

  it('throws AssetsError with the backend detail on failure', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'catálogo caído' }, 503));

    await expect(fetchAssets()).rejects.toBeInstanceOf(AssetsError);
  });

  it('uses a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));

    await expect(fetchAssets()).rejects.toThrow(/HTTP 500/);
  });
});
