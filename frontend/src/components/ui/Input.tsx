import { useId } from 'react';
import './field.css';

/** Props del campo de texto o fecha (CMP-002, `components.md`). */
export interface InputProps {
  /** Etiqueta visible; siempre asociada al control (a11y). */
  label: string;
  /** Valor actual del campo. */
  value: string;
  /** Notifica el cambio con el nuevo valor. */
  onChange: (value: string) => void;
  /** Tipo de input (texto o fecha). */
  type?: 'text' | 'date';
  /** Modo de teclado (variante numérica de CMP-025, RF-410). */
  inputMode?: 'text' | 'decimal' | 'numeric';
  /** Mensaje de error inline; marca `aria-invalid` y `role="alert"`. */
  error?: string;
  /** Deshabilita el campo. */
  disabled?: boolean;
  /** Id del control (por defecto generado). */
  id?: string;
  /** Nombre del campo en el formulario. */
  name?: string;
  /** Fecha mínima (ISO `YYYY-MM-DD`) para type=date. */
  min?: string;
  /** Fecha máxima (ISO `YYYY-MM-DD`) para type=date. */
  max?: string;
  /** Placeholder (nunca sustituye a la label). */
  placeholder?: string;
}

/**
 * Campo de entrada etiquetado (CMP-002).
 *
 * Estados default/focus/error/disabled según `components.md`; el error se
 * muestra inline y se anuncia con `role="alert"` (a11y 3.3.1).
 */
export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  error,
  disabled = false,
  id,
  name,
  min,
  max,
  placeholder,
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hasError = error !== undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className={`field__input${hasError ? ' field__input--error' : ''}`}
        type={type}
        inputMode={inputMode}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hasError && (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
