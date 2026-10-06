/**
 * Entrada numérica de los precios de la operación (RF-410, CMP-025).
 *
 * Módulo puro: convierte el texto tecleado —que admite el separador decimal
 * local— en un precio redondeado a la precisión del activo y valida el par
 * Entrada/Stop Loss. No toca DOM ni React, de modo que el popover y sus tests
 * comparten una única fuente de verdad (RF-410).
 */
import { PRICE_FORMAT } from './axis-format';

/** Acepta un entero o un decimal con separador `.` o `,` y signo opcional. */
const PRICE_INPUT_PATTERN = /^[+-]?\d+(?:[.,]\d+)?$/;

/** Error inline de un valor que no es un número (micro-copia de RF-410). */
export const PRICE_ERROR_NOT_NUMBER = 'Introduce un número válido';

/** Error inline de riesgo nulo: `Entrada == SL` ⇒ `R = 0` (RF-410). */
export const PRICE_ERROR_ZERO_RISK = 'La entrada y el SL no pueden coincidir';

/** Errores inline por campo; la clave ausente significa campo válido. */
export interface OperationPriceErrors {
  /** Error del campo Entrada, si lo hay. */
  entry?: string;
  /** Error del campo Stop Loss, si lo hay. */
  stopLoss?: string;
}

/** Resultado de validar el par Entrada/Stop Loss del popover. */
export interface OperationPriceValidation {
  /** Entrada redondeada a la precisión del activo, o `null` si no es válida. */
  entry: number | null;
  /** Stop Loss redondeado a la precisión del activo, o `null` si no es válido. */
  stopLoss: number | null;
  /** Errores inline por campo. */
  errors: OperationPriceErrors;
  /** `true` solo si ambos campos son numéricos y `Entrada != SL`. */
  valid: boolean;
}

/**
 * Redondea un precio a la precisión del activo sin arrastrar ruido binario.
 *
 * @param value Precio a redondear.
 * @param decimals Decimales del activo (por defecto, la precisión de RF-207).
 * @returns El precio redondeado a `decimals` decimales.
 */
export function roundToDecimals(value: number, decimals: number = PRICE_FORMAT.precision): number {
  return Number(value.toFixed(decimals));
}

/**
 * Interpreta el texto de un campo de precio (RF-410).
 *
 * Admite espacios alrededor, signo y el separador decimal local (`,`), pero
 * rechaza lo que no sea un número decimal: vacío, `abc`, notación exponencial o
 * hexadecimal. Así `1.10000` y `1,10000` valen lo mismo y `1e3` no cuela.
 *
 * @param raw Texto tecleado por el usuario.
 * @returns El número interpretado, o `null` si el texto no es un precio válido.
 */
export function parsePriceInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!PRICE_INPUT_PATTERN.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Valida el par Entrada/Stop Loss del popover numérico (RF-410).
 *
 * Un campo no numérico recibe su error inline. El riesgo nulo
 * (`Entrada == SL`, `R = 0`) se asocia al **Stop Loss**, que es el ancla que
 * debe diferir de la entrada para que exista riesgo. La comparación se hace
 * sobre los precios ya redondeados a la precisión del activo, de modo que dos
 * textos distintos que representan el mismo precio sigan siendo `R = 0`.
 *
 * @param entryRaw Texto del campo Entrada.
 * @param stopLossRaw Texto del campo Stop Loss.
 * @param decimals Decimales del activo (por defecto, la precisión de RF-207).
 * @returns Precios redondeados, errores por campo y si el par es aplicable.
 */
export function validateOperationPrices(
  entryRaw: string,
  stopLossRaw: string,
  decimals: number = PRICE_FORMAT.precision,
): OperationPriceValidation {
  const parsedEntry = parsePriceInput(entryRaw);
  const parsedStopLoss = parsePriceInput(stopLossRaw);
  const errors: OperationPriceErrors = {};
  if (parsedEntry === null) errors.entry = PRICE_ERROR_NOT_NUMBER;
  if (parsedStopLoss === null) errors.stopLoss = PRICE_ERROR_NOT_NUMBER;
  const entry = parsedEntry === null ? null : roundToDecimals(parsedEntry, decimals);
  const stopLoss = parsedStopLoss === null ? null : roundToDecimals(parsedStopLoss, decimals);
  if (entry !== null && stopLoss !== null && entry === stopLoss) {
    errors.stopLoss = PRICE_ERROR_ZERO_RISK;
  }
  return {
    entry,
    stopLoss,
    errors,
    valid: errors.entry === undefined && errors.stopLoss === undefined,
  };
}
