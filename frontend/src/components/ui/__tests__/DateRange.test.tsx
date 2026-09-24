import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DateRange from '../DateRange';

describe('DateRange (CMP-005)', () => {
  afterEach(cleanup);

  it('flags start > end as an error', () => {
    const { container } = render(
      <DateRange start="2026-05-10" end="2026-05-01" onChange={() => {}} />,
    );

    expect(container.querySelector('.date-range')?.getAttribute('data-state')).toBe('error');
    expect(
      screen.getByText('La fecha de inicio debe ser anterior o igual a la de fin'),
    ).toBeTruthy();
  });

  it('flags a start date outside the coverage', () => {
    render(<DateRange start="2026-01-01" end="" min="2026-02-01" onChange={() => {}} />);

    expect(screen.getByText('La fecha de inicio está fuera de la cobertura')).toBeTruthy();
  });

  it('marks the range as partial when only one date is set', () => {
    const { container } = render(<DateRange start="2026-02-01" end="" onChange={() => {}} />);

    expect(container.querySelector('.date-range')?.getAttribute('data-state')).toBe('partial');
    expect(screen.getByText('Rango incompleto')).toBeTruthy();
  });

  it('emits the updated range when a date changes', () => {
    const onChange = vi.fn();
    render(<DateRange start="2026-02-01" end="2026-02-10" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-02-20' } });

    expect(onChange).toHaveBeenCalledWith({ start: '2026-02-01', end: '2026-02-20' });
  });
});
