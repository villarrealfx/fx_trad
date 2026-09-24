/**
 * Escaneo de accesibilidad con axe-core (TASK-UI-004, ADR-011).
 *
 * Verifica roles, nombres accesibles y estructura del layout y la pantalla del
 * gráfico sin violaciones detectables. La regla `color-contrast` se desactiva
 * porque jsdom no resuelve el color computado; el contraste AA se cubre en
 * `src/styles/__tests__/tokens.test.ts` (contrast.ts).
 */
import axe from 'axe-core';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../components/ChartPane/ChartPane', async () => {
  const React = await import('react');
  return {
    default: React.forwardRef(function MockChartPane(_props: unknown, ref: unknown) {
      React.useImperativeHandle(ref as never, () => ({ compose: () => null }));
      return <div role="img" aria-label="Gráfico de velas EURUSD 1h" />;
    }),
  };
});

vi.mock('../components/IndicatorPanel/IndicatorPanel', () => ({
  default: () => <div data-testid="indicator-panel" />,
}));

vi.mock('../export', () => ({
  EXPORT_SCALES: [1, 2, 4],
  EXPORT_FORMATS: ['png', 'webp'],
  exportChartPng: vi.fn(),
  downloadBlob: vi.fn(),
}));

describe('accesibilidad (axe-core)', () => {
  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it('la shell y la pantalla del gráfico no tienen violaciones detectables', async () => {
    const { container } = render(<App />);

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
