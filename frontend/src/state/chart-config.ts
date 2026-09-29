/**
 * Persistencia de la configuración del gráfico (RI-201, ADR-018).
 *
 * Guarda, por combinación **activo + timeframe**, los indicadores y los dibujos
 * del gráfico en el almacenamiento del navegador (`localStorage` por defecto)
 * con un esquema versionado. La versión vive tanto en la clave como en el
 * documento: al subir de versión, las entradas antiguas se ignoran sin corromper
 * el estado (migración/descarte, R-203).
 *
 * Este módulo solo aporta el contrato de datos; el guardado/restauración dentro
 * del ciclo de vida del gráfico lo hace TASK-UI-241.
 */
import { isOverlayShape } from '../charting/drawings';
import type { OverlayShape } from '../charting/overlay-geometry';
import type { IndicatorConfig, IndicatorKind } from '../indicators/config';

/** Versión del esquema de configuración del gráfico. */
export const CHART_CONFIG_VERSION = 1;

/** Tipos de indicador válidos al deserializar. */
const INDICATOR_KINDS: readonly IndicatorKind[] = ['MA', 'RSI', 'ATR'];

/** Configuración del gráfico que se persiste (RI-201). */
export interface ChartConfig {
  /** Versión del esquema. */
  version: number;
  /** Indicadores configurados. */
  indicators: IndicatorConfig[];
  /** Dibujos del overlay. */
  drawings: OverlayShape[];
}

/** Entrada para guardar (sin versión; la fija el store). */
export interface ChartConfigInput {
  indicators: ReadonlyArray<IndicatorConfig>;
  drawings: ReadonlyArray<OverlayShape>;
}

/** Clave de almacenamiento por activo + timeframe y versión de esquema. */
export function chartConfigKey(symbol: string, timeframe: string): string {
  return `fxtrad.chart.v${CHART_CONFIG_VERSION}.${symbol}.${timeframe}`;
}

/** Comprueba que un valor sea un `IndicatorConfig` válido. */
function isIndicatorConfig(value: unknown): value is IndicatorConfig {
  if (typeof value !== 'object' || value === null) return false;
  const config = value as Partial<IndicatorConfig>;
  return (
    typeof config.id === 'string' &&
    INDICATOR_KINDS.includes(config.kind as IndicatorKind) &&
    typeof config.period === 'number' &&
    typeof config.visible === 'boolean'
  );
}

/** Serializa la configuración a una cadena JSON versionada. */
export function serializeChartConfig(input: ChartConfigInput): string {
  const document: ChartConfig = {
    version: CHART_CONFIG_VERSION,
    indicators: [...input.indicators],
    drawings: [...input.drawings],
  };
  return JSON.stringify(document);
}

/**
 * Deserializa una configuración; `null` ante ausencia, versión desconocida o
 * datos corruptos. Las formas inválidas de cada lista se filtran.
 */
export function deserializeChartConfig(raw: string | null | undefined): ChartConfig | null {
  if (raw === null || raw === undefined || raw === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const document = parsed as Partial<ChartConfig>;
  if (document.version !== CHART_CONFIG_VERSION) return null;
  if (!Array.isArray(document.indicators) || !Array.isArray(document.drawings)) return null;
  return {
    version: CHART_CONFIG_VERSION,
    indicators: document.indicators.filter(isIndicatorConfig),
    drawings: document.drawings.filter(isOverlayShape),
  };
}

/** API de persistencia de la configuración del gráfico. */
export interface ChartConfigStore {
  /** Guarda indicadores y dibujos para un activo y timeframe. */
  save(symbol: string, timeframe: string, input: ChartConfigInput): void;
  /** Carga la configuración guardada, o `null` si no hay o es inválida. */
  load(symbol: string, timeframe: string): ChartConfig | null;
  /** Elimina la configuración de un activo y timeframe. */
  clear(symbol: string, timeframe: string): void;
}

/** Almacenamiento por defecto (navegador); `null` si no está disponible. */
function defaultStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

/**
 * Crea el store de configuración sobre un `Storage` (inyectable en tests).
 *
 * `save` no lanza ante cuota excedida u otros errores del almacenamiento
 * (R-203): la configuración es un estado conveniente, no crítico.
 */
export function createChartConfigStore(
  storage: Storage | null = defaultStorage(),
): ChartConfigStore {
  return {
    save(symbol, timeframe, input) {
      if (storage === null) return;
      try {
        storage.setItem(chartConfigKey(symbol, timeframe), serializeChartConfig(input));
      } catch {
        // Cuota excedida u otro fallo del almacenamiento: se ignora.
      }
    },
    load(symbol, timeframe) {
      if (storage === null) return null;
      return deserializeChartConfig(storage.getItem(chartConfigKey(symbol, timeframe)));
    },
    clear(symbol, timeframe) {
      storage?.removeItem(chartConfigKey(symbol, timeframe));
    },
  };
}
