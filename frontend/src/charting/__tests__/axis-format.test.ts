// @vitest-environment node
/**
 * Tests del formato de ejes (TASK-UI-230, RF-206/RF-207).
 *
 * Verifican la etiqueta `{día} {HH:mm}` en UTC y la precisión del eje Y (5
 * decimales) tomada de los tokens. Patrón AAA.
 */
import { describe, expect, it } from 'vitest';
import { AXIS_TOKENS } from '../../styles/tokens';
import { PRICE_FORMAT, formatAxisLabel } from '../axis-format';

/** Segundos epoch UTC de una fecha/hora. */
function utc(year: number, month: number, day: number, hour: number, minute: number): number {
  return Date.UTC(year, month - 1, day, hour, minute) / 1000;
}

describe('formatAxisLabel (RF-206)', () => {
  it('muestra día del mes y hora:minuto de apertura', () => {
    expect(formatAxisLabel(utc(2026, 1, 1, 0, 15))).toBe('1 00:15');
  });

  it('rellena horas y minutos a dos dígitos', () => {
    expect(formatAxisLabel(utc(2026, 1, 2, 9, 5))).toBe('2 09:05');
  });

  it('refleja el cambio de día', () => {
    expect(formatAxisLabel(utc(2026, 1, 1, 24 - 1, 45))).toBe('1 23:45');
    expect(formatAxisLabel(utc(2026, 1, 2, 0, 0))).toBe('2 00:00');
  });
});

describe('PRICE_FORMAT (RF-207)', () => {
  it('usa 5 decimales y paso mínimo de 0.00001', () => {
    expect(PRICE_FORMAT.precision).toBe(AXIS_TOKENS.priceDecimals);
    expect(PRICE_FORMAT.precision).toBe(5);
    expect(PRICE_FORMAT.minMove).toBeCloseTo(0.00001, 10);
  });
});
