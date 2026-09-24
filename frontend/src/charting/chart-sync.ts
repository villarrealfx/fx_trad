/**
 * Sincronización de paneles de gráfico (TASK-034, RF-014).
 *
 * Bus de eventos mínimo entre paneles del multigráfico: cada panel publica su
 * ventana temporal visible (por **tiempo**, no por índice lógico, para que
 * timeframes distintos queden alineados en UTC) y su crosshair; los demás
 * aplican el cambio. `source` identifica al emisor para ignorar el eco.
 */

/** Rango temporal visible en segundos UTC. */
export interface SyncTimeRange {
  from: number;
  to: number;
}

/** Posición de crosshair a replicar (tiempo + precio). */
export interface SyncCrosshair {
  time: number;
  price: number;
}

/** Mensaje de sincronización entre paneles. */
export interface ChartSyncMessage {
  /** Id del panel emisor. */
  source: string;
  /** Ventana temporal visible (alineada por tiempo UTC). */
  timeRange?: SyncTimeRange;
  /** Crosshair a replicar; `null` lo limpia. */
  crosshair?: SyncCrosshair | null;
}

/** Listener de mensajes de sincronización. */
type SyncListener = (message: ChartSyncMessage) => void;

/**
 * Bus de sincronización de paneles (RF-014).
 *
 * Un único controlador compartido por todos los paneles del multigráfico.
 */
export class ChartSyncController {
  private readonly listeners = new Set<SyncListener>();

  /** Suscribe un panel; devuelve la función de baja. */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Publica un mensaje a todos los paneles suscritos. */
  publish(message: ChartSyncMessage): void {
    for (const listener of this.listeners) listener(message);
  }
}
