import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeriesError, fetchSeries } from '../series';

const OK_RESPONSE = {
  symbol: 'EURUSD',
  timeframe: '1h',
  candles: [{ time: 1_781_000_000, open: 1.08, high: 1.09, low: 1.07, close: 1.085 }],
};

const createResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('fetchSeries', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the series with symbol and timeframe', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse(OK_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    const series = await fetchSeries({ symbol: 'EURUSD', timeframe: '1h' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/series?symbol=EURUSD&timeframe=1h'),
      expect.anything(),
    );
    expect(series).toEqual(OK_RESPONSE);
  });

  it('includes start and end when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse(OK_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    await fetchSeries({ symbol: 'EURUSD', timeframe: '1h', start: 10, end: 20 });
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('start=10');
    expect(url).toContain('end=20');
  });

  it('omits optional start and end', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse(OK_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    await fetchSeries({ symbol: 'EURUSD', timeframe: '1h' });
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).not.toContain('start=');
    expect(url).not.toContain('end=');
  });

  it('throws SeriesError with the backend detail on failure', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(createResponse({ detail: 'Activo sin serie' }, 404)),
      );
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchSeries({ symbol: 'GBPUSD', timeframe: '1h' })).rejects.toThrow(SeriesError);
    await expect(fetchSeries({ symbol: 'GBPUSD', timeframe: '1h' })).rejects.toThrow(
      'Activo sin serie',
    );
  });
});
