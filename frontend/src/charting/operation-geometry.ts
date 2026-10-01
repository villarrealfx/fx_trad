/**
 * Geometría pura de la herramienta de operación (RF-301…RF-305, ADR-022).
 *
 * Una operación se define con dos anclas de precio: la primera es la **Entrada**
 * y la segunda el **Stop Loss**. Todo lo demás —dirección, riesgo `R` y los tres
 * objetivos— se **deriva** aquí, sin DOM ni canvas, para poder verificarlo con
 * tests unitarios (RF-303, RF-305). La forma persistida solo guarda las dos
 * anclas (ADR-022, ADR-023), de modo que este módulo es la única fuente de los
 * valores calculados.
 *
 * Los cinco niveles visibles son SL, Entrada, TP 1.382, TP 1.5 y TP 2. La
 * referencia 1:1 **no** forma parte del conjunto visible (RF-304, D-3).
 */

/** Multiplicadores de objetivo, en unidades de riesgo `R` (RF-303, S-6). */
export const OPERATION_TP_MULTIPLIERS = [1.382, 1.5, 2] as const;

/** Dirección de la operación, deducida de las anclas (RF-302). */
export type OperationDirection = 'buy' | 'sell';

/** Clave estable de cada uno de los cinco niveles visibles (RF-303/RF-304). */
export type OperationLevelKey = 'sl' | 'entry' | 'tp1382' | 'tp15' | 'tp2';

/** Rol cromático del nivel, resuelto a token por el render (RF-309, ADR-024). */
export type OperationColorRole = 'sl' | 'entry' | 'tp';

/** Nivel derivado: nombre, precio y rol de color (RI-301, RF-308). */
export interface OperationLevel {
  /** Clave estable del nivel. */
  key: OperationLevelKey;
  /** Nombre visible del nivel, en español (RF-308). */
  label: string;
  /** Precio derivado del nivel. */
  price: number;
  /** Multiplicador de riesgo; `null` en SL y Entrada. */
  multiplier: number | null;
  /** Rol de color que el render resuelve a token (ADR-024). */
  colorRole: OperationColorRole;
}

/** Definición base de cada nivel, en orden semántico y sin precio aún. */
const OPERATION_LEVEL_DEFINITIONS: ReadonlyArray<Omit<OperationLevel, 'price'>> = [
  { key: 'sl', label: 'SL', multiplier: null, colorRole: 'sl' },
  { key: 'entry', label: 'Entrada', multiplier: null, colorRole: 'entry' },
  { key: 'tp1382', label: 'TP 1.382', multiplier: OPERATION_TP_MULTIPLIERS[0], colorRole: 'tp' },
  { key: 'tp15', label: 'TP 1.5', multiplier: OPERATION_TP_MULTIPLIERS[1], colorRole: 'tp' },
  { key: 'tp2', label: 'TP 2', multiplier: OPERATION_TP_MULTIPLIERS[2], colorRole: 'tp' },
];

/**
 * Deduce la dirección de la operación comparando Entrada y SL (RF-302).
 *
 * Entrada por encima del SL es una Compra (Long); por debajo, una Venta
 * (Short). En riesgo nulo (`Entrada == SL`) no hay dirección real: se desempata
 * a Compra para que el anuncio accesible nunca quede sin valor.
 *
 * @param entry Precio de entrada.
 * @param sl Precio del stop loss.
 * @returns `'buy'` o `'sell'`.
 */
export function operationDirection(entry: number, sl: number): OperationDirection {
  return entry >= sl ? 'buy' : 'sell';
}

/**
 * Calcula el riesgo `R` como la distancia absoluta Entrada–SL (RF-303).
 *
 * @param entry Precio de entrada.
 * @param sl Precio del stop loss.
 * @returns Distancia en precio; `0` si ambos coinciden.
 */
export function operationRisk(entry: number, sl: number): number {
  return Math.abs(entry - sl);
}

/** Precio derivado de un nivel según dirección y riesgo. */
function operationLevelPrice(
  definition: Omit<OperationLevel, 'price'>,
  entry: number,
  sl: number,
  risk: number,
  direction: OperationDirection,
): number {
  if (definition.key === 'sl') return sl;
  if (definition.key === 'entry') return entry;
  const sign = direction === 'buy' ? 1 : -1;
  return entry + sign * (definition.multiplier ?? 0) * risk;
}

/**
 * Deriva los cinco niveles visibles de la operación (RF-303, RF-304).
 *
 * Cada nivel parte de su precio proyectado y el resultado se ordena por precio
 * **de mayor a menor** (contrato de `layoutOperationLabels`, ADR-025). En riesgo
 * nulo (`Entrada == SL`) los cinco precios coinciden y las operaciones siguen
 * siendo finitas: no aparecen `NaN`.
 *
 * @param entry Precio de entrada.
 * @param sl Precio del stop loss.
 * @returns Cinco niveles ordenados por precio descendente; nunca incluye el 1:1.
 */
export function operationLevels(entry: number, sl: number): OperationLevel[] {
  const direction = operationDirection(entry, sl);
  const risk = operationRisk(entry, sl);
  const levels = OPERATION_LEVEL_DEFINITIONS.map((definition) => ({
    ...definition,
    price: operationLevelPrice(definition, entry, sl, risk, direction),
  }));
  return levels.sort((a, b) => b.price - a.price);
}
