import { vi } from 'vitest';

/** Contexto 2D mockeado para suites jsdom (canvas sin implementación real). */
export interface Canvas2DContextMock {
  setTransform: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  fillStyle: string;
}

/**
 * Instala un mock de `HTMLCanvasElement.getContext('2d')` y lo devuelve para
 * poder inspeccionar los trazos pintados. Llamar `vi.restoreAllMocks()` en el
 * `afterEach` para no contaminar otras suites.
 */
export function installCanvas2DContextMock(): { ctx: Canvas2DContextMock } {
  const ctx: Canvas2DContextMock = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
  return { ctx };
}
