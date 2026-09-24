import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MultiChart from '../MultiChart';

vi.mock('../../ChartPane/ChartPane', () => ({
  default: ({ timeframe }: { timeframe?: string }) => (
    <div data-testid="pane" data-timeframe={timeframe} />
  ),
}));

describe('MultiChart (SCR-005)', () => {
  afterEach(cleanup);

  it('renders two independent panes with their timeframes', () => {
    render(<MultiChart symbol="EURUSD" />);

    const panes = screen.getAllByTestId('pane');
    expect(panes).toHaveLength(2);
    expect(panes[0].getAttribute('data-timeframe')).toBe('1h');
    expect(panes[1].getAttribute('data-timeframe')).toBe('1d');
  });

  it('adds panes up to the maximum of three', () => {
    render(<MultiChart symbol="EURUSD" />);
    const add = screen.getByRole('button', { name: 'Añadir panel' }) as HTMLButtonElement;

    fireEvent.click(add);

    expect(screen.getAllByTestId('pane')).toHaveLength(3);
    expect(add.disabled).toBe(true);
  });

  it('removes a pane and keeps at least one', () => {
    render(<MultiChart symbol="EURUSD" />);

    fireEvent.click(screen.getByRole('button', { name: 'Quitar panel 2' }));

    expect(screen.getAllByTestId('pane')).toHaveLength(1);
    expect(
      (screen.getByRole('button', { name: 'Quitar panel 1' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('changes the timeframe of a pane independently', () => {
    render(<MultiChart symbol="EURUSD" />);

    fireEvent.change(screen.getByLabelText('Timeframe del panel 1'), { target: { value: '4h' } });

    expect(screen.getAllByTestId('pane')[0].getAttribute('data-timeframe')).toBe('4h');
    expect(screen.getAllByTestId('pane')[1].getAttribute('data-timeframe')).toBe('1d');
  });
});
