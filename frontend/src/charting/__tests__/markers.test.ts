// @vitest-environment node
/**
 * Tests del anclaje de marcas compra/venta (TASK-UI-223, RF-208).
 *
 * Verifican el valor del pip por familia de par y que el ancla quede fuera del
 * rango de la vela según la dirección. Patrón AAA.
 */
import { describe, expect, it } from 'vitest';
import { MARKER_TOKENS } from '../../styles/tokens';
import { markerAnchorPrice, markerOffset, pipValueFor } from '../markers';

describe('pipValueFor', () => {
  it('usa 0.0001 en pares no-JPY', () => {
    expect(pipValueFor('EURUSD')).toBe(MARKER_TOKENS.pipValue);
    expect(pipValueFor('eurusd')).toBe(MARKER_TOKENS.pipValue);
  });

  it('usa 0.01 en pares cotizados en JPY', () => {
    expect(pipValueFor('USDJPY')).toBe(MARKER_TOKENS.pipValueJpy);
    expect(pipValueFor('GBPJPY')).toBe(MARKER_TOKENS.pipValueJpy);
  });
});

describe('markerOffset', () => {
  it('equivale a offsetPips pips del activo', () => {
    expect(markerOffset('EURUSD')).toBeCloseTo(10 * MARKER_TOKENS.pipValue, 10);
    expect(markerOffset('USDJPY')).toBeCloseTo(10 * MARKER_TOKENS.pipValueJpy, 10);
  });
});

describe('markerAnchorPrice', () => {
  it('coloca la compra por debajo del mínimo', () => {
    expect(markerAnchorPrice('EURUSD', 'buy', 1.07, 1.09)).toBeCloseTo(
      1.07 - markerOffset('EURUSD'),
      10,
    );
  });

  it('coloca la venta por encima del máximo', () => {
    expect(markerAnchorPrice('EURUSD', 'sell', 1.07, 1.09)).toBeCloseTo(
      1.09 + markerOffset('EURUSD'),
      10,
    );
  });

  it('respeta el pip del par JPY', () => {
    expect(markerAnchorPrice('USDJPY', 'buy', 150.0, 151.0)).toBeCloseTo(
      150.0 - markerOffset('USDJPY'),
      10,
    );
  });
});
