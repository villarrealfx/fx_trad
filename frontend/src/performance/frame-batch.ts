/**
 * Coalesce de actualizaciones por frame de `requestAnimationFrame`.
 *
 * Limita las actualizaciones de estado a una por frame de animación (KPI-2,
 * RNF-001): si durante un mismo frame se programan varias actualizaciones
 * (p. ej. eventos de crosshair de lightweight-charts), solo la última se
 * aplica. Evita re-renders reactivos redundantes durante el pan/zoom.
 */

/** Batcher que ejecuta la última actualización programada una vez por frame. */
export interface FrameBatcher {
  /** Programa una actualización; se ejecutará como máximo una vez por frame. */
  schedule(update: () => void): void;
  /** Ejecuta la actualización pendiente de forma síncrona. */
  flush(): void;
  /** Cancela el frame pendiente y descarta la actualización programada. */
  cancel(): void;
}

/** Dependencias inyectables para tests deterministas. */
export interface FrameBatcherOptions {
  /** Planificador de frames; por defecto `requestAnimationFrame`. */
  schedule?: (callback: FrameRequestCallback) => number;
  /** Cancela un frame planificado; por defecto `cancelAnimationFrame`. */
  cancel?: (id: number) => void;
}

/**
 * Crea un batcher de actualizaciones por frame.
 *
 * Uso típico: en `ChartPane` la leyenda OHLC del crosshair se actualiza
 * mediante el batcher, de modo que múltiples eventos síncronos dentro del
 * mismo frame producen un único re-render.
 */
export function createFrameBatcher(options: FrameBatcherOptions = {}): FrameBatcher {
  const schedule = options.schedule ?? ((callback) => requestAnimationFrame(callback));
  const cancel = options.cancel ?? ((id) => cancelAnimationFrame(id));
  let pending: (() => void) | null = null;
  let frameId: number | null = null;

  const commit = (): void => {
    frameId = null;
    const update = pending;
    pending = null;
    if (update !== null) update();
  };

  return {
    schedule(update: () => void): void {
      pending = update;
      if (frameId !== null) return;
      frameId = schedule(commit);
    },
    flush(): void {
      if (frameId !== null) {
        cancel(frameId);
        frameId = null;
      }
      commit();
    },
    cancel(): void {
      if (frameId !== null) {
        cancel(frameId);
        frameId = null;
      }
      pending = null;
    },
  };
}
