// @vitest-environment node
/**
 * Tests del formato de los ejes (TASK-UI-407, RF-206/RF-207/RF-407).
 *
 * El eje X usa el **formato original de una fila** `{día} {HH:mm}` sobre el eje
 * nativo (D-19); `formatAxisDate`/`formatAxisTime` se conservan para la cabecera
 * del menú contextual de vela (RF-408). El eje Y usa 5 decimales. Patrón AAA.
 */
import { describe, expect, it } from 'vitest';
import { AXIS_TOKENS } from '../../styles/tokens';
import { PRICE_FORMAT, formatAxisDate, formatAxisLabel, formatAxisTime } from '../axis-format';

/** Segundos epoch UTC de una fecha/hora. */
function utc(year: number, month: number, day: number, hour: number, minute: number): number {
  return Date.UTC(year, month - 1, day, hour, minute) / 1000;
}

describe('formatAxisLabel (RF-206, RF-407)', () => {
  it('muestra día del mes y hora:minuto de apertura', () => {
    expect(formatAxisLabel(utc(2026, 1, 1, 0, 15))).toBe('1 00:15');
  });

  it('rellena horas y minutos a dos dígitos', () => {
    expect(formatAxisLabel(utc(2026, 1, 2, 9, 5))).toBe('2 09:05');
  });

  it('refleja el cambio de día', () => {
    expect(formatAxisLabel(utc(2026, 1, 1, 23, 45))).toBe('1 23:45');
    expect(formatAxisLabel(utc(2026, 1, 2, 0, 0))).toBe('2 00:00');
  });
});

describe('formato de la cabecera del menú contextual (TASK-UI-409, RF-408)', () => {
  it('rinde la fecha `dd-mmm-aa` y la hora `hh:mm` en UTC', () => {
    const moment = utc(2025, 11, 18, 0, 15);

    expect(formatAxisDate(moment)).toBe('18-nov-25');
    expect(formatAxisTime(moment)).toBe('00:15');
  });
});

describe('AXIS_TOKENS.xFormat (RF-407, D-19)', () => {
  it('conserva el formato original de una fila y no reintroduce el de dos filas', () => {
    expect(AXIS_TOKENS.xFormat).toBe('{día} {HH:mm}');
    expect('xFormatTop' in AXIS_TOKENS).toBe(false);
    expect('xFormatBottom' in AXIS_TOKENS).toBe(false);
    expect('axisRowGap' in AXIS_TOKENS).toBe(false);
  });
});

describe('PRICE_FORMAT (RF-207)', () => {
  it('usa 5 decimales y paso mínimo de 0.00001', () => {
    expect(PRICE_FORMAT.precision).toBe(AXIS_TOKENS.priceDecimals);
    expect(PRICE_FORMAT.precision).toBe(5);
    expect(PRICE_FORMAT.minMove).toBeCloseTo(0.00001, 10);
  });
});
