/**
 * Hook de carga/guardado de la configuración del gráfico (TASK-UI-241, RF-204).
 *
 * Conecta `chart-config` (RI-201) con el ciclo de vida del gráfico: al montar y
 * al cambiar de **activo + timeframe** carga la configuración guardada, y ante
 * cualquier cambio de indicadores o dibujos la guarda. La carga es síncrona en
 * el render (ajuste de estado) para que el `ChartPane` reciba los dibujos
 * iniciales correctos en el mismo commit en que se remonta.
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
import { createChartConfigStore, type ChartConfigStore } from './chart-config';

/** Estado interno del hook, ligado a la clave activo+timeframe. */
interface ChartConfigState {
  key: string;
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

/** Carga la configuración guardada o los valores por defecto. */
function loadState(
  store: ChartConfigStore,
  symbol: string,
  timeframe: string,
): Omit<ChartConfigState, 'key'> {
  const config = store.load(symbol, timeframe);
  return {
    indicators: config?.indicators ?? [...DEFAULT_INDICATOR_CONFIGS],
    drawings: config?.drawings ?? [],
  };
}

/**
 * Carga y persiste la configuración del gráfico por activo + timeframe.
 *
 * @param symbol Activo actual.
 * @param timeframe Timeframe actual.
 * @param store Store a usar (inyectable en tests; por defecto `localStorage`).
 * @returns Indicadores y dibujos con sus setters.
 */
export function useChartConfig(
  symbol: string,
  timeframe: string,
  store?: ChartConfigStore,
): UseChartConfigResult {
  const storeRef = useRef<ChartConfigStore | null>(store ?? null);
  if (storeRef.current === null) storeRef.current = createChartConfigStore();

  const key = `${symbol}:${timeframe}`;
  const [state, setState] = useState<ChartConfigState>(() => ({
    key,
    ...loadState(storeRef.current as ChartConfigStore, symbol, timeframe),
  }));

  // Cambio de activo/timeframe: recarga antes del commit (ajuste de estado).
  if (state.key !== key) {
    setState({ key, ...loadState(storeRef.current as ChartConfigStore, symbol, timeframe) });
  }

  // Persiste ante cualquier cambio de indicadores o dibujos.
  useEffect(() => {
    storeRef.current?.save(symbol, timeframe, {
      indicators: state.indicators,
      drawings: state.drawings,
    });
  }, [symbol, timeframe, state.indicators, state.drawings]);

  const setIndicators = useCallback<Dispatch<SetStateAction<IndicatorConfig[]>>>((updater) => {
    setState((previous) => ({
      ...previous,
      indicators:
        typeof updater === 'function'
          ? (updater as (value: IndicatorConfig[]) => IndicatorConfig[])(previous.indicators)
          : updater,
    }));
  }, []);

  const setDrawings = useCallback<Dispatch<SetStateAction<OverlayShape[]>>>((updater) => {
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
