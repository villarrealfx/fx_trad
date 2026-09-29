// @vitest-environment node
/**
 * Tests del historial de comandos de dibujos (TASK-UI-222, RF-213).
 *
 * Verifican el command stack (deshacer/rehacer), el agrupamiento de gestos y el
 * tope de memoria. Patrón AAA.
 */
import { describe, expect, it } from 'vitest';
import {
  MAX_HISTORY,
  createDrawingHistoryState,
  drawingHistoryReducer,
  type DrawingHistoryState,
} from '../drawing-history';
import type { OverlayShape } from '../overlay-geometry';

/** Marcador de prueba identificado por su id. */
function marker(id: string): OverlayShape {
  return { id, kind: 'marker', position: { time: 0, price: 1 }, direction: 'buy' };
}

const EMPTY: ReadonlyArray<OverlayShape> = [];

describe('drawingHistoryReducer', () => {
  it('arranca sin historial', () => {
    const state = createDrawingHistoryState([marker('a')]);
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
    expect(state.present).toHaveLength(1);
  });

  it('apila cada update fuera de gesto y permite deshacer/rehacer', () => {
    let state = createDrawingHistoryState(EMPTY);
    state = drawingHistoryReducer(state, {
      type: 'update',
      updater: (current) => [...current, marker('a')],
    });

    expect(state.present).toHaveLength(1);
    expect(state.past).toHaveLength(1);

    state = drawingHistoryReducer(state, { type: 'undo' });
    expect(state.present).toHaveLength(0);
    expect(state.future).toHaveLength(1);

    state = drawingHistoryReducer(state, { type: 'redo' });
    expect(state.present).toHaveLength(1);
    expect(state.future).toHaveLength(0);
  });

  it('descarta el futuro al aplicar un nuevo cambio', () => {
    let state = createDrawingHistoryState(EMPTY);
    state = drawingHistoryReducer(state, {
      type: 'update',
      updater: () => [marker('a')],
    });
    state = drawingHistoryReducer(state, { type: 'undo' });
    expect(state.future).toHaveLength(1);

    state = drawingHistoryReducer(state, {
      type: 'update',
      updater: () => [marker('b')],
    });
    expect(state.future).toHaveLength(0);
    expect(state.present[0]?.id).toBe('b');
  });

  it('no hace nada al deshacer/rehacer sin pasos disponibles', () => {
    const state = createDrawingHistoryState([marker('a')]);
    expect(drawingHistoryReducer(state, { type: 'undo' })).toBe(state);
    expect(drawingHistoryReducer(state, { type: 'redo' })).toBe(state);
  });

  it('agrupa un gesto completo en un único paso', () => {
    let state = createDrawingHistoryState([marker('a')]);
    state = drawingHistoryReducer(state, { type: 'begin' });
    state = drawingHistoryReducer(state, {
      type: 'update',
      updater: () => [marker('a'), marker('b')],
    });
    state = drawingHistoryReducer(state, {
      type: 'update',
      updater: () => [marker('a'), marker('b'), marker('c')],
    });
    expect(state.past).toHaveLength(0);
    state = drawingHistoryReducer(state, { type: 'end' });

    expect(state.past).toHaveLength(1);
    expect(state.present).toHaveLength(3);

    state = drawingHistoryReducer(state, { type: 'undo' });
    expect(state.present).toHaveLength(1);
  });

  it('no apila un gesto sin cambios', () => {
    let state = createDrawingHistoryState([marker('a')]);
    state = drawingHistoryReducer(state, { type: 'begin' });
    state = drawingHistoryReducer(state, { type: 'end' });

    expect(state.past).toHaveLength(0);
    expect(state.gestureStart).toBeNull();
  });

  it('reinicia el historial con reset', () => {
    let state = createDrawingHistoryState([marker('a')]);
    state = drawingHistoryReducer(state, {
      type: 'update',
      updater: (current) => [...current, marker('b')],
    });
    state = drawingHistoryReducer(state, { type: 'reset', shapes: [marker('c')] });

    expect(state.present).toEqual([marker('c')]);
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
  });

  it('acota el historial a MAX_HISTORY', () => {
    let state: DrawingHistoryState = createDrawingHistoryState(EMPTY);
    for (let step = 0; step < MAX_HISTORY + 5; step += 1) {
      state = drawingHistoryReducer(state, {
        type: 'update',
        updater: (current) => [...current, marker(`m-${step}`)],
      });
    }
    expect(state.past.length).toBe(MAX_HISTORY);
  });
});
