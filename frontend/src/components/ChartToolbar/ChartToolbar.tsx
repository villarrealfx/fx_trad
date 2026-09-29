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
  /** Deshace el último cambio de dibujos (RF-213). */
  onUndo?: () => void;
  /** Rehace el último cambio deshecho (RF-213). */
  onRedo?: () => void;
  /** Habilita el botón de deshacer. */
  canUndo?: boolean;
  /** Habilita el botón de rehacer. */
  canRedo?: boolean;
  /** Deshabilita todas las acciones (p. ej. mientras carga). */
  disabled?: boolean;
}

/**
 * Barra de herramientas del gráfico (CMP-008, SCR-004).
 *
 * Agrupa los `DrawTool` (CMP-009) como `role="toolbar"` y las acciones de
 * deshacer/rehacer. Operable 100% por teclado; la herramienta activa se marca
 * con `aria-pressed`. "Ajustar vista" vive en el `ChartHeader` (CMP-017).
 */
export default function ChartToolbar({
  tools,
  active,
  onTool,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
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
        aria-label="Deshacer"
        title="Deshacer (Ctrl+Z)"
        disabled={disabled || !canUndo}
        onClick={onUndo}
      >
        <span aria-hidden="true">↶</span>
      </button>
      <button
        type="button"
        className="chart-toolbar__action"
        aria-label="Rehacer"
        title="Rehacer (Ctrl+Shift+Z)"
        disabled={disabled || !canRedo}
        onClick={onRedo}
      >
        <span aria-hidden="true">↷</span>
      </button>
    </div>
  );
}
