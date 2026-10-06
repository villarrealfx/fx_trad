import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { PRICE_FORMAT } from '../../charting/axis-format';
import { validateOperationPrices } from '../../charting/operation-price-input';
import Button from '../ui/Button';
import Input from '../ui/Input';
import './OperationNumericFields.css';

/** Punto de anclaje del popover dentro de su contenedor posicionado. */
export interface OperationNumericAnchor {
  /** Coordenada horizontal en píxeles. */
  x: number;
  /** Coordenada vertical en píxeles. */
  y: number;
}

/** Props del popover de precios de la operación (CMP-025, RF-410). */
export interface OperationNumericFieldsProps {
  /** Precio de entrada actual de la figura seleccionada. */
  entry: number;
  /** Precio de stop loss actual de la figura seleccionada. */
  stopLoss: number;
  /** Decimales del activo (por defecto, la precisión de RF-207). */
  decimals?: number;
  /** Confirma los precios redondeados a la precisión del activo. */
  onApply: (entry: number, stopLoss: number) => void;
  /** Cancela la edición sin tocar la figura. */
  onCancel: () => void;
  /** Anclaje del popover a la figura seleccionada (si se omite, usa el CSS). */
  anchor?: OperationNumericAnchor;
  /** Elemento que recupera el foco al cerrar (la figura, RF-410). */
  returnFocusRef?: RefObject<HTMLElement>;
}

/**
 * Popover numérico anclado a la figura seleccionada (CMP-025, RF-410).
 *
 * Dos campos con **label visible** (`Entrada`, `Stop Loss`) y `inputMode`
 * decimal. La validación es inline (`role="alert"` asociado al campo) y
 * `Aplicar` permanece deshabilitado mientras el valor no sea numérico o
 * `Entrada == SL` (`R = 0`). `Tab` pasa de Entrada a Stop Loss, `Enter` aplica
 * y `Escape` cancela devolviendo el foco a la figura. El popover atrapa el foco
 * mientras está abierto (regla de composición de `components.md`).
 */
export default function OperationNumericFields({
  entry,
  stopLoss,
  decimals = PRICE_FORMAT.precision,
  onApply,
  onCancel,
  anchor,
  returnFocusRef,
}: OperationNumericFieldsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [entryText, setEntryText] = useState(() => entry.toFixed(decimals));
  const [stopLossText, setStopLossText] = useState(() => stopLoss.toFixed(decimals));
  const validation = useMemo(
    () => validateOperationPrices(entryText, stopLossText, decimals),
    [entryText, stopLossText, decimals],
  );

  // Al abrir, el primer campo (Entrada) recibe el foco (estado `editing-prices`).
  useEffect(() => {
    containerRef.current?.querySelector('input')?.focus();
  }, []);

  /** Cierra el popover devolviendo el foco a la figura (estado `cancelled`). */
  function cancel(): void {
    returnFocusRef?.current?.focus();
    onCancel();
  }

  /** Confirma la edición solo si el par es válido (estado `committed`). */
  function apply(): void {
    if (!validation.valid || validation.entry === null || validation.stopLoss === null) return;
    onApply(validation.entry, validation.stopLoss);
  }

  /** Elementos tabulables del popover, en orden de documento. */
  function focusableElements(): HTMLElement[] {
    const container = containerRef.current;
    if (container === null) return [];
    return Array.from(container.querySelectorAll<HTMLElement>('input, button:not([disabled])'));
  }

  /** Mantiene el foco dentro del popover al recorrer con `Tab`/`Shift+Tab`. */
  function trapFocus(event: KeyboardEvent<HTMLDivElement>): void {
    const items = focusableElements();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Atajos del popover: `Escape` cancela, `Enter` aplica y `Tab` cicla. */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      apply();
      return;
    }
    if (event.key === 'Tab') trapFocus(event);
  }

  return (
    <div
      ref={containerRef}
      className="operation-numeric-fields"
      role="dialog"
      aria-label="Precios de la operación"
      style={anchor === undefined ? undefined : { left: anchor.x, top: anchor.y }}
      onKeyDown={handleKeyDown}
    >
      <h2 className="operation-numeric-fields__title">Precios de la operación</h2>
      <Input
        label="Entrada"
        value={entryText}
        onChange={setEntryText}
        inputMode="decimal"
        error={validation.errors.entry}
      />
      <Input
        label="Stop Loss"
        value={stopLossText}
        onChange={setStopLossText}
        inputMode="decimal"
        error={validation.errors.stopLoss}
      />
      <div className="operation-numeric-fields__actions">
        <Button label="Aplicar" onClick={apply} disabled={!validation.valid} />
        <Button label="Cancelar" variant="ghost" onClick={cancel} />
      </div>
    </div>
  );
}
