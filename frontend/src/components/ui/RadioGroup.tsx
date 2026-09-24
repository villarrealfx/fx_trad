import './RadioGroup.css';

/** Opción de un `RadioGroup`. */
export interface RadioOption {
  value: string;
  label: string;
}

/** Props del grupo de radios en línea (CMP-004, `components.md`). */
export interface RadioGroupProps {
  /** Nombre del grupo (agrupa los radios). */
  name: string;
  /** Opciones disponibles. */
  options: ReadonlyArray<RadioOption>;
  /** Valor seleccionado. */
  value: string;
  /** Notifica la selección. */
  onChange: (value: string) => void;
  /** Leyenda visible del grupo; si falta se usa `name` como nombre accesible. */
  legend?: string;
  /** Deshabilita todas las opciones. */
  disabled?: boolean;
}

/**
 * Grupo de botones de opción en línea (CMP-004).
 *
 * Usa `fieldset`/`legend` para agrupar y etiquetar (a11y 1.3.1); estados
 * default/focus/disabled. La selección se anuncia con el patrón nativo radio.
 */
export default function RadioGroup({
  name,
  options,
  value,
  onChange,
  legend,
  disabled = false,
}: RadioGroupProps) {
  return (
    <fieldset
      className="radio-group"
      disabled={disabled}
      aria-label={legend === undefined ? name : undefined}
    >
      {legend !== undefined && <legend className="radio-group__legend">{legend}</legend>}
      <div className="radio-group__options">
        {options.map((option) => {
          const optionId = `${name}-${option.value}`;
          return (
            <label className="radio-group__option" key={option.value} htmlFor={optionId}>
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={disabled}
                onChange={() => onChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
