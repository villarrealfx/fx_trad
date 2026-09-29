/**
 * Escaneo de accesibilidad del formulario flotante de indicadores (TASK-UI-214).
 *
 * Usa axe-core sobre el popover real (abierto, con y sin indicadores) para
 * validar roles, nombres accesibles y estructura. La regla `color-contrast` se
 * desactiva porque jsdom no resuelve el color computado (el contraste AA se
 * cubre en `src/styles/__tests__/tokens.test.ts`). Patrón AAA.
 */
import axe from 'axe-core';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { IndicatorConfig } from '../../../indicators/config';
import IndicatorForm from '../IndicatorForm';

const CONFIGS: IndicatorConfig[] = [
  { id: 'ma-20', kind: 'MA', period: 20, visible: true },
  { id: 'rsi-14', kind: 'RSI', period: 14, visible: false },
];

/** Renderiza el popover abierto y devuelve el contenedor. */
function renderOpen(configs: ReadonlyArray<IndicatorConfig>): HTMLElement {
  const { container } = render(
    <IndicatorForm open configs={configs} onChange={() => {}} onClose={() => {}} />,
  );
  return container;
}

describe('IndicatorForm accesibilidad (axe-core)', () => {
  afterEach(cleanup);

  it('el popover con indicadores no tiene violaciones detectables', async () => {
    const container = renderOpen(CONFIGS);

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });

  it('el popover en estado vacío no tiene violaciones detectables', async () => {
    const container = renderOpen([]);

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
