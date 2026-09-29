/**
 * Hook de edición del overlay de dibujos (RF-212, ADR-017).
 *
 * Gestiona la interacción de arrastre sobre el gráfico: selecciona un trazo,
 * mueve su cuerpo o redimensiona un extremo mediante los handles. Usa
 * `pointerdown` en fase de captura para no colisionar con el pan/zoom de
 * lightweight-charts y `setPointerCapture` para recibir el resto del arrastre.
 */
import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import {
  hitTestHandle,
  isResizableShape,
  moveShapeBy,
  pixelToAnchor,
  resizeShape,
  type HandleId,
  type InverseCoordinateMapper,
} from './drawing-edit';
import {
  hitTestFragment,
  projectShape,
  type CoordinateMapper,
  type OverlayShape,
  type PixelPoint,
  type PriceTimePoint,
} from './overlay-geometry';

/** Opciones del hook de edición de dibujos. */
export interface UseDrawingEditOptions {
  /** Contenedor del gráfico, usado para calcular coordenadas locales. */
  hostRef: RefObject<HTMLDivElement | null>;
  /** Devuelve el mapeo dominio → píxeles actual (o null si no está listo). */
  getMapper: () => CoordinateMapper | null;
  /** Devuelve el mapeo píxeles → dominio actual (o null si no está listo). */
  getInverseMapper: () => InverseCoordinateMapper | null;
  /** Trazos editables. */
  shapes: ReadonlyArray<OverlayShape>;
  /** Actualiza los trazos (recibe un updater funcional). */
  onShapesChange: (updater: (current: ReadonlyArray<OverlayShape>) => OverlayShape[]) => void;
  /** Notifica el inicio de un arrastre (agrupa el gesto en el historial). */
  onGestureStart?: () => void;
  /** Notifica el fin de un arrastre. */
  onGestureEnd?: () => void;
  /** Habilita la edición; por defecto `true`. */
  enabled?: boolean;
}

/** Handlers de puntero y estado de selección expuestos al `ChartPane`. */
export interface DrawingEdit {
  /** Id del trazo seleccionado (muestra handles) o null. */
  selectedShapeId: string | null;
  /** Selecciona o deselecciona un trazo. */
  setSelectedShapeId: (id: string | null) => void;
  /** Inicia selección/arrastre (fase de captura). */
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  /** Aplica movimiento/redimensionado mientras se arrastra. */
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  /** Finaliza el arrastre. */
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  /** Cancela el arrastre. */
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

/** Estado interno del arrastre en curso. */
type DragState =
  | { kind: 'move'; id: string; last: PriceTimePoint }
  | { kind: 'resize'; id: string; handle: HandleId }
  | null;

/** Punto local del cursor respecto del contenedor del gráfico. */
function cursorPoint(
  event: ReactPointerEvent<HTMLElement>,
  host: HTMLElement | null,
): PixelPoint | null {
  if (host === null) return null;
  const rect = host.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

/** Identifica el trazo y handle bajo el cursor, priorizando handles de selección. */
function findTarget(
  cursor: PixelPoint,
  shapes: ReadonlyArray<OverlayShape>,
  mapper: CoordinateMapper,
  selectedShapeId: string | null,
): { id: string; handle: HandleId | null } | null {
  if (selectedShapeId !== null) {
    const selected = shapes.find((shape) => shape.id === selectedShapeId);
    if (selected !== undefined && isResizableShape(selected)) {
      const handle = hitTestHandle(cursor, selected, mapper);
      if (handle !== null) return { id: selected.id, handle };
    }
  }
  for (let index = shapes.length - 1; index >= 0; index -= 1) {
    const shape = shapes[index] as OverlayShape;
    if (hitTestFragment(cursor, projectShape(shape, mapper))) {
      return { id: shape.id, handle: null };
    }
  }
  return null;
}

/**
 * Habilita la edición por arrastre de los trazos del overlay.
 *
 * @param options Dependencias de proyección, trazos y actualización.
 * @returns Handlers de puntero y estado de selección.
 */
export function useDrawingEdit({
  hostRef,
  getMapper,
  getInverseMapper,
  shapes,
  onShapesChange,
  onGestureStart,
  onGestureEnd,
  enabled = true,
}: UseDrawingEditOptions): DrawingEdit {
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const dragRef = useRef<DragState>(null);
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    if (!enabled) return;
    const mapper = getMapper();
    const inverse = getInverseMapper();
    const cursor = cursorPoint(event, hostRef.current);
    if (mapper === null || inverse === null || cursor === null) return;
    const target = findTarget(cursor, shapesRef.current, mapper, selectedShapeId);
    if (target === null) {
      if (selectedShapeId !== null) setSelectedShapeId(null);
      return;
    }
    const anchor = pixelToAnchor(cursor, inverse);
    if (anchor === null) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onGestureStart?.();
    if (target.handle !== null) {
      dragRef.current = { kind: 'resize', id: target.id, handle: target.handle };
    } else {
      setSelectedShapeId(target.id);
      dragRef.current = { kind: 'move', id: target.id, last: anchor };
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (drag === null) return;
    const inverse = getInverseMapper();
    const cursor = cursorPoint(event, hostRef.current);
    if (inverse === null || cursor === null) return;
    const anchor = pixelToAnchor(cursor, inverse);
    if (anchor === null) return;
    event.stopPropagation();
    event.preventDefault();
    if (drag.kind === 'resize') {
      onShapesChange((current) =>
        current.map((shape) =>
          shape.id === drag.id ? resizeShape(shape, drag.handle, anchor) : shape,
        ),
      );
      return;
    }
    const deltaTime = anchor.time - drag.last.time;
    const deltaPrice = anchor.price - drag.last.price;
    if (deltaTime === 0 && deltaPrice === 0) return;
    drag.last = anchor;
    onShapesChange((current) =>
      current.map((shape) =>
        shape.id === drag.id ? moveShapeBy(shape, deltaTime, deltaPrice) : shape,
      ),
    );
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>): void => {
    if (dragRef.current === null) return;
    dragRef.current = null;
    event.stopPropagation();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onGestureEnd?.();
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLElement>): void => {
    if (dragRef.current === null) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onGestureEnd?.();
  };

  return {
    selectedShapeId,
    setSelectedShapeId,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
