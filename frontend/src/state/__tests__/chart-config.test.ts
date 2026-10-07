// @vitest-environment node
/**
 * Tests del documento de configuración del gráfico v2 (TASK-401, RI-401, ADR-027).
 *
 * Verifican el contrato único por activo: la clave sin timeframe, el round-trip de
 * dibujos + indicadores + selección, la robustez ante datos corruptos, versión
 * desconocida o símbolo que no corresponde, y el aislamiento por activo. Patrón AAA.
 */
import { describe, expect, it } from 'vitest';
import type { OverlayShape } from '../../charting/overlay-geometry';
import type { IndicatorConfig } from '../../indicators/config';
import {
  CHART_CONFIG_VERSION,
  LAST_CHART_SELECTION_KEY,
  chartConfigKey,
  createChartConfigStore,
  deserializeChartConfig,
  deserializeLastSelection,
  serializeChartConfig,
  serializeLastSelection,
  type ChartSelection,
  type LastChartSelection,
} from '../chart-config';
import { legacyChartConfigKey } from '../migrate-chart-config';

const SELECTION: ChartSelection = { timeframe: '1h', start: '2026-01-02', end: '2026-03-04' };

const INDICATORS: IndicatorConfig[] = [{ id: 'ma-20', kind: 'MA', period: 20, visible: true }];

const DRAWINGS: OverlayShape[] = [
  {
    id: 'line-1',
    kind: 'line',
    from: { time: 0, price: 0 },
    to: { time: 10, price: 10 },
  },
];

/** Documento con los cinco tipos de dibujo, incluida la operación (TASK-UI-320). */
const MIXED_DRAWINGS: OverlayShape[] = [
  { id: 'line-1', kind: 'line', from: { time: 0, price: 1 }, to: { time: 10, price: 2 } },
  { id: 'rect-1', kind: 'rect', from: { time: 0, price: 1 }, to: { time: 10, price: 2 } },
  { id: 'fib-1', kind: 'fib', from: { time: 0, price: 1 }, to: { time: 10, price: 2 } },
  { id: 'op-1', kind: 'operation', from: { time: 0, price: 1.1 }, to: { time: 10, price: 1.095 } },
  { id: 'buy-1', kind: 'marker', position: { time: 0, price: 1 }, direction: 'buy' },
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

describe('chartConfigKey (TASK-401)', () => {
  it('incluye la versión y el activo, y NO el timeframe', () => {
    const key = chartConfigKey('EURUSD');

    expect(key).toBe(`fxtrad.chart.v${CHART_CONFIG_VERSION}.EURUSD`);
    expect(key).not.toContain('1h');
  });

  it('declara la versión 2 del esquema (ADR-027)', () => {
    expect(CHART_CONFIG_VERSION).toBe(2);
  });
});

describe('serializeChartConfig / deserializeChartConfig (TASK-401)', () => {
  it('hace round-trip de símbolo, indicadores, dibujos y selección', () => {
    const raw = serializeChartConfig('EURUSD', {
      indicators: INDICATORS,
      drawings: DRAWINGS,
      selection: SELECTION,
    });

    expect(deserializeChartConfig('EURUSD', raw)).toEqual({
      version: CHART_CONFIG_VERSION,
      symbol: 'EURUSD',
      indicators: INDICATORS,
      drawings: DRAWINGS,
      selection: SELECTION,
    });
  });

  it('hace round-trip de una selección sin rango explícito', () => {
    const raw = serializeChartConfig('GBPUSD', {
      indicators: [],
      drawings: [],
      selection: { timeframe: '15m' },
    });

    expect(deserializeChartConfig('GBPUSD', raw)?.selection).toEqual({ timeframe: '15m' });
  });

  it('devuelve null ante ausencia, corrupción o versión desconocida', () => {
    expect(deserializeChartConfig('EURUSD', null)).toBeNull();
    expect(deserializeChartConfig('EURUSD', '')).toBeNull();
    expect(deserializeChartConfig('EURUSD', '{no-json')).toBeNull();
    expect(
      deserializeChartConfig(
        'EURUSD',
        JSON.stringify({
          version: 999,
          symbol: 'EURUSD',
          indicators: [],
          drawings: [],
          selection: SELECTION,
        }),
      ),
    ).toBeNull();
  });

  it('devuelve null si el documento no declara el símbolo pedido', () => {
    const raw = serializeChartConfig('EURUSD', {
      indicators: [],
      drawings: [],
      selection: SELECTION,
    });

    expect(deserializeChartConfig('GBPUSD', raw)).toBeNull();
  });

  it('devuelve null si falta la selección o el timeframe no es válido', () => {
    const withoutSelection = JSON.stringify({
      version: CHART_CONFIG_VERSION,
      symbol: 'EURUSD',
      indicators: [],
      drawings: [],
    });
    const badTimeframe = JSON.stringify({
      version: CHART_CONFIG_VERSION,
      symbol: 'EURUSD',
      indicators: [],
      drawings: [],
      selection: { timeframe: '30m' },
    });

    expect(deserializeChartConfig('EURUSD', withoutSelection)).toBeNull();
    expect(deserializeChartConfig('EURUSD', badTimeframe)).toBeNull();
  });

  it('filtra entradas malformadas conservando las válidas', () => {
    const raw = JSON.stringify({
      version: CHART_CONFIG_VERSION,
      symbol: 'EURUSD',
      indicators: [INDICATORS[0], { id: 'bad' }],
      drawings: [DRAWINGS[0], { id: 'x', kind: 'line' }],
      selection: SELECTION,
    });

    expect(deserializeChartConfig('EURUSD', raw)).toEqual({
      version: CHART_CONFIG_VERSION,
      symbol: 'EURUSD',
      indicators: INDICATORS,
      drawings: DRAWINGS,
      selection: SELECTION,
    });
  });

  it('ignora campos desconocidos del documento (contrato extensible)', () => {
    const raw = JSON.stringify({
      version: CHART_CONFIG_VERSION,
      symbol: 'EURUSD',
      indicators: INDICATORS,
      drawings: DRAWINGS,
      selection: SELECTION,
      futureField: { anything: true },
    });

    expect(deserializeChartConfig('EURUSD', raw)).toEqual({
      version: CHART_CONFIG_VERSION,
      symbol: 'EURUSD',
      indicators: INDICATORS,
      drawings: DRAWINGS,
      selection: SELECTION,
    });
  });

  it('hace round-trip vacío y poblado sin pérdida', () => {
    const empty = serializeChartConfig('EURUSD', {
      indicators: [],
      drawings: [],
      selection: { timeframe: '1h' },
    });
    expect(deserializeChartConfig('EURUSD', empty)).toEqual({
      version: CHART_CONFIG_VERSION,
      symbol: 'EURUSD',
      indicators: [],
      drawings: [],
      selection: { timeframe: '1h' },
    });

    const populated = serializeChartConfig('EURUSD', {
      indicators: INDICATORS,
      drawings: MIXED_DRAWINGS,
      selection: SELECTION,
    });
    expect(deserializeChartConfig('EURUSD', populated)?.drawings).toHaveLength(5);
  });

  it('descarta documentos de la versión anterior v1 (política ADR-027)', () => {
    const obsolete = JSON.stringify({
      version: 1,
      indicators: INDICATORS,
      drawings: DRAWINGS,
    });

    expect(deserializeChartConfig('EURUSD', obsolete)).toBeNull();
  });
});

describe('createChartConfigStore (TASK-401)', () => {
  it('guarda y carga el documento por activo de forma independiente', () => {
    const storage = new MemoryStorage();
    const store = createChartConfigStore(storage);

    store.save('EURUSD', { indicators: INDICATORS, drawings: DRAWINGS, selection: SELECTION });

    expect(store.load('EURUSD')?.indicators).toEqual(INDICATORS);
    expect(store.load('EURUSD')?.selection).toEqual(SELECTION);
    expect(store.load('GBPUSD')).toBeNull();
  });

  it('usa una única clave por activo, sin el timeframe (ADR-027)', () => {
    const storage = new MemoryStorage();
    const store = createChartConfigStore(storage);

    store.save('EURUSD', {
      indicators: INDICATORS,
      drawings: DRAWINGS,
      selection: { timeframe: '15m' },
    });

    expect(storage.length).toBe(1);
    expect(storage.getItem('fxtrad.chart.v2.EURUSD')).not.toBeNull();
  });

  it('clear elimina el documento guardado', () => {
    const storage = new MemoryStorage();
    const store = createChartConfigStore(storage);

    store.save('EURUSD', { indicators: INDICATORS, drawings: DRAWINGS, selection: SELECTION });
    store.clear('EURUSD');

    expect(store.load('EURUSD')).toBeNull();
  });

  it('es un no-op sin almacenamiento disponible', () => {
    const store = createChartConfigStore(null);

    store.save('EURUSD', { indicators: INDICATORS, drawings: DRAWINGS, selection: SELECTION });

    expect(store.load('EURUSD')).toBeNull();
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
      store.save('EURUSD', { indicators: INDICATORS, drawings: DRAWINGS, selection: SELECTION }),
    ).not.toThrow();
  });

  it('da prioridad al documento v2 sobre los documentos v1 (ADR-027)', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'fxtrad.chart.v1.EURUSD.1h',
      JSON.stringify({ version: 1, indicators: INDICATORS, drawings: DRAWINGS }),
    );
    const store = createChartConfigStore(storage);
    store.save('EURUSD', { indicators: [], drawings: [], selection: { timeframe: '4h' } });

    const loaded = store.load('EURUSD', '1h');

    expect(loaded?.drawings).toEqual([]);
    expect(loaded?.selection).toEqual({ timeframe: '4h' });
    // La clave v1 sigue intacta: la migración es aditiva y no borra (RNF-401).
    expect(storage.getItem('fxtrad.chart.v1.EURUSD.1h')).not.toBeNull();
  });
});

describe('migración aditiva v1→v2 en load() (TASK-402, RNF-401)', () => {
  /** Escribe un documento v1 como lo hacía el ciclo 04. */
  function writeLegacy(
    storage: MemoryStorage,
    timeframe: string,
    drawings: OverlayShape[],
    indicators: IndicatorConfig[] = [],
  ): void {
    storage.setItem(
      legacyChartConfigKey('EURUSD', timeframe as ChartSelection['timeframe']),
      JSON.stringify({ version: 1, indicators, drawings }),
    );
  }

  it('migra desde v1, persiste el v2 y devuelve el documento', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, '1h', MIXED_DRAWINGS, INDICATORS);
    writeLegacy(storage, '15m', [MIXED_DRAWINGS[0]]);
    const store = createChartConfigStore(storage);

    const loaded = store.load('EURUSD', '1h');

    expect(loaded?.version).toBe(CHART_CONFIG_VERSION);
    expect(loaded?.symbol).toBe('EURUSD');
    expect(loaded?.drawings).toHaveLength(5);
    expect(loaded?.indicators).toEqual(INDICATORS);
    expect(loaded?.selection).toEqual({ timeframe: '1h' });
    // El v2 queda persistido: la siguiente carga no vuelve a migrar.
    expect(storage.getItem(chartConfigKey('EURUSD'))).not.toBeNull();
  });

  it('toma los indicadores del timeframe preferido', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, '1h', [], INDICATORS);
    writeLegacy(storage, '15m', [], [{ id: 'rsi-9', kind: 'RSI', period: 9, visible: true }]);
    const store = createChartConfigStore(storage);

    expect(store.load('EURUSD', '15m')?.indicators).toEqual([
      { id: 'rsi-9', kind: 'RSI', period: 9, visible: true },
    ]);
  });

  it('es idempotente: no re-migra si el v2 ya existe', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, '1h', DRAWINGS, INDICATORS);
    const store = createChartConfigStore(storage);
    store.load('EURUSD', '1h');

    store.save('EURUSD', { indicators: [], drawings: [], selection: { timeframe: '4h' } });
    const reloaded = store.load('EURUSD', '1h');

    expect(reloaded?.drawings).toEqual([]);
    expect(reloaded?.selection).toEqual({ timeframe: '4h' });
  });

  it('no borra ninguna clave v1 al migrar (RNF-401)', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, '1h', DRAWINGS, INDICATORS);
    writeLegacy(storage, '4h', DRAWINGS);
    const store = createChartConfigStore(storage);

    store.load('EURUSD', '1h');

    expect(storage.getItem('fxtrad.chart.v1.EURUSD.1h')).not.toBeNull();
    expect(storage.getItem('fxtrad.chart.v1.EURUSD.4h')).not.toBeNull();
  });

  it('devuelve null sin v2 ni v1', () => {
    const store = createChartConfigStore(new MemoryStorage());

    expect(store.load('EURUSD')).toBeNull();
  });
});

describe('puntero de la última selección (TASK-404, RI-402, ADR-030)', () => {
  const LAST: LastChartSelection = {
    symbol: 'GBPUSD',
    timeframe: '15m',
    start: '2026-01-02',
    end: '2026-03-04',
  };

  it('hace round-trip del puntero con su activo', () => {
    expect(deserializeLastSelection(serializeLastSelection(LAST))).toEqual(LAST);
  });

  it('devuelve null ante ausencia, corrupción o forma inválida', () => {
    expect(deserializeLastSelection(null)).toBeNull();
    expect(deserializeLastSelection('')).toBeNull();
    expect(deserializeLastSelection('{no-json')).toBeNull();
    expect(deserializeLastSelection(JSON.stringify({ timeframe: '1h' }))).toBeNull();
    expect(
      deserializeLastSelection(JSON.stringify({ symbol: 'EURUSD', timeframe: '30m' })),
    ).toBeNull();
  });

  it('guarda y carga el puntero en su propia clave', () => {
    const storage = new MemoryStorage();
    const store = createChartConfigStore(storage);

    store.saveLastSelection(LAST);

    expect(store.loadLastSelection()).toEqual(LAST);
    expect(storage.getItem(LAST_CHART_SELECTION_KEY)).not.toBeNull();
    // El puntero no crea ni pisa el documento de ningún activo.
    expect(store.load('GBPUSD')).toBeNull();
  });

  it('es un no-op sin almacenamiento o si la escritura falla (cuota)', () => {
    expect(createChartConfigStore(null).loadLastSelection()).toBeNull();
    expect(() => createChartConfigStore(null).saveLastSelection(LAST)).not.toThrow();

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
    expect(() => createChartConfigStore(rejecting).saveLastSelection(LAST)).not.toThrow();
  });
});

describe('aceptación de la migración v1→v2 y del contrato v2 (TASK-403)', () => {
  /** Timeframes usados por la aceptación (orden canónico del contrato). */
  const THREE_TF = ['4h', '1h', '15m'] as const;

  /** Escribe un documento v1 con la forma del ciclo 04. */
  function writeLegacy(
    storage: MemoryStorage,
    timeframe: ChartSelection['timeframe'],
    drawings: OverlayShape[],
    indicators: IndicatorConfig[] = [],
  ): void {
    storage.setItem(
      legacyChartConfigKey('EURUSD', timeframe),
      JSON.stringify({ version: 1, indicators, drawings }),
    );
  }

  it('migra un v1 mixto de los 5 kind en 3 TF sin pérdidas ni duplicados', () => {
    const storage = new MemoryStorage();
    // Los 5 `kind` repartidos en tres timeframes, con `line-1` y `op-1` repetidos.
    writeLegacy(storage, '4h', [MIXED_DRAWINGS[0], MIXED_DRAWINGS[1]]);
    writeLegacy(
      storage,
      '1h',
      [MIXED_DRAWINGS[0], MIXED_DRAWINGS[2], MIXED_DRAWINGS[3]],
      INDICATORS,
    );
    writeLegacy(storage, '15m', [MIXED_DRAWINGS[3], MIXED_DRAWINGS[4]]);
    const store = createChartConfigStore(storage);

    const loaded = store.load('EURUSD', '1h');

    // 0 pérdidas: están los 5 tipos; 0 duplicados: cada id aparece una sola vez.
    const ids = loaded?.drawings.map((drawing) => drawing.id) ?? [];
    const kinds = loaded?.drawings.map((drawing) => drawing.kind) ?? [];
    expect([...ids].sort()).toEqual(['buy-1', 'fib-1', 'line-1', 'op-1', 'rect-1']);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...kinds].sort()).toEqual(['fib', 'line', 'marker', 'operation', 'rect']);
    // Indicadores del TF preferido y selección inicial de la migración.
    expect(loaded?.indicators).toEqual(INDICATORS);
    expect(loaded?.selection).toEqual({ timeframe: '1h' });
  });

  it('es idempotente: la segunda pasada no cambia el v2 persistido', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, '1h', MIXED_DRAWINGS, INDICATORS);
    writeLegacy(storage, '15m', [MIXED_DRAWINGS[0]]);
    const store = createChartConfigStore(storage);

    store.load('EURUSD', '1h');
    const firstPass = storage.getItem(chartConfigKey('EURUSD'));
    store.load('EURUSD', '1h');
    const secondPass = storage.getItem(chartConfigKey('EURUSD'));

    expect(firstPass).not.toBeNull();
    expect(secondPass).toBe(firstPass);
  });

  it('conserva las claves v1 de los 3 TF tras migrar (RNF-401)', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, '4h', [MIXED_DRAWINGS[0]]);
    writeLegacy(storage, '1h', MIXED_DRAWINGS, INDICATORS);
    writeLegacy(storage, '15m', [MIXED_DRAWINGS[4]]);
    const before = THREE_TF.map((timeframe) =>
      storage.getItem(legacyChartConfigKey('EURUSD', timeframe)),
    );
    const store = createChartConfigStore(storage);

    store.load('EURUSD', '1h');

    THREE_TF.forEach((timeframe, index) => {
      expect(storage.getItem(legacyChartConfigKey('EURUSD', timeframe))).toBe(before[index]);
    });
  });

  it('no interpreta un documento v3 como v2 (versión desconocida)', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      chartConfigKey('EURUSD'),
      JSON.stringify({
        version: 3,
        symbol: 'EURUSD',
        drawings: MIXED_DRAWINGS,
        indicators: INDICATORS,
        selection: { timeframe: '1h' },
      }),
    );
    const raw = storage.getItem(chartConfigKey('EURUSD'));
    const store = createChartConfigStore(storage);

    // El contrato lo rechaza explícitamente...
    expect(deserializeChartConfig('EURUSD', raw)).toBeNull();
    // ...y `load` no lo lee como v2: sin documento v1, no hay nada que migrar.
    expect(store.load('EURUSD', '1h')).toBeNull();
  });
});
