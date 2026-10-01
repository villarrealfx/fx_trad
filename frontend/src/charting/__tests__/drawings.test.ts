// @vitest-environment node
/**
 * Tests del modelo y serialización de dibujos (TASK-UI-220, RF-209/RI-201).
 *
 * Verifican el color por tipo desde los tokens del design system, la
 * validación de formas y el round-trip de serialización versionada. Patrón AAA.
 */
import { describe, expect, it } from 'vitest';
import { COLOR_TOKENS, DRAWING_COLORS } from '../../styles/tokens';
import {
  DRAWING_DOCUMENT_VERSION,
  DRAWING_KINDS,
  colorForShape,
  deserializeDrawings,
  fromDrawingDocument,
  isOverlayShape,
  serializeDrawings,
  toDrawingDocument,
} from '../drawings';
import type { OverlayShape } from '../overlay-geometry';

const LINE: OverlayShape = {
  id: 'line-1',
  kind: 'line',
  from: { time: 1_781_000_000, price: 1.5 },
  to: { time: 1_781_003_600, price: 1.75 },
};

const RECT: OverlayShape = {
  id: 'rect-1',
  kind: 'rect',
  from: { time: 1_781_000_000, price: 1.5 },
  to: { time: 1_781_003_600, price: 1.6 },
};

const FIB: OverlayShape = {
  id: 'fib-1',
  kind: 'fib',
  from: { time: 1_781_000_000, price: 1.5 },
  to: { time: 1_781_003_600, price: 1.6 },
};

const BUY: OverlayShape = {
  id: 'buy-1',
  kind: 'marker',
  position: { time: 1_781_000_000, price: 1.5 },
  direction: 'buy',
};

const SELL: OverlayShape = {
  id: 'sell-1',
  kind: 'marker',
  position: { time: 1_781_000_000, price: 1.5 },
  direction: 'sell',
};

const OPERATION: OverlayShape = {
  id: 'op-1',
  kind: 'operation',
  from: { time: 1_781_000_000, price: 1.1 },
  to: { time: 1_781_003_600, price: 1.095 },
};

describe('colorForShape (RF-209)', () => {
  it('usa los tokens mate para línea, rectángulo y fibonacci', () => {
    expect(colorForShape(LINE)).toBe(DRAWING_COLORS.line);
    expect(colorForShape(RECT)).toBe(DRAWING_COLORS.rect);
    expect(colorForShape(FIB)).toBe(DRAWING_COLORS.fib);
  });

  it('usa los tokens de velas para los marcadores de compra/venta', () => {
    expect(colorForShape(BUY)).toBe(COLOR_TOKENS.up);
    expect(colorForShape(SELL)).toBe(COLOR_TOKENS.down);
  });

  it('usa el token de acento para la operación (RF-309, ADR-024)', () => {
    expect(colorForShape(OPERATION)).toBe(COLOR_TOKENS.drawOpEntry);
  });

  it('no hardcodea colores: provienen del design system (TASK-UI-200)', () => {
    expect(DRAWING_COLORS.line).toBe(COLOR_TOKENS.drawLine);
    expect(DRAWING_COLORS.rect).toBe(COLOR_TOKENS.drawRect);
    expect(DRAWING_COLORS.fib).toBe(COLOR_TOKENS.drawFib);
  });
});

describe('isOverlayShape', () => {
  it('acepta los cinco tipos válidos', () => {
    expect(isOverlayShape(LINE)).toBe(true);
    expect(isOverlayShape(RECT)).toBe(true);
    expect(isOverlayShape(FIB)).toBe(true);
    expect(isOverlayShape(OPERATION)).toBe(true);
    expect(isOverlayShape(BUY)).toBe(true);
  });

  it('incluye la operación en DRAWING_KINDS (RF-301)', () => {
    expect(DRAWING_KINDS).toContain('operation');
  });

  it('rechaza formas malformadas', () => {
    expect(isOverlayShape(null)).toBe(false);
    expect(isOverlayShape('line')).toBe(false);
    expect(isOverlayShape({ id: 'x', kind: 'line', from: { time: 1 } })).toBe(false);
    expect(isOverlayShape({ id: 'x', kind: 'operation', from: { time: 1, price: 1.1 } })).toBe(
      false,
    );
    expect(isOverlayShape({ id: 'x', kind: 'marker', position: { time: 1, price: 2 } })).toBe(
      false,
    );
    expect(isOverlayShape({ id: 'x', kind: 'unknown' })).toBe(false);
  });
});

describe('toDrawingDocument / fromDrawingDocument', () => {
  it('construye un documento con la versión actual y copia los trazos', () => {
    const input = [LINE, BUY];
    const document = toDrawingDocument(input);

    expect(document.version).toBe(DRAWING_DOCUMENT_VERSION);
    expect(document.shapes).toEqual(input);
    expect(document.shapes).not.toBe(input);
  });

  it('descarta documentos de versión desconocida', () => {
    expect(fromDrawingDocument({ version: 999, shapes: [LINE] })).toEqual([]);
  });

  it('filtra formas inválidas y conserva las válidas', () => {
    const result = fromDrawingDocument({
      version: DRAWING_DOCUMENT_VERSION,
      shapes: [LINE, { id: 'bad' }, RECT],
    });
    expect(result).toEqual([LINE, RECT]);
  });

  it('devuelve [] ante valores no documento', () => {
    expect(fromDrawingDocument(null)).toEqual([]);
    expect(fromDrawingDocument({ version: DRAWING_DOCUMENT_VERSION })).toEqual([]);
  });
});

describe('serializeDrawings / deserializeDrawings', () => {
  it('hace round-trip de los trazos (RI-201)', () => {
    const shapes = [LINE, RECT, FIB, OPERATION, BUY, SELL];
    expect(deserializeDrawings(serializeDrawings(shapes))).toEqual(shapes);
  });

  it('devuelve [] ante entrada vacía o corrupta', () => {
    expect(deserializeDrawings(null)).toEqual([]);
    expect(deserializeDrawings(undefined)).toEqual([]);
    expect(deserializeDrawings('')).toEqual([]);
    expect(deserializeDrawings('{no-json')).toEqual([]);
    expect(deserializeDrawings('"texto"')).toEqual([]);
  });

  it('devuelve [] si la versión serializada es desconocida', () => {
    const stale = JSON.stringify({ version: 0, shapes: [LINE] });
    expect(deserializeDrawings(stale)).toEqual([]);
  });
});
