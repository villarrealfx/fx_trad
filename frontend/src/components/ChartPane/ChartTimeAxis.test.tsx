/**
 * Tests de la franja del eje X en dos filas (TASK-UI-407, RF-407).
 *
 * Verifican el render de las dos filas (fecha arriba, `hh:mm` abajo) con la
 * posición de cada marca, el caso vacío y que el **layout no se rompe**: la
 * franja es un ítem flex fijo de 40 px dentro de una columna, de modo que el
 * canvas cede el alto sin scroll (`design-system.md` §Franja del eje).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxisRows } from '../../charting/axis-format';
import ChartTimeAxis from './ChartTimeAxis';

afterEach(cleanup);

const ROWS: AxisRows = {
  top: [
    { time: 1, x: 40, label: '18-nov-25' },
    { time: 2, x: 200, label: '19-nov-25' },
  ],
  bottom: [
    { time: 1, x: 40, label: '00:15' },
    { time: 2, x: 200, label: '01:15' },
  ],
};

describe('ChartTimeAxis (TASK-UI-407, RF-407)', () => {
  it('renderiza la fecha en la fila superior y la hora en la inferior', () => {
    render(<ChartTimeAxis rows={ROWS} />);

    const axis = screen.getByTestId('chart-time-axis');
    const dateRow = axis.querySelector('[data-row="date"]');
    const timeRow = axis.querySelector('[data-row="time"]');

    expect(dateRow?.querySelectorAll('.chart-time-axis__tick')).toHaveLength(2);
    expect(timeRow?.querySelectorAll('.chart-time-axis__tick')).toHaveLength(2);
    expect(dateRow?.textContent).toBe('18-nov-2519-nov-25');
    expect(timeRow?.textContent).toBe('00:1501:15');
  });

  it('coloca cada marca en su coordenada horizontal', () => {
    render(<ChartTimeAxis rows={ROWS} />);

    const ticks = screen.getByTestId('chart-time-axis').querySelectorAll('.chart-time-axis__tick');

    expect((ticks[0] as HTMLElement).style.left).toBe('40px');
    expect((ticks[1] as HTMLElement).style.left).toBe('200px');
  });

  it('no rompe la franja cuando no hay marcas', () => {
    render(<ChartTimeAxis rows={{ top: [], bottom: [] }} />);

    const axis = screen.getByTestId('chart-time-axis');
    expect(axis.querySelector('[data-row="date"]')?.textContent).toBe('');
    expect(axis.querySelector('[data-row="time"]')?.textContent).toBe('');
  });

  it('la franja es un ítem flex fijo de 40 px: el canvas cede el alto sin scroll', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/components/ChartPane/ChartPane.css'),
      'utf8',
    );

    expect(css).toMatch(/\.chart-pane__time-axis\s*\{[^}]*flex:\s*0 0 40px;/s);
    // El contenedor es una columna: host flexible + franja fija, sin scroll.
    expect(css).toMatch(/\.chart-pane__graph\s*\{[^}]*display:\s*flex;/s);
    expect(css).toMatch(/\.chart-pane__graph\s*\{[^}]*flex-direction:\s*column;/s);
    expect(css).toMatch(/\.chart-pane__host\s*\{[^}]*flex:\s*1;/s);
  });
});
