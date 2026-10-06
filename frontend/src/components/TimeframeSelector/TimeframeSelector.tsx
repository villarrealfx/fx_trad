import { useRef, type KeyboardEvent } from 'react';
import { TIMEFRAMES, type Timeframe } from '../../contracts/ohlc';
import './TimeframeSelector.css';

/** Props del selector de timeframe del gráfico (CMP-023, RF-406). */
export interface TimeframeSelectorProps {
  /** Timeframe activo. */
  value: Timeframe;
  /** Notifica el cambio de timeframe. */
  onChange: (timeframe: Timeframe) => void;
  /** Opciones a mostrar; por defecto, los seis timeframes del contrato. */
  options?: ReadonlyArray<Timeframe>;
  /** Deshabilita el control (p. ej. mientras carga la serie). */
  disabled?: boolean;
}

/**
 * Control segmentado con un único timeframe activo (CMP-023, RF-406).
 *
 * Patrón ARIA `radiogroup`: cada opción es un `radio` con `aria-checked` y solo
 * la activa es tabulable (roving tabindex); las flechas y `Home`/`End` mueven la
 * selección sin dar la vuelta en los extremos. El TF activo se marca con color
 * **y** con `aria-checked`, así que la información no depende solo del color.
 */
export default function TimeframeSelector({
  value,
  onChange,
  options = TIMEFRAMES,
  disabled = false,
}: TimeframeSelectorProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  /** Selecciona y enfoca el índice indicado, acotado a los extremos. */
  function selectAt(index: number): void {
    const clamped = Math.min(Math.max(index, 0), options.length - 1);
    const timeframe = options[clamped];
    if (timeframe === undefined) return;
    if (timeframe !== value) onChange(timeframe);
    buttonsRef.current[clamped]?.focus();
  }

  /** Navegación por teclado del grupo (roving tabindex). */
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        selectAt(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        selectAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        selectAt(0);
        break;
      case 'End':
        event.preventDefault();
        selectAt(options.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div className="timeframe-selector" role="radiogroup" aria-label="Timeframe">
      {options.map((timeframe, index) => {
        const selected = timeframe === value;
        return (
          <button
            key={timeframe}
            ref={(element) => {
              buttonsRef.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            className="timeframe-selector__option"
            data-active={selected}
            onClick={() => {
              if (!disabled && !selected) onChange(timeframe);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {timeframe}
          </button>
        );
      })}
    </div>
  );
}
