/**
 * Cliente del endpoint `GET /assets` (TASK-UI-010, RF-007/RF-008).
 *
 * Devuelve el catálogo de activos con datos almacenados en el contrato CMP-006:
 * símbolo, tipo, cobertura (segundos UTC) y estado (`completo`/`parcial`). La
 * biblioteca de SCR-001 lista solo activos guardados; el backend ya filtra por
 * cobertura, así que el frontend no transforma los datos (RNF-008).
 */

import type { AssetType } from '../catalog';

/** Estado de cobertura de un activo en la biblioteca (CMP-006). */
export type AssetStatus = 'completo' | 'parcial';

/** Fila del catálogo de activos con datos almacenados (`GET /assets`). */
export interface AssetRow {
  symbol: string;
  type: AssetType;
  coverage_start: number;
  coverage_end: number;
  status: AssetStatus;
}

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

/**
 * Consulta el catálogo de activos con datos almacenados.
 *
 * @returns Filas de activos con cobertura y estado, en orden canónico.
 * @throws AssetsError si el backend responde con un error HTTP.
 */
export async function fetchAssets(): Promise<AssetRow[]> {
  const response = await fetch(`${API_BASE_URL}/assets`, {
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
