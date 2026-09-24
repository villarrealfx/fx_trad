import Input from './Input';
import './DateRange.css';

/** Valor del rango de fechas (ISO `YYYY-MM-DD`). */
export interface DateRangeValue {
  start: string;
  end: string;
}

/** Props del rango de fechas (CMP-005, `components.md`). */
export interface DateRangeProps {
  /** Fecha de inicio (ISO). */
  start: string;
  /** Fecha de fin (ISO). */
  end: string;
  /** Cota inferior de cobertura (ISO). */
  min?: string;
  /** Cota superior de cobertura (ISO). */
  max?: string;
  /** Notifica cualquier cambio del rango completo. */
  onChange: (value: DateRangeValue) => void;
}

/** Estado visual del rango (interaction-specs SCR-002/003). */
export type DateRangeState = 'default' | 'partial' | 'error';

/** Error de la fecha de inicio si queda por debajo de la cobertura. */
function startBoundError(start: string, min?: string): string | undefined {
  if (min !== undefined && start !== '' && start < min) {
    return 'La fecha de inicio está fuera de la cobertura';
  }
  return undefined;
}

/** Error de la fecha de fin si queda por encima de la cobertura. */
function endBoundError(end: string, max?: string): string | undefined {
  if (max !== undefined && end !== '' && end > max) {
    return 'La fecha de fin está fuera de la cobertura';
  }
  return undefined;
}

/**
 * Rango de fechas con validación inline (CMP-005).
 *
 * Reutiliza `Input` (CMP-002) y valida `inicio > fin` y fuera de cobertura
 * (`min`/`max`), exponiendo el estado default/partial/error en `data-state`.
 */
export default function DateRange({ start, end, min, max, onChange }: DateRangeProps) {
  const orderError =
    start !== '' && end !== '' && start > end
      ? 'La fecha de inicio debe ser anterior o igual a la de fin'
      : undefined;
  const startError = startBoundError(start, min);
  const endError = orderError ?? endBoundError(end, max);
  const hasError = startError !== undefined || endError !== undefined;
  const hasStart = start !== '';
  const hasEnd = end !== '';
  const state: DateRangeState = hasError ? 'error' : hasStart !== hasEnd ? 'partial' : 'default';

  return (
    <div className="date-range" data-state={state}>
      <Input
        label="Fecha de inicio"
        type="date"
        value={start}
        min={min}
        max={max}
        error={startError}
        onChange={(value) => onChange({ start: value, end })}
      />
      <Input
        label="Fecha de fin"
        type="date"
        value={end}
        min={min}
        max={max}
        error={endError}
        onChange={(value) => onChange({ start, end: value })}
      />
      {state === 'partial' && <p className="date-range__note">Rango incompleto</p>}
    </div>
  );
}
