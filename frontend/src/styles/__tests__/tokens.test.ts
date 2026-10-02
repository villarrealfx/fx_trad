// @vitest-environment node
/**
 * Tests del setup de tokens del design system (TASK-UI-000, EP-UI-000).
 *
 * Verifica los umbrales de contraste WCAG AA (DoD) y que `tokens.css` refleje
 * exactamente `tokens.ts` (anti-drift entre la fuente TS y las custom
 * properties). Patrón AAA.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, relativeLuminance } from '../contrast';
import {
  AXIS_TOKENS,
  COLOR_TOKENS,
  DRAWING_COLORS,
  DRAWING_COLOR_ROLES,
  ICON_TOKENS,
  MARKER_TOKENS,
  OPERATION_TOKENS,
  RADIUS_TOKENS,
  SHADOW_TOKENS,
  SPACING_TOKENS,
  TYPOGRAPHY_TOKENS,
  colorVar,
} from '../tokens';

const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8').toLowerCase();

/** camelCase → kebab-case (textMuted → text-muted). */
function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

describe('contraste WCAG de los colores', () => {
  it('cumple AA de texto normal (≥ 4.5:1)', () => {
    expect(contrastRatio(COLOR_TOKENS.text, COLOR_TOKENS.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLOR_TOKENS.text, COLOR_TOKENS.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLOR_TOKENS.textMuted, COLOR_TOKENS.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLOR_TOKENS.textMuted, COLOR_TOKENS.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('cumple AA de elementos UI/texto grande (≥ 3:1)', () => {
    for (const role of ['up', 'down', 'warning', 'focus'] as const) {
      expect(contrastRatio(COLOR_TOKENS[role], COLOR_TOKENS.bg)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('tokens.css refleja tokens.ts (anti-drift)', () => {
  it('declara todos los colores', () => {
    for (const [name, value] of Object.entries(COLOR_TOKENS)) {
      expect(css).toContain(`--color-${kebab(name)}: ${value.toLowerCase()};`);
    }
  });

  it('declara el espaciado, radios y sombras', () => {
    for (const [name, value] of Object.entries(SPACING_TOKENS)) {
      expect(css).toContain(`--space-${name}: ${value};`);
    }
    for (const [name, value] of Object.entries(RADIUS_TOKENS)) {
      expect(css).toContain(`--radius-${name}: ${value};`);
    }
    for (const [name, value] of Object.entries(SHADOW_TOKENS)) {
      expect(css).toContain(`--shadow-${name}: ${value.toLowerCase()};`);
    }
  });

  it('declara la tipografía por rol', () => {
    for (const [name, value] of Object.entries(TYPOGRAPHY_TOKENS)) {
      expect(css).toContain(`--font-${name}-size: ${value.fontSize};`);
      expect(css).toContain(`--font-${name}-weight: ${value.fontWeight};`);
    }
  });
});

describe('colorVar', () => {
  it('mapea nombres camelCase a custom properties kebab-case', () => {
    expect(colorVar('bg')).toBe('var(--color-bg)');
    expect(colorVar('textMuted')).toBe('var(--color-text-muted)');
  });
});

describe('tokens del ciclo 03 (dibujos, ejes, marcas, íconos)', () => {
  it('los colores de dibujo cumplen contraste no textual (≥ 3:1) sobre el fondo', () => {
    for (const role of DRAWING_COLOR_ROLES) {
      expect(contrastRatio(COLOR_TOKENS[role], COLOR_TOKENS.bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it('expone el mapa de colores de dibujo desde los tokens', () => {
    expect(DRAWING_COLORS).toEqual({
      line: COLOR_TOKENS.drawLine,
      rect: COLOR_TOKENS.drawRect,
      fib: COLOR_TOKENS.drawFib,
    });
  });

  it('tokens.css refleja ejes, marcas e íconos', () => {
    const expected: ReadonlyArray<readonly [string, string]> = [
      ['--axis-price-decimals', String(AXIS_TOKENS.priceDecimals)],
      ['--axis-price-side', AXIS_TOKENS.priceSide],
      ['--axis-x-format', `'${AXIS_TOKENS.xFormat}'`],
      ['--axis-x-tick', AXIS_TOKENS.xTick],
      ['--marker-offset-pips', String(MARKER_TOKENS.offsetPips)],
      ['--marker-pip-value', String(MARKER_TOKENS.pipValue)],
      ['--marker-pip-value-jpy', String(MARKER_TOKENS.pipValueJpy)],
      ['--icon-set', ICON_TOKENS.set],
      ['--icon-size-sm', ICON_TOKENS.sizes.sm],
      ['--icon-size-md', ICON_TOKENS.sizes.md],
      ['--icon-size-lg', ICON_TOKENS.sizes.lg],
    ];
    for (const [property, value] of expected) {
      expect(css).toContain(`${property}: ${value.toLowerCase()};`);
    }
  });
});

describe('tokens de la operación (ciclo 04)', () => {
  it('los 3 colores reutilizan la base del design system, sin color nuevo (ADR-024)', () => {
    expect(COLOR_TOKENS.drawOpSl).toBe(COLOR_TOKENS.down);
    expect(COLOR_TOKENS.drawOpEntry).toBe(COLOR_TOKENS.text);
    expect(COLOR_TOKENS.drawOpTp).toBe(COLOR_TOKENS.up);
  });

  it('las 4 etiquetas de la operación cumplen AA sobre chart y chip (RNF-305)', () => {
    // Medido (chart #0A0C10 / chip #161B22): drawOpSl 5.61/4.96 · drawOpEntry
    // 16.56/14.64 · drawOpTp 6.53/5.77 · textMuted (nombre de etiqueta) 6.36/5.62.
    const roles = ['drawOpSl', 'drawOpEntry', 'drawOpTp', 'textMuted'] as const;
    for (const role of roles) {
      for (const background of [COLOR_TOKENS.bg, COLOR_TOKENS.surface]) {
        expect(contrastRatio(COLOR_TOKENS[role], background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('fija los multiplicadores de objetivo sin el 1:1 (RF-303, RF-304)', () => {
    expect(OPERATION_TOKENS.tpMultipliers).toEqual([1.382, 1.5, 2]);
  });

  it('tokens.css refleja el formato de la operación (anti-drift)', () => {
    const expected: ReadonlyArray<readonly [string, string]> = [
      ['--operation-label-min-gap', `${OPERATION_TOKENS.labelMinGap}px`],
      ['--operation-label-offset', `${OPERATION_TOKENS.labelOffset}px`],
      ['--operation-label-pad-x', `${OPERATION_TOKENS.labelPadX}px`],
      ['--operation-label-pad-y', `${OPERATION_TOKENS.labelPadY}px`],
      ['--operation-label-radius', `${OPERATION_TOKENS.labelRadius}px`],
      ['--operation-hit-radius', `${OPERATION_TOKENS.hitRadius}px`],
      ['--operation-leader-width', `${OPERATION_TOKENS.leaderWidth}px`],
      ['--operation-tp-multipliers', OPERATION_TOKENS.tpMultipliers.join(' ')],
    ];
    for (const [property, value] of expected) {
      expect(css).toContain(`${property}: ${value.toLowerCase()};`);
    }
  });
});

describe('contrastRatio', () => {
  it('devuelve 21 para negro sobre blanco', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });

  it('devuelve 1 para colores idénticos', () => {
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });

  it('lanza error con un hex inválido', () => {
    expect(() => relativeLuminance('#XYZ')).toThrow();
  });
});
