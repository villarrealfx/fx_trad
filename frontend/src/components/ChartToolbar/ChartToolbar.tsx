import type { ReactNode } from 'react';
import DrawTool, { type ChartToolType } from '../DrawTool/DrawTool';
import './ChartToolbar.css';

/** Descriptor de una herramienta de la barra (CMP-008). */
export interface ChartToolDescriptor {
  type: ChartToolType;
  icon: ReactNode;
  label: string;
}

/** Props de la barra de herramientas (CMP-008, `components.md`). */
export interface ChartToolbarProps {
  /** Herramientas disponibles (agrupadas como `toolbar`). */
  tools: ReadonlyArray<ChartToolDescriptor>;
  /** Herramienta activa. */
  active: ChartToolType;
  /** Selecciona una herramienta. */
  onTool: (type: ChartToolType) => void;
  /** Ajusta la vista a toda la serie (atajo `1`). */
  onZoomFit: () => void;
  /** Deshabilita todas las acciones (p. ej. mientras carga). */
  disabled?: boolean;
}

/**
 * Barra de herramientas del gráfico (CMP-008, SCR-004).
 *
 * Agrupa los `DrawTool` (CMP-009) como `role="toolbar"` y añade la acción
 * "Ajustar vista". Operable 100% por teclado; la herramienta activa se marca
 * con `aria-pressed`.
 */
export default function ChartToolbar({
  tools,
  active,
  onTool,
  onZoomFit,
  disabled = false,
}: ChartToolbarProps) {
  return (
    <div className="chart-toolbar" role="toolbar" aria-label="Herramientas del gráfico">
      {tools.map((tool) => (
        <DrawTool
          key={tool.type}
          type={tool.type}
          icon={tool.icon}
          ariaLabel={tool.label}
          active={active === tool.type}
          onSelect={onTool}
          disabled={disabled}
        />
      ))}
      <button
        type="button"
        className="chart-toolbar__action"
        aria-label="Ajustar vista"
        title="Ajustar vista (1)"
        disabled={disabled}
        onClick={onZoomFit}
      >
        <span aria-hidden="true">⤢</span>
      </button>
    </div>
  );
}
