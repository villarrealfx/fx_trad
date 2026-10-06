/**
 * Tests del header del gráfico (TASK-UI-210, CMP-017).
 *
 * Verifican el título, las tres acciones, el estado `aria-expanded` de
 * indicadores, el modo deshabilitado y la accesibilidad de los botones
 * icon-only. Patrón AAA.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import ChartHeader from '../ChartHeader';

/** Props por defecto con espías de acción. */
function renderHeader(overrides: Partial<ComponentProps<typeof ChartHeader>> = {}) {
  const handlers = {
    onOpenIndicators: vi.fn(),
    onExport: vi.fn(),
    onFit: vi.fn(),
  };
  render(
    <ChartHeader
      symbol="EURUSD"
      timeframe="1h"
      indicatorsOpen={false}
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe('ChartHeader (CMP-017)', () => {
  afterEach(cleanup);

  it('muestra el símbolo y el timeframe', () => {
    renderHeader();

    expect(screen.getByText('EURUSD · 1h')).toBeTruthy();
  });

  it('expone el estado abierto de indicadores con aria-expanded', () => {
    renderHeader({ indicatorsOpen: true });

    expect(screen.getByRole('button', { name: /Indicadores/ }).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('invoca las tres acciones', () => {
    const handlers = renderHeader();

    fireEvent.click(screen.getByRole('button', { name: /Indicadores/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar vista' }));

    expect(handlers.onOpenIndicators).toHaveBeenCalledTimes(1);
    expect(handlers.onExport).toHaveBeenCalledTimes(1);
    expect(handlers.onFit).toHaveBeenCalledTimes(1);
  });

  it('da nombre accesible a los botones icon-only', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: 'Exportar' }).getAttribute('title')).toBe('Exportar');
    expect(screen.getByRole('button', { name: 'Ajustar vista' }).getAttribute('title')).toBe(
      'Ajustar vista (1)',
    );
  });

  it('deshabilita todas las acciones cuando se pide', () => {
    renderHeader({ disabled: true });

    for (const name of [/Indicadores/, 'Exportar', 'Ajustar vista']) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true);
    }
  });
});

describe('ChartHeader · selector de timeframe (TASK-UI-403, RF-406)', () => {
  afterEach(cleanup);

  it('no muestra el selector si no se puede cambiar de escala', () => {
    renderHeader();

    expect(screen.queryByRole('radiogroup', { name: 'Timeframe' })).toBeNull();
  });

  it('aloja el selector y notifica el timeframe elegido', () => {
    const onChangeTimeframe = vi.fn();
    renderHeader({ onChangeTimeframe });

    fireEvent.click(screen.getByRole('radio', { name: '15m' }));

    expect(onChangeTimeframe).toHaveBeenCalledWith('15m');
    expect(screen.getByRole('radio', { name: '1h' }).getAttribute('aria-checked')).toBe('true');
  });

  it('deshabilita el selector mientras el gráfico no está listo', () => {
    renderHeader({ onChangeTimeframe: vi.fn(), disabled: true });

    expect((screen.getByRole('radio', { name: '15m' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
