/**
 * Hook de carga/guardado de la configuración del gráfico (RI-401, ADR-027).
 *
 * Conecta `chart-config` (documento v2 **por activo**) con el ciclo de vida del
 * gráfico: al montar y al cambiar de activo carga el documento guardado, y ante
 * cualquier cambio **real** de indicadores o dibujos lo persiste junto con la
 * selección vigente.
 *
 * El hook **no escribe en el montaje**: crear un documento v2 vacío al abrir un
 * activo impediría la migración aditiva desde v1 (TASK-402), que solo actúa
 * cuando todavía no hay v2.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { OverlayShape } from '../charting/overlay-geometry';
import { DEFAULT_INDICATOR_CONFIGS, type IndicatorConfig } from '../indicators/config';
import { createChartConfigStore, type ChartConfigStore, type ChartSelection } from './chart-config';

/** Estado interno del hook, ligado al activo. */
interface ChartConfigState {
  symbol: string;
  indicators: IndicatorConfig[];
  drawings: OverlayShape[];
}

/** Resultado del hook. */
export interface UseChartConfigResult {
  /** Indicadores persistidos. */
  indicators: IndicatorConfig[];
  /** Dibujos persistidos. */
  drawings: OverlayShape[];
  /** Actualiza los indicadores (persistencia automática). */
  setIndicators: Dispatch<SetStateAction<IndicatorConfig[]>>;
  /** Actualiza los dibujos (persistencia automática). */
  setDrawings: Dispatch<SetStateAction<OverlayShape[]>>;
}

/** Carga la configuración guardada del activo o los valores por defecto. */
function loadState(store: ChartConfigStore, symbol: string): Omit<ChartConfigState, 'symbol'> {
  const config = store.load(symbol);
  return {
    indicators: config?.indicators ?? [...DEFAULT_INDICATOR_CONFIGS],
    drawings: config?.drawings ?? [],
  };
}

/**
 * Carga y persiste la configuración del gráfico por activo.
 *
 * @param symbol Activo actual.
 * @param selection Selección vigente (timeframe y rango) que acompaña al documento.
 * @param store Store a usar (inyectable en tests; por defecto `localStorage`).
 * @returns Indicadores y dibujos con sus setters.
 */
export function useChartConfig(
  symbol: string,
  selection: ChartSelection,
  store?: ChartConfigStore,
): UseChartConfigResult {
  const storeRef = useRef<ChartConfigStore | null>(store ?? null);
  if (storeRef.current === null) storeRef.current = createChartConfigStore();
  /** Solo se persiste tras una mutación, nunca al cargar. */
  const dirtyRef = useRef(false);

  const [state, setState] = useState<ChartConfigState>(() => ({
    symbol,
    ...loadState(storeRef.current as ChartConfigStore, symbol),
  }));

  // Cambio de activo: recarga antes del commit (ajuste de estado).
  if (state.symbol !== symbol) {
    setState({ symbol, ...loadState(storeRef.current as ChartConfigStore, symbol) });
  }

  const { timeframe, start, end } = selection;

  // Persiste ante cualquier cambio real de indicadores o dibujos.
  useEffect(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    storeRef.current?.save(symbol, {
      drawings: state.drawings,
      indicators: state.indicators,
      selection: { timeframe, start, end },
    });
  }, [symbol, state.indicators, state.drawings, timeframe, start, end]);

  const setIndicators = useCallback<Dispatch<SetStateAction<IndicatorConfig[]>>>((updater) => {
    dirtyRef.current = true;
    setState((previous) => ({
      ...previous,
      indicators:
        typeof updater === 'function'
          ? (updater as (value: IndicatorConfig[]) => IndicatorConfig[])(previous.indicators)
          : updater,
    }));
  }, []);

  const setDrawings = useCallback<Dispatch<SetStateAction<OverlayShape[]>>>((updater) => {
    dirtyRef.current = true;
    setState((previous) => ({
      ...previous,
      drawings:
        typeof updater === 'function'
          ? (updater as (value: OverlayShape[]) => OverlayShape[])(previous.drawings)
          : updater,
    }));
  }, []);

  return { indicators: state.indicators, drawings: state.drawings, setIndicators, setDrawings };
}
