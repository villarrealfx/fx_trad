/**
 * Utilidades de contraste WCAG 2.1 (TASK-UI-000, `accessibility.md`).
 *
 * Calcula la luminancia relativa y el ratio de contraste entre dos colores
 * para verificar los mínimos AA (4.5:1 texto normal, 3:1 texto grande / UI).
 * Se usa en los tests de tokens para auditar el design system sin depender de
 * un navegador.
 */

/** Canales RGB normalizados a [0, 1] de un color hex `#RRGGBB`. */
function parseHex(hex: string): { red: number; green: number; blue: number } {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (match === null) {
    throw new Error(`Color hex inválido: '${hex}'`);
  }
  const value = Number.parseInt(match[1] as string, 16);
  return {
    red: ((value >> 16) & 0xff) / 255,
    green: ((value >> 8) & 0xff) / 255,
    blue: (value & 0xff) / 255,
  };
}

/** Linealiza un canal sRGB según WCAG. */
function linearize(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa WCAG de un color hex `#RRGGBB`. */
export function relativeLuminance(hex: string): number {
  const { red, green, blue } = parseHex(hex);
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

/** Ratio de contraste WCAG entre dos colores (1:1 … 21:1). */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
