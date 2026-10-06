import { describe, expect, it } from 'vitest';
import {
  ROUTES,
  buildChartUrl,
  hasExplicitChartQuery,
  parseChartQuery,
  parseLocation,
  routeFor,
} from '../routes';

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

describe('hasExplicitChartQuery (TASK-404)', () => {
  it('es falso sin query y verdadero con activo o timeframe', () => {
    expect(hasExplicitChartQuery(new URLSearchParams())).toBe(false);
    expect(hasExplicitChartQuery(new URLSearchParams('start=2026-01-01'))).toBe(false);
    expect(hasExplicitChartQuery(new URLSearchParams('symbol=GBPUSD'))).toBe(true);
    expect(hasExplicitChartQuery(new URLSearchParams('timeframe=15m'))).toBe(true);
  });
});

describe('parseChartQuery con fallback persistido (TASK-404, ADR-030)', () => {
  const FALLBACK = {
    symbol: 'GBPUSD',
    timeframe: '15m' as const,
    start: '2026-01-02',
    end: '2026-03-04',
  };

  it('usa el fallback completo cuando la URL no trae query', () => {
    expect(parseChartQuery(new URLSearchParams(), FALLBACK)).toEqual({
      symbol: 'GBPUSD',
      timeframe: '15m',
      start: '2026-01-02',
      end: '2026-03-04',
    });
  });

  it('un parámetro explícito NUNCA se sobrescribe con el fallback', () => {
    const query = parseChartQuery(new URLSearchParams('symbol=XAUUSD&timeframe=4h'), FALLBACK);

    expect(query.symbol).toBe('XAUUSD');
    expect(query.timeframe).toBe('4h');
    // El rango sí se rellena desde el fallback: no venía explícito.
    expect(query.start).toBe('2026-01-02');
    expect(query.end).toBe('2026-03-04');
  });

  it('ignora el fallback si no se pasa', () => {
    const query = parseChartQuery(new URLSearchParams());

    expect(query.symbol).toBe('EURUSD');
    expect(query.timeframe).toBe('1h');
  });

  it('ignora un timeframe no canónico del fallback', () => {
    const query = parseChartQuery(new URLSearchParams(), {
      symbol: 'GBPUSD',
      timeframe: '30m' as never,
    });

    expect(query.timeframe).toBe('1h');
    expect(query.symbol).toBe('GBPUSD');
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

describe('ROUTES sin Multigráfico (TASK-UI-416, RF-409)', () => {
  it('no expone la ruta ni la pantalla retiradas', () => {
    expect(ROUTES.some((route) => route.path === '/multichart')).toBe(false);
    expect(ROUTES.some((route) => (route.screen as string) === 'SCR-005')).toBe(false);
  });

  it('cae en Gráfico para la ruta retirada', () => {
    expect(routeFor('/multichart').path).toBe('/chart');
  });
});
