/**
 * Migración aditiva de los documentos v1 al documento v2 por activo
 * (TASK-402, RI-401, RNF-401, ADR-027).
 *
 * Los documentos v1 vivían uno por **activo + timeframe**
 * (`fxtrad.chart.v1.{symbol}.{TF}`) con `{version: 1, indicators, drawings}`; el
 * v2 es uno por **activo** con dibujos compartidos, indicadores y selección.
 *
 * El módulo es **puro**: recibe un `Storage` inyectable, no toca el DOM ni
 * `localStorage` global y **solo lee**. El documento resultante lo persiste el
 * store (`state/chart-config`), y las claves v1 **no se borran nunca** — el
 * borrado es imposible por construcción, no por disciplina.
 */
import { isOverlayShape } from '../charting/drawings';
import type { OverlayShape } from '../charting/overlay-geometry';
import { TIMEFRAMES, type Timeframe } from '../contracts/ohlc';
import { isIndicatorConfig, type IndicatorConfig } from '../indicators/config';
import type { ChartConfigInput } from './chart-config';

/** Versión del esquema de los documentos antiguos (ADR-018). */
export const LEGACY_CHART_CONFIG_VERSION = 1;

/** Clave del documento v1 por activo + timeframe (ADR-018). */
export function legacyChartConfigKey(symbol: string, timeframe: Timeframe): string {
  return `fxtrad.chart.v${LEGACY_CHART_CONFIG_VERSION}.${symbol}.${timeframe}`;
}

/** Documento v1 legible: solo lo que la migración necesita. */
interface LegacyChartConfig {
  indicators: IndicatorConfig[];
  drawings: OverlayShape[];
}

/** Lee y valida el documento v1 de un activo y timeframe; `null` si no sirve. */
function readLegacy(
  storage: Storage,
  symbol: string,
  timeframe: Timeframe,
): LegacyChartConfig | null {
  const raw = storage.getItem(legacyChartConfigKey(symbol, timeframe));
  if (raw === null || raw === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const document = parsed as {
    version?: unknown;
    indicators?: unknown;
    drawings?: unknown;
  };
  if (document.version !== LEGACY_CHART_CONFIG_VERSION) return null;
  if (!Array.isArray(document.indicators) || !Array.isArray(document.drawings)) return null;
  return {
    indicators: document.indicators.filter(isIndicatorConfig),
    drawings: document.drawings.filter(isOverlayShape),
  };
}

/**
 * Convierte los documentos v1 de un activo en el contenido del documento v2.
 *
 * - Recorre los seis `TIMEFRAMES` en orden y **une** los dibujos de todos ellos,
 *   **deduplicando por `id`** (la misma figura presente en dos timeframes cuenta
 *   una vez).
 * - Toma los indicadores del timeframe preferido si tiene documento v1; si no,
 *   de los del primer timeframe con datos.
 * - Devuelve `null` si no hay ningún documento v1 legible: no hay nada que migrar.
 *
 * No escribe ni elimina claves: el llamador decide si persiste el resultado.
 *
 * @param storage Almacenamiento a inspeccionar (inyectable en tests).
 * @param symbol Activo cuyos documentos v1 se migran.
 * @param preferredTimeframe Timeframe de la selección vigente, si se conoce.
 * @returns El contenido del documento v2, o `null` si no hay documentos v1.
 */
export function migrateFromV1(
  storage: Storage,
  symbol: string,
  preferredTimeframe?: Timeframe,
): ChartConfigInput | null {
  const legacy = TIMEFRAMES.map((timeframe) => ({
    timeframe,
    document: readLegacy(storage, symbol, timeframe),
  })).filter(
    (entry): entry is { timeframe: Timeframe; document: LegacyChartConfig } =>
      entry.document !== null,
  );

  const [first] = legacy;
  if (first === undefined) return null;

  const seen = new Set<string>();
  const drawings: OverlayShape[] = [];
  for (const { document } of legacy) {
    for (const shape of document.drawings) {
      if (seen.has(shape.id)) continue;
      seen.add(shape.id);
      drawings.push(shape);
    }
  }

  const source = legacy.find((entry) => entry.timeframe === preferredTimeframe) ?? first;
  return {
    drawings,
    indicators: source.document.indicators,
    selection: { timeframe: source.timeframe },
  };
}
