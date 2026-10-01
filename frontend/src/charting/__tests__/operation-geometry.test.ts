import { describe, expect, it } from 'vitest';
import {
  OPERATION_TP_MULTIPLIERS,
  operationDirection,
  operationLevels,
  operationRisk,
  type OperationLevel,
} from '../operation-geometry';

/** Indexa los niveles por clave para aserciones legibles. */
function byKey(levels: OperationLevel[]): Map<string, OperationLevel> {
  return new Map(levels.map((level) => [level.key, level]));
}

describe('operationRisk', () => {
  it('returns the distance between entry and stop loss', () => {
    expect(operationRisk(1.1, 1.095)).toBeCloseTo(0.005, 10);
  });

  it('returns zero when entry and stop loss coincide', () => {
    expect(operationRisk(1.1, 1.1)).toBe(0);
  });

  it('is symmetric regardless of the anchor order', () => {
    expect(operationRisk(1.095, 1.1)).toBeCloseTo(operationRisk(1.1, 1.095), 10);
  });
});

describe('operationDirection', () => {
  it('is a buy when the entry is above the stop loss', () => {
    expect(operationDirection(1.1, 1.095)).toBe('buy');
  });

  it('is a sell when the entry is below the stop loss', () => {
    expect(operationDirection(1.095, 1.1)).toBe('sell');
  });

  it('defaults to buy on zero risk so the announcement is never empty', () => {
    expect(operationDirection(1.1, 1.1)).toBe('buy');
  });
});

describe('operationLevels', () => {
  it('derives exactly the five visible levels', () => {
    expect(operationLevels(1.1, 1.095)).toHaveLength(5);
  });

  it('never includes the 1:1 reference level', () => {
    const levels = operationLevels(1.1, 1.095);
    expect(levels.some((level) => level.multiplier === 1)).toBe(false);
    const multipliers = levels.map((level) => level.multiplier);
    expect(multipliers).toEqual([2, 1.5, 1.382, null, null]);
  });

  it('derives the five RF-303 prices for entry 1.10000 and SL 1.09500', () => {
    const levels = byKey(operationLevels(1.1, 1.095));
    expect(levels.get('sl')?.price).toBeCloseTo(1.095, 5);
    expect(levels.get('entry')?.price).toBeCloseTo(1.1, 5);
    expect(levels.get('tp1382')?.price).toBeCloseTo(1.10691, 5);
    expect(levels.get('tp15')?.price).toBeCloseTo(1.1075, 5);
    expect(levels.get('tp2')?.price).toBeCloseTo(1.11, 5);
  });

  it('orders the levels by price from top to bottom', () => {
    const prices = operationLevels(1.1, 1.095).map((level) => level.price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it('labels each level in Spanish as specified by RF-308', () => {
    const labels = Object.fromEntries(
      operationLevels(1.1, 1.095).map((level) => [level.key, level.label]),
    );
    expect(labels).toEqual({
      sl: 'SL',
      entry: 'Entrada',
      tp1382: 'TP 1.382',
      tp15: 'TP 1.5',
      tp2: 'TP 2',
    });
  });

  it('assigns the role color sl, entry or tp without touching tokens', () => {
    const roles = Object.fromEntries(
      operationLevels(1.1, 1.095).map((level) => [level.key, level.colorRole]),
    );
    expect(roles).toEqual({
      sl: 'sl',
      entry: 'entry',
      tp1382: 'tp',
      tp15: 'tp',
      tp2: 'tp',
    });
  });

  it('places the targets below the entry for a sell operation', () => {
    const levels = byKey(operationLevels(1.095, 1.1));
    expect(levels.get('tp1382')?.price).toBeCloseTo(1.08809, 5);
    expect(levels.get('tp15')?.price).toBeCloseTo(1.0875, 5);
    expect(levels.get('tp2')?.price).toBeCloseTo(1.085, 5);
  });

  it('keeps every price finite and coincident on zero risk', () => {
    const levels = operationLevels(1.1, 1.1);
    expect(levels).toHaveLength(5);
    expect(levels.every((level) => Number.isFinite(level.price))).toBe(true);
    expect(levels.every((level) => level.price === 1.1)).toBe(true);
  });

  it('recalculates the targets when the stop loss moves', () => {
    const before = byKey(operationLevels(1.1, 1.095)).get('tp2')?.price;
    const after = byKey(operationLevels(1.1, 1.09)).get('tp2')?.price;
    expect(before).toBeCloseTo(1.11, 5);
    expect(after).toBeCloseTo(1.12, 5);
    expect(after).toBeGreaterThan(before as number);
  });
});

describe('OPERATION_TP_MULTIPLIERS', () => {
  it('fixes the target multipliers at 1.382, 1.5 and 2', () => {
    expect(OPERATION_TP_MULTIPLIERS).toEqual([1.382, 1.5, 2]);
  });
});
