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
import { isIndicatorConfig, type IndicatorConfig } from '../indicators/config';
import { migrateFromV1 } from './migrate-chart-config';

/** Versión del esquema del documento de configuración (ADR-027). */
export const CHART_CONFIG_VERSION = 2;

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

/** Clave del puntero de la última selección de gráfico (RI-402, ADR-030). */
export const LAST_CHART_SELECTION_KEY = 'fxtrad.chart.last';

/**
 * Última selección de gráfico usada, **con su activo** (RI-402, ADR-030).
 *
 * El `selection` del documento v2 es por activo, así que no basta para saber qué
 * activo abrir en `/chart` sin query: este puntero añade el símbolo.
 */
export interface LastChartSelection extends ChartSelection {
  symbol: string;
}

/** Comprueba que un valor sea una `LastChartSelection` válida. */
function isLastChartSelection(value: unknown): value is LastChartSelection {
  if (typeof value !== 'object' || value === null) return false;
  const selection = value as Partial<LastChartSelection>;
  return typeof selection.symbol === 'string' && isChartSelection(selection);
}

/** Serializa el puntero de la última selección (ADR-030). */
export function serializeLastSelection(selection: LastChartSelection): string {
  return JSON.stringify(selection);
}

/** Deserializa el puntero; `null` si falta, está corrupto o no es válido. */
export function deserializeLastSelection(
  raw: string | null | undefined,
): LastChartSelection | null {
  if (raw === null || raw === undefined || raw === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isLastChartSelection(parsed) ? parsed : null;
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
  /**
   * Carga el documento del activo, o `null` si no hay.
   *
   * Si no existe el v2, intenta la **migración aditiva** desde los documentos v1
   * (TASK-402, RNF-401), persiste el resultado y lo devuelve. El timeframe
   * preferido decide de qué documento v1 se toman los indicadores.
   */
  load(symbol: string, preferredTimeframe?: Timeframe): DrawingDocument | null;
  /** Elimina el documento de un activo. */
  clear(symbol: string): void;
  /** Guarda el puntero de la última selección de gráfico (RI-402, ADR-030). */
  saveLastSelection(selection: LastChartSelection): void;
  /** Lee el puntero de la última selección; `null` si no hay o no es válido. */
  loadLastSelection(): LastChartSelection | null;
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
  function saveDocument(symbol: string, input: ChartConfigInput): void {
    if (storage === null) return;
    try {
      storage.setItem(chartConfigKey(symbol), serializeChartConfig(symbol, input));
    } catch {
      // Cuota excedida u otro fallo del almacenamiento: se ignora.
    }
  }

  return {
    save: saveDocument,
    load(symbol, preferredTimeframe) {
      if (storage === null) return null;
      const current = deserializeChartConfig(symbol, storage.getItem(chartConfigKey(symbol)));
      if (current !== null) return current;
      const migrated = migrateFromV1(storage, symbol, preferredTimeframe);
      if (migrated === null) return null;
      saveDocument(symbol, migrated);
      return {
        version: CHART_CONFIG_VERSION,
        symbol,
        drawings: [...migrated.drawings],
        indicators: [...migrated.indicators],
        selection: migrated.selection,
      };
    },
    clear(symbol) {
      storage?.removeItem(chartConfigKey(symbol));
    },
    saveLastSelection(selection) {
      if (storage === null) return;
      try {
        storage.setItem(LAST_CHART_SELECTION_KEY, serializeLastSelection(selection));
      } catch {
        // Cuota excedida u otro fallo del almacenamiento: se ignora.
      }
    },
    loadLastSelection() {
      if (storage === null) return null;
      return deserializeLastSelection(storage.getItem(LAST_CHART_SELECTION_KEY));
    },
  };
}
