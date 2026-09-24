import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MultiChart from '../MultiChart';

vi.mock('../../ChartPane/ChartPane', async () => {
  const React = await import('react');
  return {
    default: function MockChartPane({
      timeframe,
      onLegend,
    }: {
      timeframe?: string;
      onLegend?: (c: unknown) => void;
    }) {
      const onLegendRef = React.useRef(onLegend);
      onLegendRef.current = onLegend;
      React.useEffect(() => {
        onLegendRef.current?.({ time: 1, open: 1, high: 1, low: 1, close: 1.23456 });
      }, []);
      return <div data-testid="pane" data-timeframe={timeframe} />;
    },
  };
});

describe('MultiChart (SCR-005)', () => {
  afterEach(cleanup);

  it('renders two independent panes with their timeframes', () => {
    render(<MultiChart symbol="EURUSD" />);

    const panes = screen.getAllByTestId('pane');
    expect(panes).toHaveLength(2);
    expect(panes[0].getAttribute('data-timeframe')).toBe('1h');
    expect(panes[1].getAttribute('data-timeframe')).toBe('1d');
  });

  it('adds panes up to the maximum of three and disables add with a tooltip', () => {
    render(<MultiChart symbol="EURUSD" />);
    const add = screen.getByRole('button', { name: 'Añadir gráfico' }) as HTMLButtonElement;

    fireEvent.click(add);

    expect(screen.getAllByTestId('pane')).toHaveLength(3);
    expect(add.disabled).toBe(true);
    expect(add.getAttribute('title')).toBe('Máximo 3 paneles');
  });

  it('removes a pane through its tab and keeps at least one', () => {
    render(<MultiChart symbol="EURUSD" />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar 1d' }));
    expect(screen.getAllByTestId('pane')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar 1h' }));
    expect(screen.getAllByTestId('pane')).toHaveLength(1);
  });

  it('changes the timeframe of a pane independently', () => {
    render(<MultiChart symbol="EURUSD" />);

    fireEvent.change(screen.getByLabelText('Timeframe del panel 1'), { target: { value: '4h' } });

    expect(screen.getAllByTestId('pane')[0].getAttribute('data-timeframe')).toBe('4h');
    expect(screen.getAllByTestId('pane')[1].getAttribute('data-timeframe')).toBe('1d');
  });

  it('renders the combined textual legend per pane', () => {
    render(<MultiChart symbol="EURUSD" />);

    const legend = screen.getByLabelText('Leyenda combinada');
    expect(legend.textContent).toContain('1h: C 1.23456');
    expect(legend.textContent).toContain('1d: C 1.23456');
  });
});
