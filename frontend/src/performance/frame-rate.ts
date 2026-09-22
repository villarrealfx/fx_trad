/**
 * Medidor de tasa de frames basado en `requestAnimationFrame` (RNF-001, KPI-2).
 *
 * Mide la cadencia real del bucle de animación del navegador y reporta
 * métricas de fluidez: promedio de FPS, percentil 95 de duración de frame,
 * frame más lento y conteo de frames caídos. El objetivo de TASK-025 es
 * verificar que el pan/zoom del ChartPane se mantiene en 60 FPS sin caídas
 * perceptibles (presupuesto de 16.67 ms por frame).
 */

/** Presupuesto de un frame a 60 FPS (16.67 ms), objetivo de RNF-001. */
export const FRAME_BUDGET_MS = 1000 / 60;

/** Umbral de duración por encima del cual un frame se considera caído. */
export const DROPPED_FRAME_THRESHOLD_MS = FRAME_BUDGET_MS * 1.5;

/** Métricas de fluidez acumuladas por un {@link FrameRateMeter}. */
export interface FrameMetrics {
  /** Número total de frames muestreados. */
  totalFrames: number;
  /** Velocidad promedio en FPS durante la medición. */
  avgFps: number;
  /** Percentil 95 de duración de frame en milisegundos. */
  p95FrameMs: number;
  /** Duración máxima de un frame en milisegundos. */
  maxFrameMs: number;
  /** Frames caídos: duración mayor que `DROPPED_FRAME_THRESHOLD_MS`. */
  droppedFrames: number;
  /** Milisegundos transcurridos entre `start()` y el último frame. */
  durationMs: number;
}

/** Dependencias inyectables para tests deterministas (fake timers). */
export interface FrameRateMeterOptions {
  /** Reloj a usar; por defecto `performance.now`. */
  now?: () => number;
  /** Planificador de frames; por defecto `requestAnimationFrame`. */
  schedule?: (callback: FrameRequestCallback) => number;
  /** Cancela un frame planificado; por defecto `cancelAnimationFrame`. */
  cancel?: (id: number) => void;
  /** Duración (ms) por encima de la cual un frame se considera caído. */
  dropThresholdMs?: number;
}

/**
 * Mide la tasa de frames real del navegador durante el pan/zoom (RNF-001).
 *
 * Uso típico: iniciar al terminar la carga de la serie y detener tras un
 * período de interacción; `report()` devuelve las métricas acumuladas.
 */
export class FrameRateMeter {
  private readonly now: () => number;
  private readonly schedule: (callback: FrameRequestCallback) => number;
  private readonly cancel: (id: number) => void;
  private readonly dropThresholdMs: number;
  private running = false;
  private frameId: number | null = null;
  private startTime = 0;
  private lastTimestamp: number | null = null;
  private stoppedDurationMs: number | null = null;
  private deltas: number[] = [];

  constructor(options: FrameRateMeterOptions = {}) {
    this.now = options.now ?? ((): number => performance.now());
    this.schedule = options.schedule ?? ((callback) => requestAnimationFrame(callback));
    this.cancel = options.cancel ?? ((id) => cancelAnimationFrame(id));
    this.dropThresholdMs = options.dropThresholdMs ?? DROPPED_FRAME_THRESHOLD_MS;
  }

  /** Comienza a muestrear frames. Iterativa; no cierra sobre `this`. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = this.now();
    this.lastTimestamp = null;
    this.deltas = [];
    const tick = (timestamp: number): void => {
      if (!this.running) return;
      if (this.lastTimestamp !== null) {
        this.deltas.push(Math.max(0, timestamp - this.lastTimestamp));
      }
      this.lastTimestamp = timestamp;
      this.frameId = this.schedule(tick);
    };
    this.frameId = this.schedule(tick);
  }

  /** Detiene la medición y devuelve las métricas acumuladas. */
  stop(): FrameMetrics {
    if (this.running && this.frameId !== null) {
      this.cancel(this.frameId);
    }
    this.running = false;
    this.stoppedDurationMs = Math.max(0, this.now() - this.startTime);
    return this.report();
  }

  /** Devuelve las métricas acumuladas sin detener la medición. */
  report(): FrameMetrics {
    const deltas = this.deltas;
    const totalFrames = deltas.length;
    const durationMs = this.stoppedDurationMs ?? Math.max(0, this.now() - this.startTime);
    if (totalFrames === 0) {
      return { totalFrames, avgFps: 0, p95FrameMs: 0, maxFrameMs: 0, droppedFrames: 0, durationMs };
    }
    const sorted = [...deltas].sort((a, b) => a - b);
    const sum = deltas.reduce((acc, value) => acc + value, 0);
    const avgFrameMs = sum / totalFrames;
    const p95Index = Math.min(totalFrames - 1, Math.ceil(totalFrames * 0.95) - 1);
    return {
      totalFrames,
      avgFps: avgFrameMs === 0 ? 0 : 1000 / avgFrameMs,
      p95FrameMs: sorted[p95Index],
      maxFrameMs: sorted[totalFrames - 1],
      droppedFrames: deltas.filter((value) => value > this.dropThresholdMs).length,
      durationMs,
    };
  }
}

/**
 * Mide la duración del trabajo síncrono de un frame (RNF-001).
 *
 * Útil para verificar que una operación puntual (p. ej. una actualización de
 * leyenda) entra dentro del presupuesto de 16.67 ms.
 */
export function measureFrameWork(work: () => void): { durationMs: number; withinBudget: boolean } {
  const start = performance.now();
  work();
  const durationMs = performance.now() - start;
  return { durationMs, withinBudget: durationMs <= FRAME_BUDGET_MS };
}
