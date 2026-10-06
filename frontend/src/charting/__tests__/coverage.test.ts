import { describe, expect, it } from 'vitest';
import type { Candle } from '../../contracts/ohlc';
import { TIMEFRAME_SECONDS, hasCoverageGap } from '../coverage';

/** Martes 2026-06-09, alineado a la hora UTC (bucket de 1h). */
const TUE_10 = 1_780_999_200;
const TUE_11 = 1_781_002_800;
const TUE_12 = 1_781_006_400;
const TUE_13 = 1_781_010_000;
const TUE_10_47 = 1_781_002_020;
/** Viernes 2026-06-12 21:00 UTC (cierre de mercado). */
const FRI_21 = 1_781_298_000;
/** Sábado 2026-06-13 10:00 UTC. */
const SAT_10 = 1_781_344_800;
/** Lunes 2026-06-15 00:00 UTC (reapertura). */
const MON_00 = 1_781_481_600;

/** Viernes 2026-06-12 00:00 UTC (el anterior a `MON_00`). */
const FRI_00 = 1_781_222_400;
/** Viernes 2026-06-12 20:00 UTC: última vela antes del cierre real. */
const FRI_20 = FRI_00 + 20 * 3600;
/** Domingo 2026-06-14 00:00 UTC. */
const SUN_00 = 1_781_395_200;
/** Domingo 2026-06-14 21:00 UTC: primera vela tras la reapertura. */
const SUN_21 = SUN_00 + 21 * 3600;
/** Domingo 2026-06-14 23:00 UTC: última vela del domingo. */
const SUN_23 = SUN_00 + 23 * 3600;

/** Vela sintética: al test solo le importa su `time`. */
function candle(time: number): Candle {
  return { time, open: 1, high: 1, low: 1, close: 1 };
}

describe('hasCoverageGap (RF-402, TASK-UI-413)', () => {
  it('no avisa cuando no se pidió ningún rango', () => {
    expect(hasCoverageGap([candle(TUE_10), candle(TUE_11)], {}, '1h')).toBe(false);
  });

  it('no avisa con la serie vacía', () => {
    expect(hasCoverageGap([], { start: TUE_10, end: TUE_12 }, '1h')).toBe(false);
  });

  it('no avisa con una serie contigua que cubre el rango', () => {
    const candles = [TUE_10, TUE_11, TUE_12, TUE_13].map(candle);

    expect(hasCoverageGap(candles, { start: TUE_10, end: TUE_13 }, '1h')).toBe(false);
  });

  it('no avisa por el desfase de bucket del borde inicial', () => {
    // start cae a mitad del bucket 10:00 y el backend sirve desde 11:00.
    expect(
      hasCoverageGap([candle(TUE_11), candle(TUE_12)], { start: TUE_10_47, end: TUE_12 }, '1h'),
    ).toBe(false);
  });

  it('no avisa por el desfase de bucket del borde final', () => {
    // end cae a mitad del bucket 11:00 y la última vela servida es 11:00.
    expect(
      hasCoverageGap([candle(TUE_10), candle(TUE_11)], { start: TUE_10, end: TUE_11 + 1800 }, '1h'),
    ).toBe(false);
  });

  it('avisa cuando falta el bucket del borde inicial', () => {
    // start alineado a 10:00 y la vela de las 10:00 no existe.
    expect(
      hasCoverageGap([candle(TUE_11), candle(TUE_12)], { start: TUE_10, end: TUE_12 }, '1h'),
    ).toBe(true);
  });

  it('avisa cuando falta el bucket del borde final', () => {
    expect(
      hasCoverageGap([candle(TUE_10), candle(TUE_11)], { start: TUE_10, end: TUE_12 }, '1h'),
    ).toBe(true);
  });

  it('avisa cuando el rango empieza mucho antes de la cobertura', () => {
    const threeMonths = 90 * 86_400;

    expect(
      hasCoverageGap([candle(TUE_10), candle(TUE_11)], { start: TUE_10 - threeMonths }, '1h'),
    ).toBe(true);
  });

  it('avisa por un hueco interno de un bucket entre semana', () => {
    const candles = [candle(TUE_10), candle(TUE_11), candle(TUE_13)];

    expect(hasCoverageGap(candles, { start: TUE_10, end: TUE_13 }, '1h')).toBe(true);
  });

  it('no avisa por el cierre de fin de semana interno', () => {
    const candles = [candle(FRI_21), candle(MON_00)];

    expect(hasCoverageGap(candles, { start: FRI_21, end: MON_00 }, '1h')).toBe(false);
  });

  it('no avisa cuando el rango empieza en fin de semana', () => {
    expect(hasCoverageGap([candle(MON_00)], { start: SAT_10 }, '1h')).toBe(false);
  });

  it('no avisa cuando el rango termina tras un fin de semana', () => {
    expect(hasCoverageGap([candle(FRI_21)], { start: FRI_21, end: MON_00 }, '1h')).toBe(false);
  });

  it('aplica el bucket del timeframe pedido', () => {
    expect(TIMEFRAME_SECONDS['15m']).toBe(900);
    const contiguous = [candle(TUE_10), candle(TUE_10 + 900)];
    const missing = [candle(TUE_10), candle(TUE_10 + 1800)];

    expect(hasCoverageGap(contiguous, { start: TUE_10, end: TUE_10 + 900 }, '15m')).toBe(false);
    expect(hasCoverageGap(missing, { start: TUE_10, end: TUE_10 + 1800 }, '15m')).toBe(true);
  });

  // Reapertura por defecto reproducido con datos reales (2026-10-06): el cierre
  // del viernes (20:00/21:00) y la apertura del domingo (21:00) no son «desfase
  // de bucket» y la condición anterior avisaba en el 100 % de esos rangos.

  it('no avisa en un rango de solo viernes (cierre temprano del mercado)', () => {
    const candles: Candle[] = [];
    for (let time = FRI_00; time <= FRI_20; time += 3_600) candles.push(candle(time));

    expect(hasCoverageGap(candles, { start: FRI_00, end: FRI_00 + 86_399 }, '1h')).toBe(false);
  });

  it('no avisa en un rango de solo domingo (apertura tardía del mercado)', () => {
    const candles = [candle(SUN_21), candle(SUN_23)];

    expect(hasCoverageGap(candles, { start: SUN_00, end: SUN_00 + 86_399 }, '1h')).toBe(false);
  });

  it('no avisa en una semana completa Lun→Vie con el cierre del viernes', () => {
    const candles: Candle[] = [];
    for (let time = MON_00; time <= FRI_20; time += 3_600) candles.push(candle(time));

    expect(hasCoverageGap(candles, { start: MON_00, end: FRI_00 + 86_399 }, '1h')).toBe(false);
  });

  it('sigue avisando por un hueco real en la mañana del viernes', () => {
    // Faltan las velas de las 10:00 (mañana del viernes, mercado abierto).
    const candles = [candle(FRI_00), candle(FRI_00 + 11 * 3600)];

    expect(hasCoverageGap(candles, { start: FRI_00, end: FRI_00 + 11 * 3600 }, '1h')).toBe(true);
  });
});
