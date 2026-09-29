/**
 * Tests del hook de configuración del gráfico (TASK-UI-241, RF-204).
 *
 * Verifican la carga inicial, el guardado ante cambios, la restauración al
 * remontar (navegar/recargar) y el aislamiento por activo+timeframe. Patrón AAA.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OverlayShape } from '../../charting/overlay-geometry';
import type { IndicatorConfig } from '../../indicators/config';
import { createChartConfigStore, type ChartConfigStore } from '../chart-config';
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
  timeframe: string;
  store: ChartConfigStore;
  onState?: (state: { indicators: IndicatorConfig[]; drawings: OverlayShape[] }) => void;
}

/** Harness que expone el estado del hook y botones para mutarlo. */
function Harness({ symbol, timeframe, store, onState }: HarnessProps) {
  const { indicators, drawings, setIndicators, setDrawings } = useChartConfig(
    symbol,
    timeframe,
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

describe('useChartConfig (RF-204)', () => {
  afterEach(cleanup);

  it('abre sin indicadores ni dibujos por defecto', () => {
    const { store } = makeStore();
    const onState = vi.fn();

    render(<Harness symbol="EURUSD" timeframe="1h" store={store} onState={onState} />);

    const last = onState.mock.calls.at(-1)?.[0] as {
      indicators: IndicatorConfig[];
      drawings: OverlayShape[];
    };
    expect(last.drawings).toEqual([]);
    expect(last.indicators).toEqual([]);
  });

  it('persiste los cambios de indicadores y dibujos', () => {
    const { store } = makeStore();
    const { getByText } = render(<Harness symbol="EURUSD" timeframe="1h" store={store} />);

    fireEvent.click(getByText('add-indicator'));
    fireEvent.click(getByText('add-drawing'));

    const saved = store.load('EURUSD', '1h');
    expect(saved?.indicators).toContainEqual(NEW_INDICATOR);
    expect(saved?.drawings).toEqual([NEW_DRAWING]);
  });

  it('restaura la configuración al remontar (navegar/recargar)', () => {
    const { storage } = makeStore();
    const first = render(
      <Harness symbol="EURUSD" timeframe="1h" store={createChartConfigStore(storage)} />,
    );
    fireEvent.click(first.getByText('add-indicator'));
    first.unmount();

    const onState = vi.fn();
    render(
      <Harness
        symbol="EURUSD"
        timeframe="1h"
        store={createChartConfigStore(storage)}
        onState={onState}
      />,
    );

    const last = onState.mock.calls.at(-1)?.[0] as { indicators: IndicatorConfig[] };
    expect(last.indicators).toContainEqual(NEW_INDICATOR);
  });

  it('aísla la configuración por activo y timeframe', () => {
    const { store } = makeStore();
    store.save('GBPUSD', '4h', {
      indicators: [NEW_INDICATOR],
      drawings: [NEW_DRAWING],
    });
    const onState = vi.fn();

    const { rerender } = render(
      <Harness symbol="EURUSD" timeframe="1h" store={store} onState={onState} />,
    );
    expect((onState.mock.calls.at(-1)?.[0] as { drawings: OverlayShape[] }).drawings).toEqual([]);

    rerender(<Harness symbol="GBPUSD" timeframe="4h" store={store} onState={onState} />);

    const last = onState.mock.calls.at(-1)?.[0] as {
      indicators: IndicatorConfig[];
      drawings: OverlayShape[];
    };
    expect(last.indicators).toContainEqual(NEW_INDICATOR);
    expect(last.drawings).toEqual([NEW_DRAWING]);
  });
});
