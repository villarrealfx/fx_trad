import type { ReactNode } from 'react';
import type { AppRoute } from '../../app/routes';
import './AppShell.css';

/** Props del layout principal (TASK-UI-003). */
export interface AppShellProps {
  /** Rutas de navegación. */
  routes: ReadonlyArray<AppRoute>;
  /** Path activo (resalta la ruta actual). */
  activePath: string;
  /** Navega a una ruta. */
  onNavigate: (path: string) => void;
  /** Contenido de la pantalla activa. */
  children: ReactNode;
}

/**
 * Layout principal de la aplicación (TASK-UI-003, SCR-001…006).
 *
 * Appbar de 48px con marca y navegación, skip link a `#main-content`
 * (WCAG 2.4.1) y un único `main` que renderiza la pantalla activa
 * (single-window, RNF-005).
 */
export default function AppShell({ routes, activePath, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="app-shell__skip" href="#main-content">
        Saltar al contenido
      </a>
      <header className="app-shell__appbar">
        <h1 className="app-shell__brand">fxtrad</h1>
        <nav className="app-shell__nav" aria-label="Navegación principal">
          {routes.map((route) => (
            <a
              key={route.path}
              className="app-shell__link"
              href={`#${route.path}`}
              aria-current={activePath === route.path ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(route.path);
              }}
            >
              {route.label}
            </a>
          ))}
        </nav>
      </header>
      <main id="main-content" className="app-shell__main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
