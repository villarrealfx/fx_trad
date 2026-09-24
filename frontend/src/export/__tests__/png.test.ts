/**
 * Tests del export PNG (TASK-036, RF-015/RI-003).
 *
 * Verifica la serialización `toBlob`, la ausencia de persistencia (RI-003: se
 * revoca el object URL y no se escribe en `localStorage`) y el contrato de
 * errores empty/error de SCR-006. Patrón AAA, sin canvas real.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EmptyExportError,
  ExportError,
  buildExportFilename,
  canvasToBlob,
  downloadBlob,
  exportChartPng,
} from '../png';

const originalToBlob = HTMLCanvasElement.prototype.toBlob;

/** Sustituye `toBlob` para devolver el blob indicado (o null). */
function stubToBlob(blob: Blob | null): void {
  HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback): void {
    callback(blob);
  } as typeof HTMLCanvasElement.prototype.toBlob;
}

function fakeCanvas(): HTMLCanvasElement {
  return document.createElement('canvas');
}

describe('buildExportFilename', () => {
  it('builds a deterministic PNG filename with symbol, timeframe and scale', () => {
    const name = buildExportFilename({
      symbol: 'EURUSD',
      timeframe: '1h',
      scale: 2,
      format: 'png',
    });
    expect(name).toBe('fxtrad-EURUSD-1h-2x.png');
  });

  it('uses the requested format as extension', () => {
    const name = buildExportFilename({
      symbol: 'EURUSD',
      timeframe: '1h',
      scale: 4,
      format: 'webp',
    });
    expect(name).toBe('fxtrad-EURUSD-1h-4x.webp');
  });
});

describe('canvasToBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves the generated blob', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    stubToBlob(blob);

    await expect(canvasToBlob(fakeCanvas())).resolves.toBe(blob);
  });

  it('rejects with ExportError when toBlob yields null', async () => {
    stubToBlob(null);

    await expect(canvasToBlob(fakeCanvas())).rejects.toBeInstanceOf(ExportError);
  });
});

describe('exportChartPng', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  });

  it('throws EmptyExportError when there is no canvas', async () => {
    await expect(
      exportChartPng({ canvas: null, symbol: 'EURUSD', timeframe: '1h' }),
    ).rejects.toBeInstanceOf(EmptyExportError);
  });

  it('returns the blob and a 2x PNG filename by default', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    stubToBlob(blob);

    const result = await exportChartPng({
      canvas: fakeCanvas(),
      symbol: 'EURUSD',
      timeframe: '1h',
    });

    expect(result.blob).toBe(blob);
    expect(result.filename).toBe('fxtrad-EURUSD-1h-2x.png');
  });
});

describe('downloadBlob', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock');
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (URL as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  it('clicks a download anchor and revokes the URL without persisting state (RI-003)', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const blob = new Blob(['png'], { type: 'image/png' });

    downloadBlob(blob, 'fxtrad-EURUSD-1h-2x.png');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(setItem).not.toHaveBeenCalled();
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
