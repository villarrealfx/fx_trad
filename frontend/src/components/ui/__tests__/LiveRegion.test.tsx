/**
 * Tests de la región live reutilizable (TASK-UI-201, ACC-201).
 *
 * Verifican el mapeo de `tone` a rol/`aria-live`, el estilo visually-hidden y
 * el comportamiento de `atomic`. Patrón AAA.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LiveRegion from '../LiveRegion';

describe('LiveRegion (CMP-020)', () => {
  afterEach(cleanup);

  it('anuncia en modo polite como status visually-hidden', () => {
    const { getByRole } = render(<LiveRegion message="Descarga completada" />);

    const region = getByRole('status');
    expect(region.textContent).toBe('Descarga completada');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(region.classList.contains('sr-only')).toBe(true);
  });

  it('anuncia en modo assertive como alert', () => {
    const { getByRole } = render(<LiveRegion message="Descarga fallida" tone="assertive" />);

    const region = getByRole('alert');
    expect(region.getAttribute('aria-live')).toBe('assertive');
  });

  it('permite desactivar aria-atomic', () => {
    const { getByRole } = render(<LiveRegion message="Cargando" atomic={false} />);

    expect(getByRole('status').getAttribute('aria-atomic')).toBe('false');
  });

  it('renderiza la región aunque el mensaje esté vacío', () => {
    const { getByRole } = render(<LiveRegion message="" />);

    expect(getByRole('status').textContent).toBe('');
  });
});
