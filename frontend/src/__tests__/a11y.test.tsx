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

vi.mock('../components/IndicatorForm/IndicatorForm', () => ({
  default: () => <div data-testid="indicator-form" />,
}));

vi.mock('../export', () => ({
  EXPORT_SCALES: [1, 2, 4],
  EXPORT_FORMATS: ['png', 'webp'],
  exportChartPng: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock('../services/downloads', () => ({
  requestDownload: vi.fn(),
  fetchDownloadStatus: vi.fn(),
  fetchDownloadHistory: vi.fn().mockResolvedValue([]),
  DownloadError: class extends Error {},
}));

vi.mock('../services/assets', () => ({
  fetchAssets: vi.fn().mockResolvedValue([
    {
      symbol: 'EURUSD',
      type: 'forex',
      coverage_start: 1725580800,
      coverage_end: 1788134399,
      status: 'completo',
    },
  ]),
  AssetsError: class extends Error {},
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

  it('la pantalla de descarga no tiene violaciones detectables', async () => {
    window.location.hash = '#/downloads';
    const { container } = render(<App />);

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });

  it('la biblioteca de activos no tiene violaciones detectables', async () => {
    window.location.hash = '#/assets';
    const { container } = render(<App />);

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });

  it('el selector de gráfico no tiene violaciones detectables', async () => {
    window.location.hash = '#/open';
    const { container } = render(<App />);

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
