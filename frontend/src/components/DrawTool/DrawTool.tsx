import type { ReactNode } from 'react';
import './DrawTool.css';

/** Tipos de herramienta del gráfico (CMP-009, SCR-004). */
export type ChartToolType = 'line' | 'rect' | 'fib' | 'operation' | 'buy' | 'sell' | 'erase';

/** Props del botón de herramienta (CMP-009, `components.md`). */
export interface DrawToolProps {
  /** Herramienta que representa el botón. */
  type: ChartToolType;
  /** Indica si es la herramienta activa (se expone con `aria-pressed`). */
  active: boolean;
  /** Notifica la selección de la herramienta. */
  onSelect: (type: ChartToolType) => void;
  /** Ícono decorativo de la herramienta. */
  icon: ReactNode;
  /** Nombre accesible y tooltip (icon-only). */
  ariaLabel: string;
  /** Deshabilita el botón. */
  disabled?: boolean;
}

/**
 * Botón de herramienta de dibujo (CMP-009).
 *
 * Icon-only accesible: `aria-label` + `title` (tooltip) y estado activo con
 * `aria-pressed` (SCR-004). Target ≥ 24px con espaciado de `space-sm`.
 */
export default function DrawTool({
  type,
  active,
  onSelect,
  icon,
  ariaLabel,
  disabled = false,
}: DrawToolProps) {
  return (
    <button
      type="button"
      className="draw-tool"
      aria-pressed={active}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled}
      onClick={() => onSelect(type)}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
