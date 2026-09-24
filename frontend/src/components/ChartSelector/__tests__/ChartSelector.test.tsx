import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChartSelector from '../ChartSelector';

describe('ChartSelector (SCR-003)', () => {
  afterEach(cleanup);

  it('renders the asset, range and timeframe controls', () => {
    render(<ChartSelector onOpen={() => {}} />);

    expect(screen.getByLabelText('Activo (de la biblioteca)')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de inicio')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Timeframe (agregado desde 1s)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abrir gráfico' })).toBeTruthy();
  });

  it('opens the chart with the default selection', () => {
    const onOpen = vi.fn();
    render(<ChartSelector onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir gráfico' }));

    expect(onOpen).toHaveBeenCalledWith('/chart?symbol=EURUSD&timeframe=1h');
  });

  it('includes the asset, timeframe and range in the url', () => {
    const onOpen = vi.fn();
    render(<ChartSelector onOpen={onOpen} />);

    fireEvent.change(screen.getByLabelText('Activo (de la biblioteca)'), {
      target: { value: 'XAUUSD' },
    });
    fireEvent.click(screen.getByLabelText('4h'));
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-02-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir gráfico' }));

    expect(onOpen).toHaveBeenCalledWith(
      '/chart?symbol=XAUUSD&timeframe=4h&start=2026-01-01&end=2026-02-01',
    );
  });

  it('blocks opening when the start date is after the end date', () => {
    const onOpen = vi.fn();
    render(<ChartSelector onOpen={onOpen} />);

    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-01-01' } });

    expect(
      (screen.getByRole('button', { name: 'Abrir gráfico' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
