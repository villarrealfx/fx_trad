/**
 * Configuración de indicadores como lista editable (TASK-UI-042, CMP-010).
 *
 * El panel maneja una lista de indicadores (añadir/quitar/reconfigurar/ocultar)
 * y la convierte a `IndicatorParameters` para que el ChartPane redibuje (RF-013).
 */
import { ATR_PERIOD_DEFAULT, RSI_PERIOD_DEFAULT, type IndicatorParameters } from './indicators';

/** Tipo de indicador del panel (CMP-010). */
export type IndicatorKind = 'MA' | 'RSI' | 'ATR';

/** Indicador configurable del panel. */
export interface IndicatorConfig {
  /** Identificador único estable del item. */
  id: string;
  kind: IndicatorKind;
  period: number;
  /** Si el indicador se dibuja en el gráfico. */
  visible: boolean;
}

/** Tipos de indicador válidos al deserializar un documento persistido. */
const INDICATOR_KINDS: readonly IndicatorKind[] = ['MA', 'RSI', 'ATR'];

/**
 * Comprueba que un valor sea un `IndicatorConfig` válido.
 *
 * Vive junto al contrato porque lo consumen tanto el documento v2
 * (`state/chart-config`) como la migración desde los documentos v1
 * (`state/migrate-chart-config`, TASK-402).
 */
export function isIndicatorConfig(value: unknown): value is IndicatorConfig {
  if (typeof value !== 'object' || value === null) return false;
  const config = value as Partial<IndicatorConfig>;
  return (
    typeof config.id === 'string' &&
    INDICATOR_KINDS.includes(config.kind as IndicatorKind) &&
    typeof config.period === 'number' &&
    typeof config.visible === 'boolean'
  );
}

/**
 * Indicadores iniciales: **ninguno** (RF-201).
 *
 * El gráfico abre sin indicadores; el usuario los agrega a petición desde el
 * formulario flotante (ADR-019). La lista se persiste **por activo** (RI-401,
 * ADR-027).
 */
export const DEFAULT_INDICATOR_CONFIGS: ReadonlyArray<IndicatorConfig> = [];

/** Periodo por defecto al añadir un indicador de cada tipo. */
export const NEW_INDICATOR_PERIOD: Record<IndicatorKind, number> = {
  MA: 10,
  RSI: 14,
  ATR: 14,
};

/** Etiqueta visible de un item (p. ej. `MA 20`, `RSI`, `ATR`). */
export function indicatorLabel(config: IndicatorConfig): string {
  return config.kind === 'MA' ? `MA ${config.period}` : config.kind;
}

/**
 * Convierte la lista de configuración a los parámetros del ChartPane.
 *
 * Los MA se toman de los items visibles; RSI/ATR usan el primer item de su tipo
 * y su visibilidad se expresa con `showRsi`/`showAtr`.
 */
export function toIndicatorParameters(
  configs: ReadonlyArray<IndicatorConfig>,
): IndicatorParameters {
  const maPeriods = configs
    .filter((config) => config.kind === 'MA' && config.visible)
    .map((config) => config.period);
  const rsi = configs.find((config) => config.kind === 'RSI');
  const atr = configs.find((config) => config.kind === 'ATR');
  return {
    maPeriods,
    rsiPeriod: rsi?.period ?? RSI_PERIOD_DEFAULT,
    atrPeriod: atr?.period ?? ATR_PERIOD_DEFAULT,
    showRsi: rsi?.visible ?? false,
    showAtr: atr?.visible ?? false,
  };
}
