// @vitest-environment node
/**
 * Tests de la persistencia de configuración del gráfico (TASK-UI-240, RI-201).
 *
 * Verifican el esquema versionado, la clave por activo+timeframe, el round-trip
 * y la robustez ante datos corruptos, versión desconocida y cuota excedida.
 */
import { describe, expect, it } from 'vitest';
import type { OverlayShape } from '../../charting/overlay-geometry';
import type { IndicatorConfig } from '../../indicators/config';
import {
  CHART_CONFIG_VERSION,
  chartConfigKey,
  createChartConfigStore,
  deserializeChartConfig,
  serializeChartConfig,
} from '../chart-config';

const INDICATORS: IndicatorConfig[] = [{ id: 'ma-20', kind: 'MA', period: 20, visible: true }];

const DRAWINGS: OverlayShape[] = [
  {
    id: 'line-1',
    kind: 'line',
    from: { time: 0, price: 0 },
    to: { time: 10, price: 10 },
  },
];

/** `Storage` en memoria para tests deterministas. */
class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('chartConfigKey', () => {
  it('incluye versión, activo y timeframe', () => {
    expect(chartConfigKey('EURUSD', '1h')).toBe(`fxtrad.chart.v${CHART_CONFIG_VERSION}.EURUSD.1h`);
  });
});

describe('serializeChartConfig / deserializeChartConfig', () => {
  it('hace round-trip de indicadores y dibujos', () => {
    const raw = serializeChartConfig({ indicators: INDICATORS, drawings: DRAWINGS });

    expect(deserializeChartConfig(raw)).toEqual({
      version: CHART_CONFIG_VERSION,
      indicators: INDICATORS,
      drawings: DRAWINGS,
    });
  });

  it('devuelve null ante ausencia, corrupción o versión desconocida', () => {
    expect(deserializeChartConfig(null)).toBeNull();
    expect(deserializeChartConfig('')).toBeNull();
    expect(deserializeChartConfig('{no-json')).toBeNull();
    expect(deserializeChartConfig(JSON.stringify({ version: 999, indicators: [], drawings: [] })))
      .toBeNull();
    expect(deserializeChartConfig(JSON.stringify({ version: CHART_CONFIG_VERSION }))).toBeNull();
  });

  it('filtra entradas malformadas conservando las válidas', () => {
    const raw = JSON.stringify({
      version: CHART_CONFIG_VERSION,
      indicators: [INDICATORS[0], { id: 'bad' }],
      drawings: [DRAWINGS[0], { id: 'x', kind: 'line' }],
    });

    expect(deserializeChartConfig(raw)).toEqual({
      version: CHART_CONFIG_VERSION,
      indicators: INDICATORS,
      drawings: DRAWINGS,
    });
  });
});

describe('createChartConfigStore', () => {
  it('guarda y carga por activo + timeframe de forma independiente', () => {
    const storage = new MemoryStorage();
    const store = createChartConfigStore(storage);

    store.save('EURUSD', '1h', { indicators: INDICATORS, drawings: DRAWINGS });

    expect(store.load('EURUSD', '1h')?.indicators).toEqual(INDICATORS);
    expect(store.load('EURUSD', '4h')).toBeNull();
    expect(store.load('GBPUSD', '1h')).toBeNull();
  });

  it('clear elimina la configuración guardada', () => {
    const storage = new MemoryStorage();
    const store = createChartConfigStore(storage);

    store.save('EURUSD', '1h', { indicators: INDICATORS, drawings: DRAWINGS });
    store.clear('EURUSD', '1h');

    expect(store.load('EURUSD', '1h')).toBeNull();
  });

  it('es un no-op sin almacenamiento disponible', () => {
    const store = createChartConfigStore(null);

    store.save('EURUSD', '1h', { indicators: INDICATORS, drawings: DRAWINGS });

    expect(store.load('EURUSD', '1h')).toBeNull();
  });

  it('no lanza si el almacenamiento rechaza la escritura (cuota)', () => {
    const rejecting: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const store = createChartConfigStore(rejecting);

    expect(() =>
      store.save('EURUSD', '1h', { indicators: INDICATORS, drawings: DRAWINGS }),
    ).not.toThrow();
  });
});

describe('esquema y migración (TASK-UI-242)', () => {
  it('el documento serializado declara la versión de esquema actual', () => {
    const raw = serializeChartConfig({ indicators: INDICATORS, drawings: DRAWINGS });

    expect((JSON.parse(raw) as { version: number }).version).toBe(CHART_CONFIG_VERSION);
  });

  it('hace round-trip vacío y poblado sin pérdida', () => {
    const empty = serializeChartConfig({ indicators: [], drawings: [] });
    expect(deserializeChartConfig(empty)).toEqual({
      version: CHART_CONFIG_VERSION,
      indicators: [],
      drawings: [],
    });

    const populated = serializeChartConfig({ indicators: INDICATORS, drawings: DRAWINGS });
    expect(deserializeChartConfig(populated)).toEqual({
      version: CHART_CONFIG_VERSION,
      indicators: INDICATORS,
      drawings: DRAWINGS,
    });
  });

  it('descarta documentos de una versión anterior (política ADR-018)', () => {
    const obsolete = JSON.stringify({
      version: CHART_CONFIG_VERSION - 1,
      indicators: INDICATORS,
      drawings: DRAWINGS,
    });

    expect(deserializeChartConfig(obsolete)).toBeNull();
  });

  it('ignora entradas guardadas bajo una clave de versión antigua', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'fxtrad.chart.v0.EURUSD.1h',
      JSON.stringify({ version: 0, indicators: INDICATORS, drawings: DRAWINGS }),
    );

    const store = createChartConfigStore(storage);

    expect(store.load('EURUSD', '1h')).toBeNull();
  });

  it('ignora campos desconocidos del documento (contrato extensible)', () => {
    const raw = JSON.stringify({
      version: CHART_CONFIG_VERSION,
      indicators: INDICATORS,
      drawings: DRAWINGS,
      futureField: { anything: true },
    });

    expect(deserializeChartConfig(raw)).toEqual({
      version: CHART_CONFIG_VERSION,
      indicators: INDICATORS,
      drawings: DRAWINGS,
    });
  });
});
