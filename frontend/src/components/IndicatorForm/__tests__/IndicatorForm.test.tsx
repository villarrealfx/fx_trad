/**
 * Tests del formulario flotante de indicadores (TASK-UI-212, CMP-016).
 *
 * Verifican el popover no modal: apertura/cierre, listado y edición de
 * indicadores, estado vacío y cierre con Escape. Patrón AAA.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { IndicatorConfig } from '../../../indicators/config';
import IndicatorForm from '../IndicatorForm';

const CONFIGS: IndicatorConfig[] = [
  { id: 'ma-20', kind: 'MA', period: 20, visible: true },
  { id: 'rsi-14', kind: 'RSI', period: 14, visible: false },
];

/** Renderiza el formulario con espías por defecto. */
function renderForm(overrides: Partial<ComponentProps<typeof IndicatorForm>> = {}) {
  const handlers = { onChange: vi.fn(), onClose: vi.fn() };
  render(<IndicatorForm open configs={CONFIGS} {...handlers} {...overrides} />);
  return handlers;
}

describe('IndicatorForm (CMP-016)', () => {
  afterEach(cleanup);

  it('no renderiza nada cuando está cerrado', () => {
    renderForm({ open: false });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lista los indicadores en un diálogo no modal etiquetado', () => {
    renderForm();

    const dialog = screen.getByRole('dialog', { name: 'Indicadores' });
    expect(dialog.getAttribute('aria-modal')).toBeNull();
    expect(screen.getByText('MA 20', { selector: '.indicator-item__name' })).toBeTruthy();
    expect(screen.getByText('RSI', { selector: '.indicator-item__name' })).toBeTruthy();
  });

  it('muestra un estado vacío sin indicadores', () => {
    renderForm({ configs: [] });

    expect(screen.getByText(/Sin indicadores/)).toBeTruthy();
  });

  it('alterna la visibilidad de un indicador', () => {
    const { onChange } = renderForm();

    fireEvent.click(screen.getAllByLabelText('Mostrar')[1] as HTMLElement);

    expect(onChange).toHaveBeenCalledWith([CONFIGS[0], { ...CONFIGS[1], visible: true }]);
  });

  it('elimina un indicador', () => {
    const { onChange } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar MA 20' }));

    expect(onChange).toHaveBeenCalledWith([CONFIGS[1]]);
  });

  it('añade un indicador del tipo seleccionado', () => {
    const { onChange } = renderForm();

    fireEvent.change(screen.getByLabelText('Añadir indicador'), { target: { value: 'RSI' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));

    const next = onChange.mock.calls[0]?.[0] as IndicatorConfig[];
    expect(next).toHaveLength(3);
    expect(next[2]).toMatchObject({ kind: 'RSI', visible: true });
  });

  it('cierra con la tecla Escape sin descartar los indicadores', () => {
    const { onClose, onChange } = renderForm();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('cierra con el botón de cerrar', () => {
    const { onClose } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar indicadores' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
