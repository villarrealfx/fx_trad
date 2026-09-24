import './ProgressBar.css';

/** Estado de la barra de progreso (CMP-013). */
export type ProgressStatus = 'running' | 'paused' | 'complete';

/** Props de la barra de progreso (CMP-013, `components.md`). */
export interface ProgressBarProps {
  /** Porcentaje completado (0–100); se satura fuera de rango. */
  percent: number;
  /** Etiqueta visible y nombre accesible. */
  label?: string;
  /** Estado de la progresión (default `running`). */
  status?: ProgressStatus;
  /** Muestra el valor numérico junto a la label (default true). */
  showValue?: boolean;
}

/** Satura un porcentaje al rango [0, 100]. */
function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Barra de progreso determinista (CMP-013).
 *
 * Expone `role="progressbar"` con `aria-valuenow/min/max` (SCR-002) y el
 * estado running/paused/complete en `data-status`.
 */
export default function ProgressBar({
  percent,
  label,
  status = 'running',
  showValue = true,
}: ProgressBarProps) {
  const value = clampPercent(percent);
  return (
    <div className="progress" data-status={status}>
      {(label !== undefined || showValue) && (
        <div className="progress__header">
          {label !== undefined && <span className="progress__label">{label}</span>}
          {showValue && <span className="progress__value">{value}%</span>}
        </div>
      )}
      <div
        className="progress__track"
        role="progressbar"
        aria-label={label ?? 'Progreso'}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress__fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
