// @vitest-environment node
/**
 * Tests de alineación del contrato OHLC: tipos TS ↔ schema canónico.
 *
 * Lee `contracts/ohlc.schema.json` como fuente de verdad y compara contra los
 * tipos exportados por `frontend/src/contracts/ohlc.ts`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CANDLE_FIELD_NAMES,
  OHLC_RESPONSE_FIELD_NAMES,
  TIMEFRAMES,
  type Candle,
  type OhlcResponse,
} from '../ohlc';
import type { CandlestickData } from 'lightweight-charts';

const TEST_DIR = fileURLToPath(new URL('.', import.meta.url));
const CANONICAL_PATH = resolve(TEST_DIR, '../../../../contracts/ohlc.schema.json');

const canonical = JSON.parse(readFileSync(CANONICAL_PATH, 'utf-8')) as {
  definitions: {
    candle: { properties: Record<string, { type: string }> };
    timeframe: { enum: readonly string[] };
    ohlcResponse: { properties: Record<string, { type: string }> };
  };
};

function sortedKeys<T>(record: Record<string, T>): string[] {
  return Object.keys(record).sort();
}

describe('alineación del contrato TS', () => {
  it('CANDLE_FIELD_NAMES coincide con las propiedades canónicas de Candle', () => {
    expect([...CANDLE_FIELD_NAMES].sort()).toEqual(
      sortedKeys(canonical.definitions.candle.properties),
    );
  });

  it('TIMEFRAMES coincide con el enum canónico de Timeframe', () => {
    expect([...TIMEFRAMES].sort()).toEqual([...canonical.definitions.timeframe.enum].sort());
  });

  it('OHLC_RESPONSE_FIELD_NAMES coincide con las propiedades canónicas de OhlcResponse', () => {
    expect([...OHLC_RESPONSE_FIELD_NAMES].sort()).toEqual(
      sortedKeys(canonical.definitions.ohlcResponse.properties),
    );
  });

  it('un Candle documentado conforma el tipo y sobrevive un round-trip JSON', () => {
    const candle: Candle = {
      time: 1700000000,
      open: 1.08,
      high: 1.09,
      low: 1.07,
      close: 1.085,
    };
    expect(JSON.parse(JSON.stringify(candle))).toEqual({
      time: 1700000000,
      open: 1.08,
      high: 1.09,
      low: 1.07,
      close: 1.085,
    });
  });

  it('una OhlcResponse documentada conforma el tipo', () => {
    const response: OhlcResponse = {
      symbol: 'EURUSD',
      timeframe: '1m',
      candles: [{ time: 1700000000, open: 1.08, high: 1.09, low: 1.07, close: 1.085 }],
    };
    expect(response.candles).toHaveLength(1);
  });
});

describe('puente DTO → lightweight-charts (TASK-022, RNF-008)', () => {
  // Claves del modelo de velas de la librería: el contrato no impone campos extra.
  type ChartCandleKeys = keyof CandlestickData<'Candlestick'>;
  type CandleKeys = keyof Candle;

  it('los campos de Candle cubren los de CandlestickData (compile-time)', () => {
    // Si un campo de `Candle` no existiera en `CandlestickData`, asignar `true`
    // a `never` rompe `tsc --noEmit` (TASK-022, RNF-008).
    const candleKeysCoverChartKeys: CandleKeys extends ChartCandleKeys ? true : never = true;

    expect(candleKeysCoverChartKeys).toBe(true);
  });

  it('el cast de tipo basta para alimentar CandlestickData sin transformar datos', () => {
    const response: OhlcResponse = {
      symbol: 'EURUSD',
      timeframe: '1m',
      candles: [{ time: 1700000000, open: 1.08, high: 1.09, low: 1.07, close: 1.085 }],
    };

    // Único puente del contrato: una afirmación de tipo, no un re-mapping
    // (RNF-008; ChartPane consume así `response.candles`).
    const chartData = response.candles as CandlestickData[];

    expect(chartData).toEqual(response.candles);
    expect(Object.keys(chartData[0])).toEqual([...CANDLE_FIELD_NAMES] as string[]);
  });

  it('exige el cast: `time: number` no es `UTCTimestamp` en asignación directa', () => {
    const response: OhlcResponse = {
      symbol: 'EURUSD',
      timeframe: '1m',
      candles: [{ time: 1700000000, open: 1.08, high: 1.09, low: 1.07, close: 1.085 }],
    };

    // Compile-time (Valida `tsc --noEmit`): el contrato viaja con `time: number`
    // y `UTCTimestamp` es nominal (typings.d.ts:3726); la frontera debe ser un
    // cast explícito. Si `UTCTimestamp` dejara de ser nominal, esta directiva
    // quedaría sin error y tsc fallaría por "unused @ts-expect-error".
    // @ts-expect-error — asignación directa sin afirmación de tipo
    const chartData: CandlestickData[] = response.candles;
    expect(chartData).toBeDefined();
  });
});
