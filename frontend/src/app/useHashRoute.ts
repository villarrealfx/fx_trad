import { useEffect, useState } from 'react';

/** Navega a un path de la aplicación (hash routing). */
export function navigate(path: string): void {
  window.location.hash = path;
}

/**
 * Reemplaza el hash actual **sin** apilar una entrada en el historial (ADR-030).
 *
 * `history.replaceState` no dispara `hashchange`, así que enriquecer la URL con
 * la selección efectiva no provoca un re-render ni un bucle de navegación.
 */
export function replaceRoute(path: string): void {
  window.history.replaceState(null, '', `#${path}`);
}

/** Lee el path del hash actual; `null` si el hash no es una ruta (`/…`). */
function readRouteHash(): string | null {
  const hash = window.location.hash.replace(/^#/, '');
  return hash.startsWith('/') ? hash : null;
}

/**
 * Hook de routing basado en `location.hash` (TASK-UI-003).
 *
 * Devuelve el path actual y reacciona a `hashchange`. Los hashes que no son
 * rutas (p. ej. el ancla del skip link `#main-content`) se ignoran, de modo
 * que la navegación por anclas no rompe la pantalla activa.
 *
 * @param fallback Ruta por defecto cuando no hay hash de ruta.
 */
export function useHashRoute(fallback: string): string {
  const [path, setPath] = useState(() => readRouteHash() ?? fallback);

  useEffect(() => {
    const onHashChange = (): void => {
      const next = readRouteHash();
      if (next !== null) setPath(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return path;
}
