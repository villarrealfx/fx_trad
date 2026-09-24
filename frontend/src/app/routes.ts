/**
 * Rutas de la aplicación (TASK-UI-003, SCR-001…SCR-006).
 *
 * Router propio basado en `location.hash` (sin dependencia externa): la app es
 * un single-window de escritorio (RNF-005), por lo que basta un mapa de rutas.
 */
import type { Timeframe } from '../contracts/ohlc';

/** Identificador de pantalla del wireframe. */
export type ScreenId = 'SCR-001' | 'SCR-002' | 'SCR-003' | 'SCR-004' | 'SCR-005' | 'SCR-006';

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
  { path: '/multichart', screen: 'SCR-005', label: 'Multigráfico' },
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
