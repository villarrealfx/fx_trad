/**
 * Tests del hook de configuración del gráfico (TASK-401, RI-401, ADR-027).
 *
 * Verifican la carga por **activo** (la clave ya no lleva el timeframe), el
 * guardado ante cambios reales, la restauración al remontar, el aislamiento por
 * activo y que el montaje **no** escribe un documento v2 (para no bloquear la
 * migración aditiva desde v1). Patrón AAA.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OverlayShape } from '../../charting/overlay-geometry';
import type { IndicatorConfig } from '../../indicators/config';
import {
  chartConfigKey,
  createChartConfigStore,
  type ChartConfigStore,
  type ChartSelection,
} from '../chart-config';
import { useChartConfig } from '../use-chart-config';

/** `Storage` en memoria para tests deterministas. */
class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const NEW_INDICATOR: IndicatorConfig = { id: 'rsi-9', kind: 'RSI', period: 9, visible: true };
const NEW_DRAWING: OverlayShape = {
  id: 'line-1',
  kind: 'line',
  from: { time: 0, price: 0 },
  to: { time: 10, price: 10 },
};

interface HarnessProps {
  symbol: string;
  selection: ChartSelection;
  store: ChartConfigStore;
  onState?: (state: { indicators: IndicatorConfig[]; drawings: OverlayShape[] }) => void;
}

/** Harness que expone el estado del hook y botones para mutarlo. */
function Harness({ symbol, selection, store, onState }: HarnessProps) {
  const { indicators, drawings, setIndicators, setDrawings } = useChartConfig(
    symbol,
    selection,
    store,
  );

  useEffect(() => {
    onState?.({ indicators, drawings });
  }, [indicators, drawings, onState]);

  return (
    <div>
      <button type="button" onClick={() => setIndicators((current) => [...current, NEW_INDICATOR])}>
        add-indicator
      </button>
      <button type="button" onClick={() => setDrawings([NEW_DRAWING])}>
        add-drawing
      </button>
    </div>
  );
}

/** Crea un store sobre un almacenamiento en memoria reutilizable. */
function makeStore(): { storage: MemoryStorage; store: ChartConfigStore } {
  const storage = new MemoryStorage();
  return { storage, store: createChartConfigStore(storage) };
}

const SELECTION: ChartSelection = { timeframe: '1h' };

describe('useChartConfig (TASK-401, ADR-027)', () => {
  afterEach(cleanup);

  it('abre sin indicadores ni dibujos por defecto', () => {
    const { store } = makeStore();
    const onState = vi.fn();

    render(<Harness symbol="EURUSD" selection={SELECTION} store={store} onState={onState} />);

    const last = onState.mock.calls.at(-1)?.[0] as {
      indicators: IndicatorConfig[];
      drawings: OverlayShape[];
    };
    expect(last.drawings).toEqual([]);
    expect(last.indicators).toEqual([]);
  });

  it('no escribe el documento v2 en el montaje (no bloquea la migración de v1)', () => {
    const { storage, store } = makeStore();

    render(<Harness symbol="EURUSD" selection={SELECTION} store={store} />);

    expect(storage.length).toBe(0);
  });

  it('persiste los cambios de indicadores y dibujos por activo', () => {
    const { store } = makeStore();
    const { getByText } = render(<Harness symbol="EURUSD" selection={SELECTION} store={store} />);

    fireEvent.click(getByText('add-indicator'));
    fireEvent.click(getByText('add-drawing'));

    const saved = store.load('EURUSD');
    expect(saved?.indicators).toContainEqual(NEW_INDICATOR);
    expect(saved?.drawings).toEqual([NEW_DRAWING]);
  });

  it('persiste la selección vigente junto con los cambios', () => {
    const { store } = makeStore();
    const { getByText } = render(
      <Harness
        symbol="EURUSD"
        selection={{ timeframe: '15m', start: '2026-01-02', end: '2026-03-04' }}
        store={store}
      />,
    );

    fireEvent.click(getByText('add-drawing'));

    expect(store.load('EURUSD')?.selection).toEqual({
      timeframe: '15m',
      start: '2026-01-02',
      end: '2026-03-04',
    });
  });

  it('restaura la configuración al remontar (navegar/recargar)', () => {
    const { storage } = makeStore();
    const first = render(
      <Harness symbol="EURUSD" selection={SELECTION} store={createChartConfigStore(storage)} />,
    );
    fireEvent.click(first.getByText('add-indicator'));
    first.unmount();

    const onState = vi.fn();
    render(
      <Harness
        symbol="EURUSD"
        selection={SELECTION}
        store={createChartConfigStore(storage)}
        onState={onState}
      />,
    );

    const last = onState.mock.calls.at(-1)?.[0] as { indicators: IndicatorConfig[] };
    expect(last.indicators).toContainEqual(NEW_INDICATOR);
  });

  it('mantiene la configuración al cambiar de timeframe del mismo activo (RF-404)', () => {
    const { store } = makeStore();
    const onState = vi.fn();
    store.save('EURUSD', {
      indicators: [NEW_INDICATOR],
      drawings: [NEW_DRAWING],
      selection: SELECTION,
    });

    const { rerender } = render(
      <Harness symbol="EURUSD" selection={SELECTION} store={store} onState={onState} />,
    );
    rerender(
      <Harness symbol="EURUSD" selection={{ timeframe: '15m' }} store={store} onState={onState} />,
    );

    const last = onState.mock.calls.at(-1)?.[0] as { drawings: OverlayShape[] };
    expect(last.drawings).toEqual([NEW_DRAWING]);
  });

  it('aísla la configuración por activo', () => {
    const { store } = makeStore();
    store.save('GBPUSD', {
      indicators: [NEW_INDICATOR],
      drawings: [NEW_DRAWING],
      selection: { timeframe: '4h' },
    });
    const onState = vi.fn();

    const { rerender } = render(
      <Harness symbol="EURUSD" selection={SELECTION} store={store} onState={onState} />,
    );
    expect((onState.mock.calls.at(-1)?.[0] as { drawings: OverlayShape[] }).drawings).toEqual([]);

    rerender(
      <Harness symbol="GBPUSD" selection={{ timeframe: '4h' }} store={store} onState={onState} />,
    );

    const last = onState.mock.calls.at(-1)?.[0] as {
      indicators: IndicatorConfig[];
      drawings: OverlayShape[];
    };
    expect(last.indicators).toContainEqual(NEW_INDICATOR);
    expect(last.drawings).toEqual([NEW_DRAWING]);
  });

  it('no escribe al cambiar de activo sin mutaciones', () => {
    const { storage, store } = makeStore();
    const { rerender } = render(<Harness symbol="EURUSD" selection={SELECTION} store={store} />);

    rerender(<Harness symbol="GBPUSD" selection={SELECTION} store={store} />);

    expect(storage.getItem(chartConfigKey('GBPUSD'))).toBeNull();
    expect(storage.length).toBe(0);
  });
});
