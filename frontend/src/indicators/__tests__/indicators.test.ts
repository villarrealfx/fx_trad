/**
 * Tests del cálculo de indicadores del frontend (TASK-032, RF-013).
 *
 * Valida el port TypeScript contra el fixture golden compartido con el backend
 * (`pipeline/indicators.py`, TASK-031) y contra las propiedades de cada
 * indicador: warm-up con null, periodos límite, casos degenerados (RSI 0/100,
 * ATR plano) y validación RI-001. Patrón AAA, nombres en inglés.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Candle } from '../../contracts/ohlc';
import {
  ATR_PERIOD_DEFAULT,
  DEFAULT_INDICATOR_PARAMETERS,
  MA_PERIODS_DEFAULT,
  RSI_PERIOD_DEFAULT,
  computeIndicators,
  toLinePoints,
} from '../indicators';

interface IndicatorFixture {
  base_ts: number;
  periods: { ma: number[]; rsi: number; atr: number };
  candles: { time: number; open: number; high: number; low: number; close: number }[];
  expected: { ma20: (number | null)[]; rsi14: (number | null)[]; atr14: (number | null)[] };
}

/** Ancla temporal de las series sintéticas (2026-03-02 00:00:00 UTC, lunes). */
const BASE_TS = 1_772_409_600;

/** Ruta del fixture golden del backend, relativa a la raíz del repo (RA-001). */
function fixturePath(): string {
  return join(
    process.cwd(),
    '..',
    'backend',
    'tests',
    'pipeline',
    'fixtures',
    'indicators_reference.json',
  );
}

function loadFixture(): IndicatorFixture {
  const path = fixturePath();
  if (!existsSync(path)) {
    throw new Error(
      `Fixture golden no encontrado en ${path}. Ejecuta los tests desde frontend/ (RA-001 parity).`,
    );
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as IndicatorFixture;
}

/** Convierte el fixture JSON a velas Candle (tipos del contrato OHLC). */
function candlesFromFixture(fixture: IndicatorFixture): Candle[] {
  return fixture.candles.map((row) => ({
    time: Math.trunc(row.time),
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
  }));
}

/** Serie sintética con OHLC determinista (high/low amplios para ATR). */
function makeCandles(closes: readonly number[]): Candle[] {
  return closes.map((close, i) => ({
    time: BASE_TS + i,
    open: close - 0.5,
    high: close + 2.0,
    low: close - 2.0,
    close,
  }));
}

/** Compara dos series alineadas con tolerancia 1e-6 (pytest.approx rel=1e-6). */
function assertSeriesApprox(
  actual: readonly (number | null)[],
  expected: readonly (number | null)[],
): void {
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, i) => {
    if (expected[i] === null) {
      expect(value).toBeNull();
      return;
    }
    expect(value).not.toBeNull();
    expect(Math.abs((value as number) - (expected[i] as number))).toBeLessThan(1e-6);
  });
}

describe('ReferenceFixture', () => {
  const fixture = loadFixture();

  it('matches the golden MA20 series', () => {
    const result = computeIndicators(candlesFromFixture(fixture), { maPeriods: [20] });
    assertSeriesApprox(result.ma.get(20) ?? [], fixture.expected.ma20);
  });

  it('matches the golden RSI14 series', () => {
    const result = computeIndicators(candlesFromFixture(fixture));
    assertSeriesApprox(result.rsi.get(14) ?? [], fixture.expected.rsi14);
  });

  it('matches the golden ATR14 series', () => {
    const result = computeIndicators(candlesFromFixture(fixture));
    assertSeriesApprox(result.atr.get(14) ?? [], fixture.expected.atr14);
  });

  it('aligns the output times with the candle times', () => {
    const fixtureCandles = candlesFromFixture(fixture);
    const result = computeIndicators(fixtureCandles);
    expect([...result.times]).toEqual(fixtureCandles.map((candle) => candle.time));
  });
});

describe('Defaults', () => {
  const fixture = loadFixture();

  it('follow the journey convention J-004', () => {
    const result = computeIndicators(candlesFromFixture(fixture));
    expect([...MA_PERIODS_DEFAULT]).toEqual([20, 50, 200]);
    expect(RSI_PERIOD_DEFAULT).toBe(14);
    expect(ATR_PERIOD_DEFAULT).toBe(14);
    expect([...DEFAULT_INDICATOR_PARAMETERS.maPeriods]).toEqual([20, 50, 200]);
    expect(DEFAULT_INDICATOR_PARAMETERS.rsiPeriod).toBe(14);
    expect(DEFAULT_INDICATOR_PARAMETERS.atrPeriod).toBe(14);
    for (const period of MA_PERIODS_DEFAULT) expect(result.ma.has(period)).toBe(true);
    expect([...result.rsi.keys()]).toEqual([RSI_PERIOD_DEFAULT]);
    expect([...result.atr.keys()]).toEqual([ATR_PERIOD_DEFAULT]);
  });

  it('produce one full-length series per period', () => {
    const result = computeIndicators(candlesFromFixture(fixture));
    const length = fixture.candles.length;
    for (const series of [...result.ma.values(), ...result.rsi.values(), ...result.atr.values()]) {
      expect(series.length).toBe(length);
    }
  });
});

describe('MovingAverage', () => {
  it('warms up with null and fills the window mean once reached', () => {
    const result = computeIndicators(makeCandles([1, 2, 3, 4]), {
      maPeriods: [3],
      rsiPeriod: 1,
      atrPeriod: 1,
    });
    expect([...(result.ma.get(3) ?? [])]).toEqual([null, null, 2, 3]);
  });

  it('returns the closes for a one-period window', () => {
    const result = computeIndicators(makeCandles([1, 2, 3]), {
      maPeriods: [1],
      rsiPeriod: 1,
      atrPeriod: 1,
    });
    expect([...(result.ma.get(1) ?? [])]).toEqual([1, 2, 3]);
  });

  it('keeps a sliding mean on a two-period window', () => {
    const result = computeIndicators(makeCandles([1, 2, 3, 4, 5]), {
      maPeriods: [2],
      rsiPeriod: 1,
      atrPeriod: 1,
    });
    expect([...(result.ma.get(2) ?? [])]).toEqual([null, 1.5, 2.5, 3.5, 4.5]);
  });
});

describe('Rsi', () => {
  it('returns 100 for a strong uptrend', () => {
    const result = computeIndicators(makeCandles([1, 2, 3, 4]), { rsiPeriod: 2 });
    expect(result.rsi.get(2)?.[2]).toBeCloseTo(100);
  });

  it('returns 0 for a strong downtrend', () => {
    const result = computeIndicators(makeCandles([4, 3, 2, 1]), { rsiPeriod: 2 });
    expect(result.rsi.get(2)?.[2]).toBeCloseTo(0);
  });

  it('returns 0 for a flat series', () => {
    const result = computeIndicators(makeCandles([2, 2, 2, 2, 2]), { rsiPeriod: 2 });
    expect(result.rsi.get(2)?.[2]).toBeCloseTo(0);
  });

  it('warms up with null', () => {
    const result = computeIndicators(makeCandles([1, 2, 3, 4]), { rsiPeriod: 2 });
    expect([...(result.rsi.get(2)?.slice(0, 2) ?? [])]).toEqual([null, null]);
  });
});

describe('Atr', () => {
  it('yields zero for flat candles', () => {
    const candles = [2, 2, 2, 2, 2].map((price, i) => ({
      time: BASE_TS + i,
      open: price,
      high: price,
      low: price,
      close: price,
    }));
    const result = computeIndicators(candles, { atrPeriod: 2 });
    expect(result.atr.get(2)?.[2]).toBeCloseTo(0);
  });

  it('warms up with null', () => {
    const result = computeIndicators(makeCandles([2, 3, 4, 5]), { atrPeriod: 2 });
    expect([...(result.atr.get(2)?.slice(0, 2) ?? [])]).toEqual([null, null]);
  });
});

describe('Validation', () => {
  it('returns an empty result for empty input', () => {
    const result = computeIndicators([]);
    expect(result.times).toEqual([]);
    expect(result.ma.size).toBe(0);
    expect(result.rsi.size).toBe(0);
    expect(result.atr.size).toBe(0);
  });

  it('throws on an unordered series', () => {
    const candles = makeCandles([1, 2, 3]);
    expect(() => computeIndicators([candles[1], candles[0], candles[2]])).toThrow(/no ordenada/);
  });

  it('throws on a duplicated time', () => {
    const candles = makeCandles([1, 2, 3]);
    expect(() => computeIndicators([candles[0], candles[0], candles[2]])).toThrow(/duplicado/);
  });

  it('throws on an invalid MA period', () => {
    expect(() => computeIndicators(makeCandles([1, 2]), { maPeriods: [0] })).toThrow(
      /Periodo de MA/,
    );
  });

  it('throws on an invalid RSI period', () => {
    expect(() => computeIndicators(makeCandles([1, 2]), { rsiPeriod: 0 })).toThrow(
      /Periodo de RSI/,
    );
  });

  it('throws on an invalid ATR period', () => {
    expect(() => computeIndicators(makeCandles([1, 2]), { atrPeriod: -1 })).toThrow(
      /Periodo de ATR/,
    );
  });
});

describe('LinePoints', () => {
  it('filters warm-up nulls keeping time and value pairs', () => {
    expect(toLinePoints([1, 2, 3], [null, 2.5, null])).toEqual([{ time: 2, value: 2.5 }]);
  });

  it('returns no points when every value is null', () => {
    expect(toLinePoints([1, 2], [null, null])).toEqual([]);
  });
});
