import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Select from '../Select';

const OPTIONS = [
  { value: '', label: 'Selecciona…' },
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'XAUUSD', label: 'XAU/USD' },
];

describe('Select (CMP-003)', () => {
  afterEach(cleanup);

  it('renders the labeled options', () => {
    render(<Select label="Activo" options={OPTIONS} value="" onChange={() => {}} />);

    expect(screen.getByLabelText('Activo')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'EUR/USD' })).toBeTruthy();
  });

  it('reports the selected value', () => {
    const onChange = vi.fn();
    render(<Select label="Activo" options={OPTIONS} value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Activo'), { target: { value: 'XAUUSD' } });

    expect(onChange).toHaveBeenCalledWith('XAUUSD');
  });

  it('shows an inline error with role alert', () => {
    render(
      <Select label="Activo" options={OPTIONS} value="" onChange={() => {}} error="Requerido" />,
    );

    expect(screen.getByLabelText('Activo').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Requerido');
  });

  it('is disabled when requested', () => {
    render(<Select label="Activo" options={OPTIONS} value="" onChange={() => {}} disabled />);

    expect((screen.getByLabelText('Activo') as HTMLSelectElement).disabled).toBe(true);
  });
});
