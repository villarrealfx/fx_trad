import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TIMEFRAMES } from '../../../contracts/ohlc';
import TimeframeSelector from '../TimeframeSelector';

describe('TimeframeSelector (CMP-023, RF-406)', () => {
  afterEach(cleanup);

  it('expone los seis timeframes del contrato en un radiogroup etiquetado', () => {
    render(<TimeframeSelector value="1h" onChange={() => {}} />);

    expect(screen.getByRole('radiogroup', { name: 'Timeframe' })).toBeTruthy();
    for (const timeframe of TIMEFRAMES) {
      expect(screen.getByRole('radio', { name: timeframe })).toBeTruthy();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(6);
  });

  it('marca el timeframe activo con aria-checked y solo él es tabulable', () => {
    render(<TimeframeSelector value="15m" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: '15m' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '1h' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: '15m' }).getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('radio', { name: '1h' }).getAttribute('tabindex')).toBe('-1');
  });

  it('notifica el timeframe elegido al hacer clic', () => {
    const onChange = vi.fn();
    render(<TimeframeSelector value="1h" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: '4h' }));

    expect(onChange).toHaveBeenCalledWith('4h');
  });

  it('no notifica si se pulsa el timeframe ya activo', () => {
    const onChange = vi.fn();
    render(<TimeframeSelector value="1h" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: '1h' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('mueve la selección con las flechas derecha e izquierda', () => {
    const onChange = vi.fn();
    render(<TimeframeSelector value="1h" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole('radio', { name: '1h' }), { key: 'ArrowRight' });

    expect(onChange).toHaveBeenLastCalledWith('4h');

    onChange.mockClear();
    fireEvent.keyDown(screen.getByRole('radio', { name: '1h' }), { key: 'ArrowLeft' });

    expect(onChange).toHaveBeenLastCalledWith('15m');
  });

  it('salta a los extremos con Home y End', () => {
    const onChange = vi.fn();
    render(<TimeframeSelector value="1h" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole('radio', { name: '1h' }), { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('1d');

    onChange.mockClear();
    fireEvent.keyDown(screen.getByRole('radio', { name: '1h' }), { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('1m');
  });

  it('no da la vuelta en los extremos', () => {
    const onChange = vi.fn();
    render(<TimeframeSelector value="1m" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole('radio', { name: '1m' }), { key: 'ArrowLeft' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('bloquea clic y teclado cuando está deshabilitado', () => {
    const onChange = vi.fn();
    render(<TimeframeSelector value="1h" onChange={onChange} disabled />);

    const active = screen.getByRole('radio', { name: '1h' });
    expect(active.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: '4h' }));
    fireEvent.keyDown(active, { key: 'ArrowRight' });

    expect(onChange).not.toHaveBeenCalled();
  });
});
