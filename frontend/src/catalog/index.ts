/**
 * Catálogo de activos del frontend (TASK-UI-020, SCR-002).
 *
 * Espejo del catálogo canónico del backend (`fxtrad.ingest.catalog`) mientras
 * no exista `GET /assets`. TODO(TASK-020/TASK-UI-010): sustituir por la
 * consulta al endpoint y eliminar esta constante.
 */

/** Categoría del activo. */
export type AssetType = 'forex' | 'metal' | 'oil';

/** Activo del catálogo. */
export interface Asset {
  symbol: string;
  type: AssetType;
  name: string;
}

/** Opción de tipo para el `Select` (glosario: forex / metal / petróleo). */
export interface AssetTypeOption {
  value: AssetType;
  label: string;
}

/** Catálogo canónico de activos (forex + metales + petróleo). */
export const ASSET_CATALOG: ReadonlyArray<Asset> = [
  { symbol: 'EURUSD', type: 'forex', name: 'Euro / Dólar estadounidense' },
  { symbol: 'GBPUSD', type: 'forex', name: 'Libra esterlina / Dólar estadounidense' },
  { symbol: 'USDJPY', type: 'forex', name: 'Dólar estadounidense / Yen japonés' },
  { symbol: 'XAUUSD', type: 'metal', name: 'Oro spot' },
  { symbol: 'XAGUSD', type: 'metal', name: 'Plata spot' },
  { symbol: 'WTI', type: 'oil', name: 'Petróleo crudo WTI' },
  { symbol: 'BRENT', type: 'oil', name: 'Petróleo crudo Brent' },
];

/** Etiquetas de tipo de activo para el formulario. */
export const ASSET_TYPE_OPTIONS: ReadonlyArray<AssetTypeOption> = [
  { value: 'forex', label: 'Forex' },
  { value: 'metal', label: 'Metal' },
  { value: 'oil', label: 'Petróleo' },
];

/** Devuelve los activos de una categoría. */
export function assetsByType(type: AssetType): ReadonlyArray<Asset> {
  return ASSET_CATALOG.filter((asset) => asset.type === type);
}
