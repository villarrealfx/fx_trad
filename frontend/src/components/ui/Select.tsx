import { useId } from 'react';
import './field.css';

/** Opción de un `Select`. */
export interface SelectOption {
  value: string;
  label: string;
}

/** Props del desplegable etiquetado (CMP-003, `components.md`). */
export interface SelectProps {
  /** Etiqueta visible; siempre asociada al control. */
  label: string;
  /** Opciones disponibles. */
  options: ReadonlyArray<SelectOption>;
  /** Valor actual. */
  value: string;
  /** Notifica la selección. */
  onChange: (value: string) => void;
  /** Mensaje de error inline. */
  error?: string;
  /** Deshabilita el control. */
  disabled?: boolean;
  /** Id del control (por defecto generado). */
  id?: string;
  /** Nombre del campo en el formulario. */
  name?: string;
}

/**
 * Desplegable etiquetado (CMP-003).
 *
 * Estados default/focus/error/disabled; el placeholder se ofrece como opción
 * vacía y la label visible nunca se sustituye por él (a11y).
 */
export default function Select({
  label,
  options,
  value,
  onChange,
  error,
  disabled = false,
  id,
  name,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const hasError = error !== undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        className={`field__select${hasError ? ' field__select--error' : ''}`}
        value={value}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasError && (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
