/**
 * Rutas de la aplicación (TASK-UI-003, SCR-001…SCR-006).
 *
 * Router propio basado en `location.hash` (sin dependencia externa): la app es
 * un single-window de escritorio (RNF-005), por lo que basta un mapa de rutas.
 */
import { TIMEFRAMES, type Timeframe } from '../contracts/ohlc';
import type { LastChartSelection } from '../state/chart-config';

/** Identificador de pantalla del wireframe. */
export type ScreenId = 'SCR-001' | 'SCR-002' | 'SCR-003' | 'SCR-004' | 'SCR-006';

/** Ruta de la aplicación. */
export interface AppRoute {
  /** Path hash, p. ej. `/chart`. */
  path: string;
  /** Pantalla del wireframe. */
  screen: ScreenId;
  /** Etiqueta visible en la navegación. */
  label: string;
}

/** Rutas de navegación (orden del flujo J-001…J-006). */
export const ROUTES: ReadonlyArray<AppRoute> = [
  { path: '/assets', screen: 'SCR-001', label: 'Biblioteca' },
  { path: '/downloads', screen: 'SCR-002', label: 'Descarga' },
  { path: '/open', screen: 'SCR-003', label: 'Abrir' },
  { path: '/chart', screen: 'SCR-004', label: 'Gráfico' },
  { path: '/export', screen: 'SCR-006', label: 'Exportar' },
];

/** Ruta por defecto (pantalla principal del MVP). */
export const DEFAULT_ROUTE = '/chart';

/** Timeframe por defecto del gráfico de ejemplo. */
export const DEFAULT_TIMEFRAME: Timeframe = '1h';

/** Devuelve la ruta para un path, o la de defecto si no coincide. */
export function routeFor(path: string): AppRoute {
  return (
    ROUTES.find((route) => route.path === path) ??
    (ROUTES.find((r) => r.path === DEFAULT_ROUTE) as AppRoute)
  );
}

/** Ubicación parseada del hash: path + query (TASK-026). */
export interface RouteLocation {
  path: string;
  params: URLSearchParams;
}

/** Separa el path y la query de una ubicación hash (p. ej. `/chart?symbol=X`). */
export function parseLocation(location: string): RouteLocation {
  const [rawPath = '', query = ''] = location.split('?');
  const path = rawPath.startsWith('/') ? rawPath : DEFAULT_ROUTE;
  return { path, params: new URLSearchParams(query) };
}

/** Selección del gráfico transportada por la URL (RF-007/008, SCR-003). */
export interface ChartQuery {
  symbol: string;
  timeframe: Timeframe;
  /** Fecha de inicio ISO `YYYY-MM-DD` (opcional). */
  start?: string;
  /** Fecha de fin ISO `YYYY-MM-DD` (opcional). */
  end?: string;
}

/** Activo por defecto del scaffold. */
export const DEFAULT_SYMBOL = 'EURUSD';

/** ¿La URL trae una selección de gráfico explícita? (ADR-028/ADR-030). */
export function hasExplicitChartQuery(params: URLSearchParams): boolean {
  return params.has('symbol') || params.has('timeframe');
}

/** Devuelve el timeframe si pertenece al contrato; `null` si no es canónico. */
function canonicalTimeframe(value: string | null | undefined): Timeframe | null {
  return TIMEFRAMES.includes(value as Timeframe) ? (value as Timeframe) : null;
}

/**
 * Lee la selección del gráfico de los parámetros de la URL.
 *
 * Precedencia **estricta** (ADR-028/ADR-030): un parámetro explícito nunca se
 * sobrescribe; si falta, se rellena con el puntero persistido (`fallback`) y, en
 * último término, con los valores por defecto. El timeframe se valida contra el
 * contrato en las dos fuentes.
 */
export function parseChartQuery(
  params: URLSearchParams,
  fallback?: LastChartSelection | null,
): ChartQuery {
  const symbol = params.get('symbol') ?? fallback?.symbol ?? DEFAULT_SYMBOL;
  const timeframe =
    canonicalTimeframe(params.get('timeframe')) ??
    canonicalTimeframe(fallback?.timeframe) ??
    DEFAULT_TIMEFRAME;
  const start = params.get('start') ?? fallback?.start ?? undefined;
  const end = params.get('end') ?? fallback?.end ?? undefined;
  return { symbol, timeframe, start, end };
}

/** Construye la URL hash del gráfico con la selección (SCR-003 → SCR-004). */
export function buildChartUrl(selection: ChartQuery): string {
  const query = new URLSearchParams({
    symbol: selection.symbol,
    timeframe: selection.timeframe,
  });
  if (selection.start !== undefined) query.set('start', selection.start);
  if (selection.end !== undefined) query.set('end', selection.end);
  return `/chart?${query.toString()}`;
}
