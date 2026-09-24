import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Input from '../Input';

describe('Input (CMP-002)', () => {
  afterEach(cleanup);

  it('associates the visible label with the control', () => {
    render(<Input label="Fecha de inicio" value="" onChange={() => {}} />);

    expect(screen.getByLabelText('Fecha de inicio')).toBeTruthy();
  });

  it('reports changes with the new value', () => {
    const onChange = vi.fn();
    render(<Input label="Activo" value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Activo'), { target: { value: 'EURUSD' } });

    expect(onChange).toHaveBeenCalledWith('EURUSD');
  });

  it('shows an inline error announced as alert and marks aria-invalid', () => {
    render(<Input label="Activo" value="" onChange={() => {}} error="Campo requerido" />);

    const input = screen.getByLabelText('Activo');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Campo requerido');
  });

  it('is disabled when requested', () => {
    render(<Input label="Activo" value="EURUSD" onChange={() => {}} disabled />);

    const input = screen.getByLabelText('Activo') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
