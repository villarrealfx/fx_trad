/**
 * Tokens del design system (TASK-UI-000, EP-UI-000).
 *
 * Fuente única de verdad de los tokens de `_docs/ux/design-system.md`, en
 * formato consumible desde TypeScript. El canvas (lightweight-charts y el
 * overlay de dibujos) no puede leer `var()` de CSS, por lo que los valores
 * viven aquí y `tokens.css` los refleja como custom properties. Un test de
 * anti-drift verifica que ambos ficheros coincidan.
 *
 * Dark-first: único tema del MVP (design-system.md §3).
 */

/** Tokens de color (dark único). */
export const COLOR_TOKENS = {
  bg: '#0A0C10',
  surface: '#161B22',
  border: '#30363D',
  text: '#E6EDF3',
  textMuted: '#8B949E',
  up: '#26A69A',
  down: '#EF5350',
  warning: '#C9B458',
  focus: '#58A6FF',
  drawLine: '#4A6572',
  drawRect: '#D6C7AE',
  drawFib: '#DDB2AC',
  popoverBg: '#161B22',
  popoverBorder: '#30363D',
} as const;

/** Roles de color usados por los dibujos del overlay (RF-209). */
export const DRAWING_COLOR_ROLES = ['drawLine', 'drawRect', 'drawFib'] as const;

/** Colores de dibujo accesibles como mapa listo para el chart (RF-209). */
export const DRAWING_COLORS = {
  line: COLOR_TOKENS.drawLine,
  rect: COLOR_TOKENS.drawRect,
  fib: COLOR_TOKENS.drawFib,
} as const;

/** Familia tipográfica base (Inter con fallback a system-ui). */
export const FONT_FAMILY = 'Inter, system-ui, sans-serif';

/** Tokens tipográficos (tamaño y peso por rol). */
export const TYPOGRAPHY_TOKENS = {
  h1: { fontSize: '24px', fontWeight: '700' },
  h2: { fontSize: '16px', fontWeight: '600' },
  body: { fontSize: '14px', fontWeight: '400' },
  small: { fontSize: '12px', fontWeight: '400' },
  num: { fontSize: '12px', fontWeight: '500' },
} as const;

/** Escala de espaciado (base 8). */
export const SPACING_TOKENS = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const;

/** Radios de borde. */
export const RADIUS_TOKENS = {
  sm: '4px',
  md: '6px',
} as const;

/** Sombras. */
export const SHADOW_TOKENS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
  modal: '0 12px 32px rgba(0, 0, 0, 0.6)',
  popover: '0 8px 24px rgba(0, 0, 0, 0.5)',
} as const;

/**
 * Formato de los ejes del gráfico (RF-206, RF-207).
 *
 * `priceDecimals` fija la precisión del eje Y; `priceSide` lo ubica a la
 * derecha (vista de usuario); `xFormat` combina día + hora:minuto de apertura
 * de la vela; `xTick` es la separación de marcas del eje X.
 */
export const AXIS_TOKENS = {
  priceDecimals: 5,
  priceSide: 'right',
  xFormat: '{día} {HH:mm}',
  xTick: '15m',
} as const;

/**
 * Offset de las marcas de compra/venta en pips (RF-208).
 *
 * `offsetPips` es la distancia estándar; `pipValue` y `pipValueJpy` son el
 * valor de un pip según el par (JPY usa `0.01`, el resto `0.0001`).
 */
export const MARKER_TOKENS = {
  offsetPips: 10,
  pipValue: 0.0001,
  pipValueJpy: 0.01,
} as const;

/**
 * Iconografía (RF-211).
 *
 * `set` documenta la librería (Lucide, MIT, costo $0 — RNF-006); `sizes`
 * define los tamaños por contexto (toolbar, controles, CTA).
 */
export const ICON_TOKENS = {
  set: 'lucide',
  sizes: {
    sm: '16px',
    md: '20px',
    lg: '24px',
  },
} as const;

/** Nombre de la custom property CSS de un token de color. */
export function colorVar(name: keyof typeof COLOR_TOKENS): string {
  const kebab = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return `var(--color-${kebab})`;
}
