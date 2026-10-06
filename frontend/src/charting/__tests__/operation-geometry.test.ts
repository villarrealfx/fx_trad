import { describe, expect, it } from 'vitest';
import {
  OPERATION_TP_MULTIPLIERS,
  layoutOperationLabels,
  operationAnnouncement,
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

  it('keeps the same five labels on a sell operation', () => {
    const labels = Object.fromEntries(
      operationLevels(1.095, 1.1).map((level) => [level.key, level.label]),
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

describe('operationAnnouncement (ACC-201)', () => {
  it('announces a buy with its five levels at five decimals', () => {
    expect(operationAnnouncement(1.1, 1.095)).toBe(
      'Operación compra. Entrada 1.10000, SL 1.09500, ' +
        'TP 1.382 1.10691, TP 1.5 1.10750, TP 2 1.11000',
    );
  });

  it('announces a sell with the targets below the entry', () => {
    expect(operationAnnouncement(1.095, 1.1)).toBe(
      'Operación venta. Entrada 1.09500, SL 1.10000, ' +
        'TP 1.382 1.08809, TP 1.5 1.08750, TP 2 1.08500',
    );
  });

  it('warns instead of listing levels on zero risk', () => {
    expect(operationAnnouncement(1.1, 1.1)).toBe('Atención: entrada y SL coinciden; R = 0.');
  });
});

describe('layoutOperationLabels (ADR-025, RNF-301)', () => {
  const KEYS = ['tp2', 'tp15', 'tp1382', 'entry', 'sl'] as const;
  /** Construye los cinco niveles con las `y` dadas, ordenados de arriba abajo. */
  function levelsAt(...ys: number[]) {
    return ys.map((y, index) => ({ key: KEYS[index], y }));
  }

  it('separates labels closer than the minimum gap and flags the displaced ones', () => {
    const layout = layoutOperationLabels(levelsAt(0, 14, 28, 42, 56), 20, {
      top: 0,
      bottom: 200,
    });

    expect(layout.map((item) => item.y)).toEqual([0, 20, 40, 60, 80]);
    expect(layout.map((item) => item.leader)).toEqual([false, true, true, true, true]);
  });

  it('keeps every pair at least the minimum gap apart', () => {
    const layout = layoutOperationLabels(levelsAt(0, 14, 28, 42, 56), 20, {
      top: 0,
      bottom: 200,
    });
    for (let i = 1; i < layout.length; i += 1) {
      expect(layout[i].y - layout[i - 1].y).toBeGreaterThanOrEqual(20);
    }
  });

  it('corrects the whole spread when the last label overflows the bottom', () => {
    const layout = layoutOperationLabels(levelsAt(0, 14, 28, 42, 120), 20, {
      top: 0,
      bottom: 100,
    });

    expect(layout[layout.length - 1].y).toBe(100);
    expect(layout.every((item) => item.y >= 0 && item.y <= 100)).toBe(true);
    for (let i = 1; i < layout.length; i += 1) {
      expect(layout[i].y - layout[i - 1].y).toBeGreaterThanOrEqual(20);
    }
  });

  it('leaves already separated labels untouched with no leader', () => {
    const layout = layoutOperationLabels(levelsAt(0, 50, 100, 150, 200), 20, {
      top: 0,
      bottom: 300,
    });

    expect(layout.map((item) => item.y)).toEqual([0, 50, 100, 150, 200]);
    expect(layout.every((item) => item.leader === false)).toBe(true);
  });
});

describe('layout de etiquetas con escalas distintas (TASK-UI-321)', () => {
  // Dos escalas del mismo activo: un pane "amplio" y otro "estrecho".
  const wideScale = (price: number): number => (1.7 - price) * 1000;
  const narrowScale = (price: number): number => (1.7 - price) * 100;

  /** Proyecta la operación con un mapper (el de un pane) y reparte sus etiquetas. */
  function paneLayout(priceToY: (price: number) => number, height: number) {
    const levels = operationLevels(1.5, 1.49).map((level) => ({
      key: level.key,
      y: priceToY(level.price),
    }));
    return layoutOperationLabels(levels, 20, { top: 0, bottom: height });
  }

  it('no solapa las cinco etiquetas en ningún pane, con su propio mapper', () => {
    for (const [mapper, height] of [
      [wideScale, 400],
      [narrowScale, 400],
    ] as const) {
      const layout = paneLayout(mapper, height);
      expect(layout).toHaveLength(5);
      for (let i = 1; i < layout.length; i += 1) {
        expect(layout[i].y - layout[i - 1].y).toBeGreaterThanOrEqual(20);
      }
      expect(layout.every((item) => item.y >= 0 && item.y <= height)).toBe(true);
    }
  });

  it('proyecta con el mapper de cada pane (mismas anclas, distinta y)', () => {
    const wide = paneLayout(wideScale, 400).map((item) => item.y);
    const narrow = paneLayout(narrowScale, 400).map((item) => item.y);

    expect(wide).not.toEqual(narrow);
    for (let i = 1; i < wide.length; i += 1) {
      expect(wide[i] - wide[i - 1]).toBeGreaterThanOrEqual(20);
      expect(narrow[i] - narrow[i - 1]).toBeGreaterThanOrEqual(20);
    }
  });
});
