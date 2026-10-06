import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OperationNumericFields from '../OperationNumericFields';

/** Arnés que aporta el elemento de retorno del foco (la figura seleccionada). */
function Harness({ onApply, onCancel }: { onApply?: () => void; onCancel?: () => void }) {
  const returnRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button type="button" ref={returnRef}>
        Figura
      </button>
      <OperationNumericFields
        entry={1.1}
        stopLoss={1.095}
        onApply={onApply ?? (() => {})}
        onCancel={onCancel ?? (() => {})}
        returnFocusRef={returnRef}
      />
    </>
  );
}

describe('OperationNumericFields (CMP-025, RF-410)', () => {
  afterEach(cleanup);

  it('expone un diálogo de precios con label visible en ambos campos', () => {
    render(<Harness />);

    expect(screen.getByRole('dialog', { name: 'Precios de la operación' })).toBeTruthy();
    expect(screen.getByLabelText('Entrada')).toBeTruthy();
    expect(screen.getByLabelText('Stop Loss')).toBeTruthy();
  });

  it('usa inputMode decimal en los dos campos', () => {
    render(<Harness />);

    expect(screen.getByLabelText('Entrada').getAttribute('inputmode')).toBe('decimal');
    expect(screen.getByLabelText('Stop Loss').getAttribute('inputmode')).toBe('decimal');
  });

  it('ordena los campos Entrada y luego Stop Loss', () => {
    render(<Harness />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toBe(screen.getByLabelText('Entrada'));
    expect(inputs[1]).toBe(screen.getByLabelText('Stop Loss'));
  });

  it('enfoca el campo Entrada al abrir (estado editing-prices)', () => {
    render(<Harness />);

    expect(document.activeElement).toBe(screen.getByLabelText('Entrada'));
  });

  it('muestra el error inline asociado al campo cuando el valor no es numérico', () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText('Entrada'), { target: { value: 'abc' } });

    const entrada = screen.getByLabelText('Entrada');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Introduce un número válido');
    expect(entrada.getAttribute('aria-invalid')).toBe('true');
    expect(entrada.getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('deshabilita Aplicar mientras haya un valor no numérico', () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText('Stop Loss'), { target: { value: '' } });

    expect(screen.getByRole('button', { name: 'Aplicar' }).hasAttribute('disabled')).toBe(true);
  });

  it('marca riesgo nulo y deshabilita Aplicar cuando Entrada y SL coinciden', () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText('Stop Loss'), { target: { value: '1,10000' } });

    expect(screen.getByRole('alert').textContent).toBe('La entrada y el SL no pueden coincidir');
    expect(screen.getByLabelText('Stop Loss').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('button', { name: 'Aplicar' }).hasAttribute('disabled')).toBe(true);
  });

  it('aplica con Enter los precios redondeados a la precisión del activo', () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} />);

    fireEvent.change(screen.getByLabelText('Entrada'), { target: { value: '1,10000' } });
    fireEvent.change(screen.getByLabelText('Stop Loss'), { target: { value: '1.0950049' } });
    fireEvent.keyDown(screen.getByLabelText('Entrada'), { key: 'Enter' });

    expect(onApply).toHaveBeenCalledWith(1.1, 1.095);
  });

  it('aplica con el botón Aplicar cuando el par es válido', () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} />);

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onApply).toHaveBeenCalledWith(1.1, 1.095);
  });

  it('cancela con Escape y devuelve el foco a la figura', () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);

    fireEvent.keyDown(screen.getByLabelText('Entrada'), { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Figura' }));
  });

  it('cancela con el botón Cancelar y devuelve el foco a la figura', () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Figura' }));
  });

  it('atrapa el foco: Tab desde el último vuelve al primero', () => {
    render(<Harness />);

    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    cancelar.focus();
    fireEvent.keyDown(cancelar, { key: 'Tab' });

    expect(document.activeElement).toBe(screen.getByLabelText('Entrada'));
  });

  it('atrapa el foco: Shift+Tab desde el primero salta al último', () => {
    render(<Harness />);

    const entrada = screen.getByLabelText('Entrada');
    entrada.focus();
    fireEvent.keyDown(entrada, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));
  });

  it('se ancla a la figura con las coordenadas recibidas', () => {
    render(
      <OperationNumericFields
        entry={1.1}
        stopLoss={1.095}
        onApply={() => {}}
        onCancel={() => {}}
        anchor={{ x: 120, y: 64 }}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Precios de la operación' });
    expect(dialog.style.left).toBe('120px');
    expect(dialog.style.top).toBe('64px');
  });
});
