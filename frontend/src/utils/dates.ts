/**
 * Utilidades de fecha en UTC (TASK-026/TASK-UI-020).
 *
 * Las fechas del usuario son días ISO `YYYY-MM-DD`; el backend consume
 * segundos UTC (RNF-004). Rango inclusivo: inicio a las 00:00:00Z y fin a las
 * 23:59:59Z.
 */

/** Fecha ISO `YYYY-MM-DD` de un `Date`. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Suma (o resta) días a una fecha ISO `YYYY-MM-DD`. */
export function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDay(date);
}

/** Inicio del día ISO en segundos UTC (00:00:00Z). */
export function startOfDayEpoch(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 1000);
}

/** Fin del día ISO en segundos UTC (23:59:59Z). */
export function endOfDayEpoch(iso: string): number {
  return Math.floor(Date.parse(`${iso}T23:59:59Z`) / 1000);
}
