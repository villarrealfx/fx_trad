import { describe, expect, it } from 'vitest';
import { buildChartUrl, parseChartQuery, parseLocation } from '../routes';

describe('parseLocation (TASK-026)', () => {
  it('splits the path and the query', () => {
    const location = parseLocation('/chart?symbol=XAUUSD&timeframe=4h');

    expect(location.path).toBe('/chart');
    expect(location.params.get('symbol')).toBe('XAUUSD');
    expect(location.params.get('timeframe')).toBe('4h');
  });

  it('falls back to the default route for a non-route hash (skip link)', () => {
    expect(parseLocation('main-content').path).toBe('/chart');
  });
});

describe('parseChartQuery (TASK-026)', () => {
  it('defaults the symbol and timeframe', () => {
    const query = parseChartQuery(new URLSearchParams());

    expect(query.symbol).toBe('EURUSD');
    expect(query.timeframe).toBe('1h');
    expect(query.start).toBeUndefined();
    expect(query.end).toBeUndefined();
  });

  it('ignores a non-canonical timeframe', () => {
    expect(parseChartQuery(new URLSearchParams('timeframe=3m')).timeframe).toBe('1h');
  });

  it('reads the range when present', () => {
    const query = parseChartQuery(new URLSearchParams('start=2026-01-01&end=2026-02-01'));
    expect(query.start).toBe('2026-01-01');
    expect(query.end).toBe('2026-02-01');
  });
});

describe('buildChartUrl (TASK-026)', () => {
  it('builds the chart url with symbol and timeframe', () => {
    expect(buildChartUrl({ symbol: 'XAUUSD', timeframe: '4h' })).toBe(
      '/chart?symbol=XAUUSD&timeframe=4h',
    );
  });

  it('includes the range when provided', () => {
    expect(
      buildChartUrl({
        symbol: 'EURUSD',
        timeframe: '1h',
        start: '2026-01-01',
        end: '2026-02-01',
      }),
    ).toBe('/chart?symbol=EURUSD&timeframe=1h&start=2026-01-01&end=2026-02-01');
  });
});
