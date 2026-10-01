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
import { OPERATION_TOKENS } from '../styles/tokens';
import { PRICE_FORMAT } from './axis-format';

/** Multiplicadores de objetivo, en unidades de riesgo `R` (RF-303, S-6). */
export const OPERATION_TP_MULTIPLIERS = OPERATION_TOKENS.tpMultipliers;

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

/** Nivel que entra al layout de etiquetas: clave y `y` proyectada (ADR-025). */
export interface OperationLabelInput {
  /** Clave estable del nivel. */
  key: OperationLevelKey;
  /** Coordenada y de la línea del nivel, en píxeles. */
  y: number;
}

/** Rango vertical visible (en píxeles) donde deben caber las cinco etiquetas. */
export interface OperationLabelArea {
  /** Borde superior visible. */
  top: number;
  /** Borde inferior visible. */
  bottom: number;
}

/** Etiqueta colocada: su `y` final y si necesita línea guía (ADR-025). */
export interface OperationLabelLayout {
  /** Clave del nivel al que pertenece. */
  key: OperationLevelKey;
  /** Coordenada y final del centro de la etiqueta. */
  y: number;
  /** `true` si la etiqueta se desplazó de su línea y necesita línea guía. */
  leader: boolean;
}

/**
 * Reparte las cinco etiquetas de la operación sin solapes (RNF-301, ADR-025).
 *
 * Recibe los niveles ya proyectados (ordenados de arriba abajo, `y` ascendente)
 * y los desplaza verticalmente para respetar una separación mínima; si la última
 * se sale por abajo, corrige el reparto hacia arriba para que las cinco quepan en
 * el área visible. Toda etiqueta cuya `y` final difiere de la de su línea lleva
 * línea guía. Función pura: no toca DOM ni canvas.
 *
 * @param levels Niveles proyectados, ordenados por `y` ascendente.
 * @param minGap Separación vertical mínima entre etiquetas, en píxeles.
 * @param area Rango vertical visible (`top`/`bottom`).
 * @returns Una posición final y el flag de guía por nivel, en el mismo orden.
 */
export function layoutOperationLabels(
  levels: ReadonlyArray<OperationLabelInput>,
  minGap: number,
  area: OperationLabelArea,
): OperationLabelLayout[] {
  if (levels.length === 0) return [];
  const placed = levels.map((level) => level.y);
  for (let i = 1; i < placed.length; i += 1) {
    placed[i] = Math.max(placed[i], placed[i - 1] + minGap);
  }
  const last = placed.length - 1;
  if (placed[last] > area.bottom) {
    placed[last] = area.bottom;
    for (let i = last - 1; i >= 0; i -= 1) {
      placed[i] = Math.min(placed[i], placed[i + 1] - minGap);
    }
  }
  return levels.map((level, index) => ({
    key: level.key,
    y: placed[index],
    leader: placed[index] !== level.y,
  }));
}

/** Orden de los niveles en el anuncio accesible: Entrada, SL y los tres TP. */
const OPERATION_ANNOUNCEMENT_ORDER: ReadonlyArray<OperationLevelKey> = [
  'entry',
  'sl',
  'tp1382',
  'tp15',
  'tp2',
];

/**
 * Construye el texto que anuncia una operación a lectores de pantalla (ACC-201).
 *
 * Deriva de `operationLevels` —la misma fuente que el render— para que el
 * anuncio y lo dibujado no puedan desincronizarse. En riesgo nulo
 * (`Entrada == SL`) devuelve el aviso de `zeroRisk` en lugar de los niveles.
 *
 * @param entry Precio de entrada.
 * @param sl Precio del stop loss.
 * @returns Texto en español listo para `LiveRegion`.
 */
export function operationAnnouncement(entry: number, sl: number): string {
  if (operationRisk(entry, sl) === 0) {
    return 'Atención: entrada y SL coinciden; R = 0.';
  }
  const direction = operationDirection(entry, sl) === 'buy' ? 'compra' : 'venta';
  const byKey = new Map(operationLevels(entry, sl).map((level) => [level.key, level]));
  const parts = OPERATION_ANNOUNCEMENT_ORDER.map((key) => {
    const level = byKey.get(key);
    if (level === undefined) return '';
    return `${level.label} ${level.price.toFixed(PRICE_FORMAT.precision)}`;
  });
  return `Operación ${direction}. ${parts.join(', ')}`;
}
