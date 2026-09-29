/**
 * Tests del hook de edición por arrastre (TASK-UI-221, RF-212).
 *
 * Simulan eventos de puntero sobre un harness que usa `useDrawingEdit` con un
 * mapeo identidad, verificando mover el cuerpo y redimensionar por handle.
 * Patrón AAA.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InverseCoordinateMapper } from '../drawing-edit';
import { useDrawingEdit } from '../use-drawing-edit';
import type { CoordinateMapper, OverlayShape } from '../overlay-geometry';

const identityMapper: CoordinateMapper = {
  timeToCoordinate: (time) => time,
  priceToCoordinate: (price) => price,
};

const inverseMapper: InverseCoordinateMapper = {
  coordinateToTime: (x) => x,
  coordinateToPrice: (y) => y,
};

const LINE: OverlayShape = {
  id: 'line-1',
  kind: 'line',
  from: { time: 0, price: 0 },
  to: { time: 10, price: 10 },
};

interface HarnessProps {
  initial: ReadonlyArray<OverlayShape>;
  enabled?: boolean;
  onShapes: (shapes: ReadonlyArray<OverlayShape>) => void;
}

/** Emite un evento de puntero con coordenadas sobre el host (jsdom). */
function emitPointer(host: HTMLElement, type: string, x: number, y: number): void {
  fireEvent(host, new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
}

/** Harness que monta el hook sobre un div y publica los trazos resultantes. */
function Harness({ initial, enabled = true, onShapes }: HarnessProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shapes, setShapes] = useState<ReadonlyArray<OverlayShape>>(initial);
  const edit = useDrawingEdit({
    hostRef,
    getMapper: () => identityMapper,
    getInverseMapper: () => inverseMapper,
    shapes,
    onShapesChange: setShapes,
    enabled,
  });

  useEffect(() => {
    onShapes(shapes);
  }, [shapes, onShapes]);

  const handlers = {
    onPointerDownCapture: (event: ReactPointerEvent<HTMLElement>) => edit.onPointerDown(event),
    onPointerMoveCapture: (event: ReactPointerEvent<HTMLElement>) => edit.onPointerMove(event),
    onPointerUpCapture: (event: ReactPointerEvent<HTMLElement>) => edit.onPointerUp(event),
    onPointerCancelCapture: (event: ReactPointerEvent<HTMLElement>) => edit.onPointerCancel(event),
  };

  return <div ref={hostRef} data-testid="host" {...handlers} />;
}

describe('useDrawingEdit', () => {
  afterEach(() => {
    cleanup();
  });

  it('mueve el cuerpo del trazo al arrastrar', () => {
    const onShapes = vi.fn();
    const { getByTestId } = render(<Harness initial={[LINE]} onShapes={onShapes} />);
    const host = getByTestId('host');

    emitPointer(host, 'pointerdown', 5, 5);
    emitPointer(host, 'pointermove', 7, 7);
    emitPointer(host, 'pointerup', 7, 7);

    const moved = onShapes.mock.calls.at(-1)?.[0] as OverlayShape[];
    expect(moved[0]).toEqual({
      ...LINE,
      from: { time: 2, price: 2 },
      to: { time: 12, price: 12 },
    });
  });

  it('redimensiona un extremo arrastrando su handle', () => {
    const onShapes = vi.fn();
    const { getByTestId } = render(<Harness initial={[LINE]} onShapes={onShapes} />);
    const host = getByTestId('host');

    // 1) Selecciona el trazo tocando su cuerpo.
    emitPointer(host, 'pointerdown', 5, 5);
    emitPointer(host, 'pointerup', 5, 5);

    // 2) Arrastra el handle del extremo inicial.
    emitPointer(host, 'pointerdown', 0, 0);
    emitPointer(host, 'pointermove', 3, 3);
    emitPointer(host, 'pointerup', 3, 3);

    const resized = onShapes.mock.calls.at(-1)?.[0] as OverlayShape[];
    expect(resized[0]).toEqual({ ...LINE, from: { time: 3, price: 3 } });
  });

  it('no edita cuando está deshabilitado', () => {
    const onShapes = vi.fn();
    const { getByTestId } = render(
      <Harness initial={[LINE]} enabled={false} onShapes={onShapes} />,
    );
    const host = getByTestId('host');

    emitPointer(host, 'pointerdown', 5, 5);
    emitPointer(host, 'pointermove', 9, 9);

    const shapes = onShapes.mock.calls.at(-1)?.[0] as OverlayShape[];
    expect(shapes[0]).toEqual(LINE);
  });

  it('ignora el movimiento cuando no hay arrastre activo', () => {
    const onShapes = vi.fn();
    const { getByTestId } = render(<Harness initial={[LINE]} onShapes={onShapes} />);
    const host = getByTestId('host');

    emitPointer(host, 'pointermove', 9, 9);

    const shapes = onShapes.mock.calls.at(-1)?.[0] as OverlayShape[];
    expect(shapes[0]).toEqual(LINE);
  });

  it('cancela el arrastre sin seguir aplicando movimientos', () => {
    const onShapes = vi.fn();
    const { getByTestId } = render(<Harness initial={[LINE]} onShapes={onShapes} />);
    const host = getByTestId('host');

    emitPointer(host, 'pointerdown', 5, 5);
    emitPointer(host, 'pointermove', 6, 6);
    emitPointer(host, 'pointercancel', 6, 6);
    emitPointer(host, 'pointermove', 9, 9);
    emitPointer(host, 'pointerup', 9, 9);

    const shapes = onShapes.mock.calls.at(-1)?.[0] as OverlayShape[];
    expect(shapes[0]).toEqual({
      ...LINE,
      from: { time: 1, price: 1 },
      to: { time: 11, price: 11 },
    });
  });

  it('deselecciona al tocar un área vacía', () => {
    const onShapes = vi.fn();
    const { getByTestId } = render(<Harness initial={[LINE]} onShapes={onShapes} />);
    const host = getByTestId('host');

    emitPointer(host, 'pointerdown', 5, 5);
    emitPointer(host, 'pointerup', 5, 5);
    emitPointer(host, 'pointerdown', 100, 100);
    emitPointer(host, 'pointerup', 100, 100);

    // Con la selección perdida, tocar (0,0) inicia un desplazamiento del cuerpo.
    emitPointer(host, 'pointerdown', 0, 0);
    emitPointer(host, 'pointermove', 2, 0);
    emitPointer(host, 'pointerup', 2, 0);

    const shapes = onShapes.mock.calls.at(-1)?.[0] as OverlayShape[];
    expect(shapes[0]).toEqual({
      ...LINE,
      from: { time: 2, price: 0 },
      to: { time: 12, price: 10 },
    });
  });
});
