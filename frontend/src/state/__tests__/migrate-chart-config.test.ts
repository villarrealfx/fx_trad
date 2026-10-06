// @vitest-environment node
/**
 * Tests de la migración v1→v2 (TASK-402, RI-401, RNF-401, ADR-027).
 *
 * Verifican la unión de dibujos deduplicada por `id`, la elección de indicadores,
 * el orden determinista, la robustez ante documentos v1 corruptos y que la
 * migración **solo lee** (no borra ni escribe nada). Patrón AAA.
 */
import { describe, expect, it } from 'vitest';
import type { OverlayShape } from '../../charting/overlay-geometry';
import type { IndicatorConfig } from '../../indicators/config';
import { legacyChartConfigKey, migrateFromV1 } from '../migrate-chart-config';

const MA20: IndicatorConfig = { id: 'ma-20', kind: 'MA', period: 20, visible: true };
const RSI9: IndicatorConfig = { id: 'rsi-9', kind: 'RSI', period: 9, visible: true };

const FIB: OverlayShape = {
  id: 'fib-1',
  kind: 'fib',
  from: { time: 0, price: 1 },
  to: { time: 10, price: 2 },
};
const RECT: OverlayShape = {
  id: 'rect-1',
  kind: 'rect',
  from: { time: 0, price: 1 },
  to: { time: 10, price: 2 },
};
const LINE: OverlayShape = {
  id: 'line-1',
  kind: 'line',
  from: { time: 0, price: 1 },
  to: { time: 10, price: 2 },
};

/** `Storage` en memoria para tests deterministas. */
class MemoryStorage implements Storage {
  readonly map = new Map<string, string>();
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

/** Escribe un documento v1 en el almacenamiento. */
function writeLegacy(
  storage: MemoryStorage,
  symbol: string,
  timeframe: string,
  input: { indicators?: IndicatorConfig[]; drawings?: OverlayShape[]; version?: number },
): void {
  storage.setItem(
    `fxtrad.chart.v1.${symbol}.${timeframe}`,
    JSON.stringify({
      version: input.version ?? 1,
      indicators: input.indicators ?? [],
      drawings: input.drawings ?? [],
    }),
  );
}

describe('legacyChartConfigKey (TASK-402)', () => {
  it('reconstruye la clave v1 por activo y timeframe', () => {
    expect(legacyChartConfigKey('EURUSD', '1h')).toBe('fxtrad.chart.v1.EURUSD.1h');
  });
});

describe('migrateFromV1 (TASK-402, RI-401)', () => {
  it('devuelve null si no hay ningún documento v1', () => {
    expect(migrateFromV1(new MemoryStorage(), 'EURUSD')).toBeNull();
  });

  it('migra un único documento v1 con sus dibujos e indicadores', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, 'EURUSD', '1h', { indicators: [MA20], drawings: [FIB] });

    const migrated = migrateFromV1(storage, 'EURUSD', '1h');

    expect(migrated).toEqual({
      drawings: [FIB],
      indicators: [MA20],
      selection: { timeframe: '1h' },
    });
  });

  it('une los dibujos de varios timeframes en orden de TIMEFRAMES', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, 'EURUSD', '1h', { drawings: [FIB] });
    writeLegacy(storage, 'EURUSD', '15m', { drawings: [RECT] });
    writeLegacy(storage, 'EURUSD', '1d', { drawings: [LINE] });

    const migrated = migrateFromV1(storage, 'EURUSD');

    expect(migrated?.drawings.map((shape) => shape.id)).toEqual(['rect-1', 'fib-1', 'line-1']);
  });

  it('cuenta una sola vez la misma figura presente en dos timeframes', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, 'EURUSD', '1h', { drawings: [FIB, RECT] });
    writeLegacy(storage, 'EURUSD', '15m', { drawings: [FIB, LINE] });

    const migrated = migrateFromV1(storage, 'EURUSD');

    expect(migrated?.drawings.map((shape) => shape.id)).toEqual(['fib-1', 'line-1', 'rect-1']);
  });

  it('toma los indicadores del timeframe preferido', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, 'EURUSD', '1h', { indicators: [MA20] });
    writeLegacy(storage, 'EURUSD', '15m', { indicators: [RSI9] });

    const migrated = migrateFromV1(storage, 'EURUSD', '15m');

    expect(migrated?.indicators).toEqual([RSI9]);
    expect(migrated?.selection.timeframe).toBe('15m');
  });

  it('cae al primer timeframe con datos si el preferido no tiene documento v1', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, 'EURUSD', '1h', { indicators: [MA20] });

    const migrated = migrateFromV1(storage, 'EURUSD', '4h');

    expect(migrated?.indicators).toEqual([MA20]);
    expect(migrated?.selection.timeframe).toBe('1h');
  });

  it('ignora el documento v1 corrupto y migra el resto', () => {
    const storage = new MemoryStorage();
    storage.setItem('fxtrad.chart.v1.EURUSD.1h', '{no-json');
    writeLegacy(storage, 'EURUSD', '15m', { drawings: [RECT] });

    const migrated = migrateFromV1(storage, 'EURUSD');

    expect(migrated?.drawings).toEqual([RECT]);
  });

  it('ignora documentos de una versión distinta o sin las listas', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, 'EURUSD', '1h', { drawings: [FIB], version: 0 });
    storage.setItem(
      'fxtrad.chart.v1.EURUSD.15m',
      JSON.stringify({ version: 1, indicators: 'no-es-lista' }),
    );
    writeLegacy(storage, 'EURUSD', '4h', { drawings: [LINE] });

    const migrated = migrateFromV1(storage, 'EURUSD');

    expect(migrated?.drawings).toEqual([LINE]);
  });

  it('filtra dibujos e indicadores malformados y conserva los válidos', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'fxtrad.chart.v1.EURUSD.1h',
      JSON.stringify({
        version: 1,
        indicators: [MA20, { id: 'bad' }],
        drawings: [FIB, { id: 'x', kind: 'line' }],
      }),
    );

    const migrated = migrateFromV1(storage, 'EURUSD');

    expect(migrated?.indicators).toEqual([MA20]);
    expect(migrated?.drawings).toEqual([FIB]);
  });

  it('solo lee: no escribe ni borra ninguna clave (RNF-401)', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, 'EURUSD', '1h', { drawings: [FIB] });
    writeLegacy(storage, 'EURUSD', '15m', { drawings: [RECT] });
    const before = [...storage.map.entries()];

    migrateFromV1(storage, 'EURUSD', '1h');

    expect([...storage.map.entries()]).toEqual(before);
    expect(storage.getItem('fxtrad.chart.v1.EURUSD.1h')).not.toBeNull();
    expect(storage.getItem('fxtrad.chart.v1.EURUSD.15m')).not.toBeNull();
  });

  it('no mezcla documentos de otros activos', () => {
    const storage = new MemoryStorage();
    writeLegacy(storage, 'GBPUSD', '1h', { drawings: [LINE] });

    expect(migrateFromV1(storage, 'EURUSD')).toBeNull();
  });
});
