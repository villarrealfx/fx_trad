import type { KeyboardEvent } from 'react';
import './Tab.css';

/** Pestaña de un `Tab` (activo · timeframe). */
export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

/** Props de la barra de pestañas (CMP-011, `components.md`). */
export interface TabProps {
  /** Pestañas disponibles (activo + timeframe). */
  tabs: ReadonlyArray<TabItem>;
  /** Id de la pestaña activa. */
  active: string;
  /** Cambia la pestaña activa. */
  onChange: (id: string) => void;
  /** Añade una pestaña (opcional); si falta, no se muestra el botón. */
  onAdd?: () => void;
  /** Deshabilita el botón de añadir (p. ej. al alcanzar el tope). */
  addDisabled?: boolean;
  /** Tooltip del botón de añadir (p. ej. "Máximo 3 paneles"). */
  addTitle?: string;
  /** Cierra una pestaña (opcional). */
  onRemove?: (id: string) => void;
  /** Nombre accesible del `tablist`. */
  label?: string;
}

/**
 * Barra de pestañas accesible (CMP-011, SCR-005).
 *
 * Sigue el patrón WAI-ARIA `tablist`/`tab` con navegación por flechas
 * (Home/End incluidos) y `aria-selected`; admite añadir/cerrar pestañas.
 */
export default function Tab({
  tabs,
  active,
  onChange,
  onAdd,
  addDisabled = false,
  addTitle,
  onRemove,
  label,
}: TabProps) {
  /** Mueve la selección entre pestañas habilitadas con el teclado. */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const enabled = tabs.filter((tab) => tab.disabled !== true);
    if (enabled.length === 0) return;
    const currentIndex = enabled.findIndex((tab) => tab.id === active);
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const next = enabled[(currentIndex + delta + enabled.length) % enabled.length];
      if (next !== undefined) onChange(next.id);
    } else if (event.key === 'Home') {
      event.preventDefault();
      if (enabled[0] !== undefined) onChange(enabled[0].id);
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = enabled[enabled.length - 1];
      if (last !== undefined) onChange(last.id);
    }
  }

  return (
    <div className="tab" role="tablist" aria-label={label ?? 'Gráficos'} onKeyDown={handleKeyDown}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <div className="tab__item" key={tab.id} data-active={isActive}>
            <button
              type="button"
              role="tab"
              className="tab__button"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
            {onRemove !== undefined && (
              <button
                type="button"
                className="tab__remove"
                aria-label={`Cerrar ${tab.label}`}
                disabled={tab.disabled}
                onClick={() => onRemove(tab.id)}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
      {onAdd !== undefined && (
        <button
          type="button"
          className="tab__add"
          aria-label="Añadir gráfico"
          title={addTitle}
          disabled={addDisabled}
          onClick={onAdd}
        >
          +
        </button>
      )}
    </div>
  );
}
