/**
 * Cliente del endpoint `GET /assets` (TASK-UI-010/TASK-204, RF-007/RF-008/RF-216).
 *
 * Fuente única del catálogo (ADR-021). Con `scope=stored` (default) devuelve los
 * activos con datos almacenados (biblioteca, SCR-001); con `scope=all` devuelve
 * todo el catálogo canónico, incluidos activos sin datos (`status="sin_datos"`)
 * para el formulario de descarga (SCR-002).
 */

/** Categoría del activo (glosario: forex / metal / petróleo). */
export type AssetType = 'forex' | 'metal' | 'oil';

/** Estado de cobertura de un activo (CMP-006). */
export type AssetStatus = 'completo' | 'parcial' | 'sin_datos';

/** Fila del catálogo de activos (`GET /assets`). */
export interface AssetRow {
  symbol: string;
  type: AssetType;
  /** Inicio de la cobertura en segundos UTC; `null` sin datos. */
  coverage_start: number | null;
  /** Fin de la cobertura en segundos UTC; `null` sin datos. */
  coverage_end: number | null;
  status: AssetStatus;
}

/** Alcance del catálogo: solo activos con datos o todo el canónico. */
export type CatalogScope = 'stored' | 'all';

/** Error de la API al consultar el catálogo de activos. */
export class AssetsError extends Error {
  /** Estado HTTP de la respuesta. */
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'AssetsError';
    this.status = status;
  }
}

/** Base URL de la API (RX-002, ADR-009); en dev usa el proxy de Vite. */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

/** Consulta `GET /assets` con el alcance indicado y deserializa las filas. */
async function requestAssets(scope: CatalogScope): Promise<AssetRow[]> {
  const response = await fetch(`${API_BASE_URL}/assets?scope=${scope}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    let detail = `Error al cargar la biblioteca (HTTP ${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      // Respuesta sin body JSON: se conserva el mensaje genérico.
    }
    throw new AssetsError(response.status, detail);
  }
  return (await response.json()) as AssetRow[];
}

/**
 * Consulta el catálogo de activos con datos almacenados (biblioteca, SCR-001).
 *
 * @returns Filas de activos con cobertura y estado, en orden canónico.
 * @throws AssetsError si el backend responde con un error HTTP.
 */
export function fetchAssets(): Promise<AssetRow[]> {
  return requestAssets('stored');
}

/**
 * Consulta el catálogo canónico completo (formulario de descarga, SCR-002).
 *
 * @returns Todas las filas del catálogo; sin datos → `status="sin_datos"`.
 * @throws AssetsError si el backend responde con un error HTTP.
 */
export function fetchCatalog(): Promise<AssetRow[]> {
  return requestAssets('all');
}
