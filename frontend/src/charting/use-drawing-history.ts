/**
 * Hook del historial de dibujos (RF-213, ADR-017).
 *
 * Envuelve `drawingHistoryReducer` con `useReducer` y expone una API estable
 * para crear/mover/borrar trazos de forma reversible, además de deshacer y
 * rehacer. Un gesto (`begin`/`end`) agrupa un arrastre en un único paso.
 */
import { useCallback, useReducer } from 'react';
import {
  createDrawingHistoryState,
  drawingHistoryReducer,
  type DrawingHistoryState,
} from './drawing-history';
import type { OverlayShape } from './overlay-geometry';

/** API del historial de dibujos. */
export interface DrawingHistory {
  /** Trazos actuales. */
  shapes: ReadonlyArray<OverlayShape>;
  /** Hay pasos para deshacer. */
  canUndo: boolean;
  /** Hay pasos para rehacer. */
  canRedo: boolean;
  /** Aplica una mutación (reversible salvo durante un gesto). */
  update: (updater: (current: ReadonlyArray<OverlayShape>) => OverlayShape[]) => void;
  /** Inicia un gesto que agrupará las mutaciones intermedias. */
  begin: () => void;
  /** Cierra el gesto y apila un único paso. */
  end: () => void;
  /** Deshace el último paso. */
  undo: () => void;
  /** Rehace el paso deshecho. */
  redo: () => void;
  /** Reinicia el historial con los trazos indicados. */
  reset: (shapes: ReadonlyArray<OverlayShape>) => void;
}

/**
 * Crea el historial de dibujos con estado inicial.
 *
 * @param initialShapes Trazos iniciales.
 * @returns API del historial.
 */
export function useDrawingHistory(initialShapes: ReadonlyArray<OverlayShape>): DrawingHistory {
  const [state, dispatch] = useReducer(
    drawingHistoryReducer,
    initialShapes,
    (shapes): DrawingHistoryState => createDrawingHistoryState(shapes),
  );

  const update = useCallback<DrawingHistory['update']>((updater) => {
    dispatch({ type: 'update', updater });
  }, []);
  const begin = useCallback(() => dispatch({ type: 'begin' }), []);
  const end = useCallback(() => dispatch({ type: 'end' }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const reset = useCallback((shapes: ReadonlyArray<OverlayShape>) => {
    dispatch({ type: 'reset', shapes });
  }, []);

  return {
    shapes: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    update,
    begin,
    end,
    undo,
    redo,
    reset,
  };
}
