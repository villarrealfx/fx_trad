/**
 * Persistencia de la configuración del gráfico (RI-401, RI-402, ADR-027).
 *
 * Un **documento v2 por activo** (`DrawingDocument`) reúne los dibujos compartidos
 * del activo, su lista de indicadores y la última selección del gráfico. Sustituye
 * la clave por activo+timeframe de RI-201: el dibujo pertenece al **activo**, no al
 * timeframe que se esté mirando.
 *
 * La migración desde los documentos v1 (`fxtrad.chart.v1.{symbol}.{TF}`) es
 * **aditiva al leer** y no borra las claves antiguas (RNF-401); vive en
 * `state/migrate-chart-config` (TASK-402) y se invoca desde `load`.
 *
 * Este módulo solo aporta el contrato de datos; el guardado/restauración dentro del
 * ciclo de vida del gráfico lo hace `state/use-chart-config`.
 */
import { isOverlayShape } from '../charting/drawings';
import type { OverlayShape } from '../charting/overlay-geometry';
import { TIMEFRAMES, type Timeframe } from '../contracts/ohlc';
import type { IndicatorConfig, IndicatorKind } from '../indicators/config';

/** Versión del esquema del documento de configuración (ADR-027). */
export const CHART_CONFIG_VERSION = 2;

/** Tipos de indicador válidos al deserializar. */
const INDICATOR_KINDS: readonly IndicatorKind[] = ['MA', 'RSI', 'ATR'];

/** Última selección de gráfico recordada para el activo (RI-402). */
export interface ChartSelection {
  /** Timeframe activo. */
  timeframe: Timeframe;
  /** Inicio del rango en ISO `YYYY-MM-DD` (opcional). */
  start?: string;
  /** Fin del rango en ISO `YYYY-MM-DD` (opcional). */
  end?: string;
}

/**
 * Documento de configuración del gráfico: **uno por activo**.
 *
 * Es el contrato único: `DrawingDocument` se reutiliza aquí en lugar de mantener
 * un documento por timeframe (ADR-027).
 */
export interface DrawingDocument {
  /** Versión del esquema, para migrar/descartar (RNF-201). */
  version: number;
  /** Activo al que pertenece el documento. */
  symbol: string;
  /** Dibujos del activo, compartidos entre todos sus timeframes. */
  drawings: OverlayShape[];
  /** Indicadores del activo, recalculados con las velas del TF visible. */
  indicators: IndicatorConfig[];
  /** Última selección de gráfico del activo. */
  selection: ChartSelection;
}

/** Entrada para guardar (sin versión ni símbolo; los fija el store). */
export interface ChartConfigInput {
  drawings: ReadonlyArray<OverlayShape>;
  indicators: ReadonlyArray<IndicatorConfig>;
  selection: ChartSelection;
}

/** Clave de almacenamiento por activo y versión de esquema. */
export function chartConfigKey(symbol: string): string {
  return `fxtrad.chart.v${CHART_CONFIG_VERSION}.${symbol}`;
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

/** Comprueba que un valor sea una `ChartSelection` válida. */
function isChartSelection(value: unknown): value is ChartSelection {
  if (typeof value !== 'object' || value === null) return false;
  const selection = value as Partial<ChartSelection>;
  if (!TIMEFRAMES.includes(selection.timeframe as Timeframe)) return false;
  return [selection.start, selection.end].every(
    (bound) => bound === undefined || typeof bound === 'string',
  );
}

/** Serializa el documento del activo a una cadena JSON versionada (RI-401). */
export function serializeChartConfig(symbol: string, input: ChartConfigInput): string {
  const document: DrawingDocument = {
    version: CHART_CONFIG_VERSION,
    symbol,
    drawings: [...input.drawings],
    indicators: [...input.indicators],
    selection: input.selection,
  };
  return JSON.stringify(document);
}

/**
 * Deserializa el documento de un activo; `null` ante ausencia, versión desconocida,
 * símbolo que no corresponde o datos corruptos. Las entradas inválidas de cada
 * lista se filtran.
 */
export function deserializeChartConfig(
  symbol: string,
  raw: string | null | undefined,
): DrawingDocument | null {
  if (raw === null || raw === undefined || raw === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const document = parsed as Partial<DrawingDocument>;
  if (document.version !== CHART_CONFIG_VERSION) return null;
  if (document.symbol !== symbol) return null;
  if (!Array.isArray(document.drawings) || !Array.isArray(document.indicators)) return null;
  if (!isChartSelection(document.selection)) return null;
  return {
    version: CHART_CONFIG_VERSION,
    symbol,
    drawings: document.drawings.filter(isOverlayShape),
    indicators: document.indicators.filter(isIndicatorConfig),
    selection: document.selection,
  };
}

/** API de persistencia de la configuración del gráfico por activo. */
export interface ChartConfigStore {
  /** Guarda el documento de un activo. */
  save(symbol: string, input: ChartConfigInput): void;
  /** Carga el documento del activo, o `null` si no hay o es inválido. */
  load(symbol: string): DrawingDocument | null;
  /** Elimina el documento de un activo. */
  clear(symbol: string): void;
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
    save(symbol, input) {
      if (storage === null) return;
      try {
        storage.setItem(chartConfigKey(symbol), serializeChartConfig(symbol, input));
      } catch {
        // Cuota excedida u otro fallo del almacenamiento: se ignora.
      }
    },
    load(symbol) {
      if (storage === null) return null;
      return deserializeChartConfig(symbol, storage.getItem(chartConfigKey(symbol)));
    },
    clear(symbol) {
      storage?.removeItem(chartConfigKey(symbol));
    },
  };
}
