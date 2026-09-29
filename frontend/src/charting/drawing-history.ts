/**
 * Historial de comandos de los dibujos (RF-213, ADR-017).
 *
 * Reducer puro que implementa un command stack sobre los trazos del overlay:
 * mantiene pilas de estados pasados y futuros para deshacer/rehacer. Un
 * "gesto" (arrastre) agrupa múltiples actualizaciones en un único paso de
 * historial: `begin` al iniciar y `end` al soltar.
 */
import type { OverlayShape } from './overlay-geometry';

/** Tope de pasos de historial para acotar memoria. */
export const MAX_HISTORY = 50;

/** Estado del historial de dibujos. */
export interface DrawingHistoryState {
  /** Estados anteriores (más reciente al final). */
  past: ReadonlyArray<ReadonlyArray<OverlayShape>>;
  /** Estado actual. */
  present: ReadonlyArray<OverlayShape>;
  /** Estados deshechos, rehacibles (próximo al inicio). */
  future: ReadonlyArray<ReadonlyArray<OverlayShape>>;
  /** Instantánea al iniciar un gesto; null si no hay gesto activo. */
  gestureStart: ReadonlyArray<OverlayShape> | null;
}

/** Acciones del historial de dibujos. */
export type DrawingHistoryAction =
  | { type: 'begin' }
  | { type: 'update'; updater: (current: ReadonlyArray<OverlayShape>) => OverlayShape[] }
  | { type: 'end' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; shapes: ReadonlyArray<OverlayShape> };

/** Estado inicial del historial con los trazos dados. */
export function createDrawingHistoryState(
  shapes: ReadonlyArray<OverlayShape>,
): DrawingHistoryState {
  return { past: [], present: shapes, future: [], gestureStart: null };
}

/** Apila un estado respetando el tope `MAX_HISTORY`. */
function push(
  stack: ReadonlyArray<ReadonlyArray<OverlayShape>>,
  state: ReadonlyArray<OverlayShape>,
): ReadonlyArray<OverlayShape>[] {
  const next = [...stack, state];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

/**
 * Reduce una acción del historial de dibujos.
 *
 * Durante un gesto (`gestureStart !== null`), `update` no apila; al cerrar el
 * gesto se apila una única vez la instantánea inicial. Fuera de un gesto, cada
 * `update` es un paso reversible.
 */
export function drawingHistoryReducer(
  state: DrawingHistoryState,
  action: DrawingHistoryAction,
): DrawingHistoryState {
  switch (action.type) {
    case 'begin':
      return { ...state, gestureStart: state.present };
    case 'update': {
      const present = action.updater(state.present);
      if (state.gestureStart !== null) return { ...state, present };
      return { past: push(state.past, state.present), present, future: [], gestureStart: null };
    }
    case 'end': {
      if (state.gestureStart === null || state.gestureStart === state.present) {
        return { ...state, gestureStart: null };
      }
      return {
        past: push(state.past, state.gestureStart),
        present: state.present,
        future: [],
        gestureStart: null,
      };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1] as ReadonlyArray<OverlayShape>;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        gestureStart: null,
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const next = state.future[0] as ReadonlyArray<OverlayShape>;
      return {
        past: push(state.past, state.present),
        present: next,
        future: state.future.slice(1),
        gestureStart: null,
      };
    }
    case 'reset':
      return createDrawingHistoryState(action.shapes);
  }
}
