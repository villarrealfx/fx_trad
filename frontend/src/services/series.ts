import type { OhlcResponse, Timeframe } from '../contracts/ohlc';

/** Parámetros de consulta de una serie OHLC (RX-002, endpoint TASK-021). */
export interface SeriesParams {
  /** Símbolo del activo, p. ej. EURUSD. */
  symbol: string;
  /** Granularidad canónica (RF-009). */
  timeframe: Timeframe;
  /** Inicio del rango en segundos UTC (inclusivo, opcional). */
  start?: number;
  /** Fin del rango en segundos UTC (inclusivo, opcional). */
  end?: number;
}

/**
 * Error de la API al consultar una serie OHLC.
 *
 * Conserva el estado HTTP y el detalle del backend para distinguir 404
 * (activo sin serie) de 400 (rango o timeframe inválido).
 */
export class SeriesError extends Error {
  /** Estado HTTP de la respuesta. */
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'SeriesError';
    this.status = status;
  }
}

/**
 * Base URL de la API del backend (RX-002, ADR-009).
 *
 * En desarrollo se usa la ruta relativa servida por el proxy de Vite; se
 * sobreescribe con `VITE_API_BASE_URL` en otros entornos.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

/**
 * Consulta la serie OHLC de un activo por rango y timeframe (TASK-021).
 *
 * Devuelve el contrato `OhlcResponse` sin transformar (RNF-008): las velas se
 * entregan tal cual al consumidor gráfico.
 *
 * @param params Símbolo, timeframe y rango opcional en segundos UTC.
 * @returns Serie OHLC en el contrato del frontend.
 * @throws SeriesError si el backend responde con un error HTTP.
 */
export async function fetchSeries(params: SeriesParams): Promise<OhlcResponse> {
  const query = new URLSearchParams({
    symbol: params.symbol,
    timeframe: params.timeframe,
  });
  if (params.start !== undefined) {
    query.set('start', String(params.start));
  }
  if (params.end !== undefined) {
    query.set('end', String(params.end));
  }
  const url = `${API_BASE_URL}/series?${query.toString()}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    let detail = `Error al obtener la serie (HTTP ${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      // Respuesta sin body JSON: se conserva el mensaje genérico.
    }
    throw new SeriesError(response.status, detail);
  }
  return (await response.json()) as OhlcResponse;
}
