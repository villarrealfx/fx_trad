import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppShell from '../AppShell';

const ROUTES = [
  { path: '/assets', screen: 'SCR-001' as const, label: 'Biblioteca' },
  { path: '/chart', screen: 'SCR-004' as const, label: 'Gráfico' },
];

describe('AppShell (TASK-UI-003)', () => {
  afterEach(cleanup);

  it('renders the appbar, the skip link and the main landmark', () => {
    render(
      <AppShell routes={ROUTES} activePath="/chart" onNavigate={() => {}}>
        contenido
      </AppShell>,
    );

    expect(screen.getByRole('heading', { name: 'fxtrad' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Saltar al contenido' }).getAttribute('href')).toBe(
      '#main-content',
    );
    const main = screen.getByRole('main');
    expect(main).toBeTruthy();
    // El destino del skip link debe ser enfocable programáticamente (WCAG 2.4.1).
    expect(main.getAttribute('tabindex')).toBe('-1');
  });

  it('marks the active route with aria-current', () => {
    render(
      <AppShell routes={ROUTES} activePath="/chart" onNavigate={() => {}}>
        contenido
      </AppShell>,
    );

    expect(screen.getByRole('link', { name: 'Gráfico' }).getAttribute('aria-current')).toBe('page');
    expect(
      screen.getByRole('link', { name: 'Biblioteca' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('navigates when a route link is pressed', () => {
    const onNavigate = vi.fn();
    render(
      <AppShell routes={ROUTES} activePath="/chart" onNavigate={onNavigate}>
        contenido
      </AppShell>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Biblioteca' }));

    expect(onNavigate).toHaveBeenCalledWith('/assets');
  });
});
