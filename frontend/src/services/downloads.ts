/**
 * Cliente del endpoint `POST /downloads` (TASK-UI-020, RF-001/RX-001).
 *
 * Encola una descarga asíncrona y devuelve el `task_id` (202 Accepted). El
 * seguimiento del estado llega con TASK-UI-021 (`GET /downloads/{task_id}`).
 */

/** Cuerpo de la solicitud de descarga (activo + rango en segundos UTC). */
export interface DownloadRequestPayload {
  asset: string;
  start: number;
  end: number;
}

/** Respuesta 202 del backend con el identificador de la tarea. */
export interface DownloadAccepted {
  task_id: string;
}

/** Error de la API al solicitar una descarga. */
export class DownloadError extends Error {
  /** Estado HTTP de la respuesta. */
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'DownloadError';
    this.status = status;
  }
}

/** Base URL de la API (RX-002, ADR-009); en dev usa el proxy de Vite. */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

/**
 * Encola una descarga histórica.
 *
 * @param payload Activo y rango (segundos UTC).
 * @returns El `task_id` de la tarea encolada.
 * @throws DownloadError si el backend responde con un error HTTP.
 */
export async function requestDownload(payload: DownloadRequestPayload): Promise<DownloadAccepted> {
  const response = await fetch(`${API_BASE_URL}/downloads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let detail = `Error al solicitar la descarga (HTTP ${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      // Respuesta sin body JSON: se conserva el mensaje genérico.
    }
    throw new DownloadError(response.status, detail);
  }
  return (await response.json()) as DownloadAccepted;
}
