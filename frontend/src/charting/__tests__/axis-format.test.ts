// @vitest-environment node
/**
 * Tests del formato del eje X en dos filas (TASK-UI-406, RF-407/RF-206/RF-207).
 *
 * Verifican los formateadores `dd-mmm-aa` / `hh:mm` en UTC, la selección de marcas
 * con umbral de separación (sin solape a zoom de 2 años) y la precisión del eje Y.
 * Patrón AAA.
 */
import { describe, expect, it } from 'vitest';
import { AXIS_TOKENS } from '../../styles/tokens';
import {
  AXIS_DATE_MIN_GAP_PX,
  AXIS_TIME_MIN_GAP_PX,
  PRICE_FORMAT,
  formatAxisDate,
  formatAxisTime,
  selectAxisRows,
} from '../axis-format';

/** Segundos epoch UTC de una fecha/hora. */
function utc(year: number, month: number, day: number, hour: number, minute: number): number {
  return Date.UTC(year, month - 1, day, hour, minute) / 1000;
}

describe('formatAxisDate (RF-407, fila superior)', () => {
  it('rinde la fecha `dd-mmm-aa` en UTC', () => {
    expect(formatAxisDate(utc(2025, 11, 18, 0, 15))).toBe('18-nov-25');
  });

  it('rellena el día a dos dígitos y abrevia el mes en español', () => {
    expect(formatAxisDate(utc(2026, 1, 2, 9, 5))).toBe('02-ene-26');
    expect(formatAxisDate(utc(2026, 12, 31, 23, 59))).toBe('31-dic-26');
  });
});

describe('formatAxisTime (RF-407, fila inferior)', () => {
  it('rinde `hh:mm` en UTC', () => {
    expect(formatAxisTime(utc(2026, 1, 1, 0, 15))).toBe('00:15');
  });

  it('rellena horas y minutos a dos dígitos', () => {
    expect(formatAxisTime(utc(2026, 1, 2, 9, 5))).toBe('09:05');
  });
});

describe('selectAxisRows (RF-407, umbral de separación)', () => {
  it('descarta las marcas fuera de la franja', () => {
    const inside = utc(2026, 1, 1, 0, 0);
    const hidden = utc(2026, 1, 1, 1, 0);
    const nextDay = utc(2026, 1, 2, 0, 0);
    const beyond = utc(2026, 1, 3, 0, 0);
    const coordinates = new Map([
      [inside, 10],
      [hidden, -5],
      [nextDay, 90],
      [beyond, 150],
    ]);

    const rows = selectAxisRows(
      [inside, hidden, nextDay, beyond],
      (time) => {
        return coordinates.get(time) ?? null;
      },
      { width: 100 },
    );

    // Fuera por la izquierda y por la derecha: ninguna etiqueta las representa.
    expect(rows.bottom.some((tick) => tick.label === '01:00')).toBe(false);
    expect(rows.top.map((tick) => tick.label)).toEqual(['01-ene-26', '02-ene-26']);
    for (const tick of [...rows.top, ...rows.bottom]) {
      expect(tick.x).toBeGreaterThanOrEqual(0);
      expect(tick.x).toBeLessThanOrEqual(100);
    }
  });

  it('abre la fila de fecha al cambiar el día y respeta el umbral', () => {
    const times = [
      utc(2026, 1, 1, 0, 0),
      utc(2026, 1, 1, 12, 0),
      utc(2026, 1, 2, 0, 0),
      utc(2026, 1, 2, 12, 0),
    ];
    const coordinates = new Map(times.map((time, index) => [time, index * 40]));

    const rows = selectAxisRows(times, (time) => coordinates.get(time) ?? null, {
      width: 200,
      minDateGapPx: 80,
      minTimeGapPx: 30,
    });

    // El 1 y el 2 de enero emiten fecha (80 px de umbral); las horas caben todas.
    expect(rows.top.map((tick) => tick.label)).toEqual(['01-ene-26', '02-ene-26']);
    expect(rows.bottom.map((tick) => tick.label)).toEqual(['00:00', '12:00', '00:00', '12:00']);
  });

  it('no solapa la fila de fecha a zoom de 2 años', () => {
    // ~2 años de velas horarias proyectadas a 0,1 px por hora: 800 px de franja.
    const hourSeconds = 3_600;
    const times = Array.from({ length: 2 * 365 * 24 }, (_, index) => index * hourSeconds);

    const rows = selectAxisRows(times, (time) => (time / hourSeconds) * 0.1, { width: 800 });

    expect(rows.top.length).toBeGreaterThan(0);
    expect(rows.top.length).toBeLessThanOrEqual(Math.ceil(800 / AXIS_DATE_MIN_GAP_PX) + 1);
    const positions = rows.top.map((tick) => tick.x);
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index] - positions[index - 1]).toBeGreaterThanOrEqual(AXIS_DATE_MIN_GAP_PX);
    }
    expect(AXIS_DATE_MIN_GAP_PX).toBeGreaterThan(AXIS_TIME_MIN_GAP_PX);
  });
});

describe('formato en dos filas desde los tokens (TASK-UI-401, RF-407)', () => {
  it('los patrones del eje son los del design system y `xFormat` ya no existe', () => {
    expect(AXIS_TOKENS.xFormatTop).toBe('{día}');
    expect(AXIS_TOKENS.xFormatBottom).toBe('{HH:mm}');
    expect(AXIS_TOKENS.axisRowGap).toBe(12);
    expect('xFormat' in AXIS_TOKENS).toBe(false);
  });

  it('rinden la fecha y la hora de ejemplo del contrato UX', () => {
    const moment = utc(2025, 11, 18, 0, 15);

    expect(formatAxisDate(moment)).toBe('18-nov-25');
    expect(formatAxisTime(moment)).toBe('00:15');
  });
});

describe('PRICE_FORMAT (RF-207)', () => {
  it('usa 5 decimales y paso mínimo de 0.00001', () => {
    expect(PRICE_FORMAT.precision).toBe(AXIS_TOKENS.priceDecimals);
    expect(PRICE_FORMAT.precision).toBe(5);
    expect(PRICE_FORMAT.minMove).toBeCloseTo(0.00001, 10);
  });
});
