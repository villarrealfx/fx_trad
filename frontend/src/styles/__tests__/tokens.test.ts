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
  COLOR_TOKENS,
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
