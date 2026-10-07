/**
 * Tests de aceptación y accesibilidad del menú contextual de vela
 * (TASK-UI-409, RF-408, HU-UI-403).
 *
 * Cubren la apertura con los valores de la vela, el cierre por `Escape` y por
 * clic fuera con retorno del foco, el reposicionamiento en los cuatro bordes del
 * viewport (nunca desborda) y el escaneo de axe-core. La regla `color-contrast`
 * se desactiva porque jsdom no resuelve el color computado (patrón de
 * `ChartPane.test.tsx`); el contraste AA se cubre en los tests de tokens.
 */
import axe from 'axe-core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Candle } from '../../../contracts/ohlc';
import CandleContextMenu from '../CandleContextMenu';

const CANDLE: Candle = {
  time: Date.UTC(2025, 10, 18, 0, 15) / 1000,
  open: 1.1,
  high: 1.103,
  low: 1.0985,
  close: 1.1012,
};

/** Tamaño simulado del panel y del viewport para el reposicionamiento. */
const PANEL = { width: 160, height: 80 };
const VIEWPORT = { width: 300, height: 200 };
const MARGIN = 8;

/** Prepara un elemento de foco externo (el gráfico) y monta el menú. */
function mountMenu(anchor = { x: 40, y: 40 }) {
  const onClose = vi.fn();
  const returnFocusRef = { current: document.createElement('button') };
  document.body.appendChild(returnFocusRef.current);
  const view = render(
    <CandleContextMenu
      candle={CANDLE}
      anchor={anchor}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
    />,
  );
  return { onClose, returnFocusRef, view };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('CandleContextMenu (TASK-UI-409, RF-408)', () => {
  it('abre como diálogo con la fecha, la hora y el OHLC a 5 decimales', () => {
    mountMenu();

    const dialog = screen.getByRole('dialog', { name: 'Datos de la vela' });
    expect(dialog.textContent).toContain('18-nov-25 · 00:15');
    expect(dialog.querySelectorAll('.candle-context-menu__value')).toHaveLength(4);
    for (const value of ['1.10000', '1.10300', '1.09850', '1.10120']) {
      expect(dialog.textContent).toContain(value);
    }
    // El foco entra en el panel al abrir (estado `context-open`).
    expect(document.activeElement).toBe(dialog);
  });

  it('cierra con `Escape` y devuelve el foco al gráfico', () => {
    const { onClose, returnFocusRef } = mountMenu();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(returnFocusRef.current);
  });

  it('cierra con clic fuera pero no con clic dentro', () => {
    const { onClose } = mountMenu();
    const dialog = screen.getByRole('dialog');

    fireEvent.pointerDown(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reposiciona en los cuatro bordes para no desbordar el viewport', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: PANEL.width,
      height: PANEL.height,
      top: 0,
      left: 0,
      right: PANEL.width,
      bottom: PANEL.height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: VIEWPORT.width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: VIEWPORT.height });

    const maxX = VIEWPORT.width - PANEL.width - MARGIN;
    const maxY = VIEWPORT.height - PANEL.height - MARGIN;
    const cases = [
      { anchor: { x: maxX - 10, y: maxY - 10 }, left: maxX - 10, top: maxY - 10 },
      { anchor: { x: 0, y: 0 }, left: MARGIN, top: MARGIN },
      { anchor: { x: VIEWPORT.width, y: 0 }, left: maxX, top: MARGIN },
      { anchor: { x: 0, y: VIEWPORT.height }, left: MARGIN, top: maxY },
    ];

    for (const scenario of cases) {
      const { view } = mountMenu(scenario.anchor);
      const dialog = screen.getByRole('dialog');

      await waitFor(() => expect(dialog.style.left).toBe(`${scenario.left}px`));
      expect(dialog.style.top).toBe(`${scenario.top}px`);
      expect(Number.parseFloat(dialog.style.left)).toBeGreaterThanOrEqual(MARGIN);
      expect(Number.parseFloat(dialog.style.top)).toBeGreaterThanOrEqual(MARGIN);
      expect(Number.parseFloat(dialog.style.left)).toBeLessThanOrEqual(maxX);
      expect(Number.parseFloat(dialog.style.top)).toBeLessThanOrEqual(maxY);
      view.unmount();
    }
  });

  it('no tiene violaciones de axe-core', async () => {
    const { view } = mountMenu();

    const results = await axe.run(view.container, {
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
