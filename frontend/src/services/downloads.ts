/**
 * Cliente de los endpoints de descarga (TASK-UI-020/TASK-UI-021).
 *
 * `POST /downloads` encola una descarga asíncrona y devuelve el `task_id`
 * (202 Accepted); `GET /downloads/{task_id}` consulta su estado y filas
 * (TASK-006); `GET /downloads` devuelve el historial persistido (TASK-047).
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

/** Estado del ciclo de vida de una descarga visto por la API (TASK-006). */
export type DownloadStatus = 'encolada' | 'exito' | 'parcial' | 'fallo';

/** Estado consultable de una descarga encolada (`GET /downloads/{task_id}`). */
export interface DownloadInfo {
  task_id: string;
  estado: DownloadStatus;
  filas: number;
}

/** Estado final persistido en el historial (sin `encolada`, RI-002). */
export type DownloadHistoryStatus = 'exito' | 'parcial' | 'fallo';

/** Rango solicitado de una descarga, en segundos UTC. */
export interface DownloadHistoryRange {
  start: number;
  end: number;
}

/** Fila del historial de descargas (`GET /downloads`, TASK-047). */
export interface DownloadHistoryEntry {
  date: string;
  active: string;
  range: DownloadHistoryRange;
  status: DownloadHistoryStatus;
  rows: number;
}

/** Error de la API al consultar o solicitar una descarga. */
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

/** Extrae el detalle de una respuesta de error o devuelve un mensaje genérico. */
async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    if (typeof body.detail === 'string') return body.detail;
  } catch {
    // Respuesta sin body JSON: se conserva el mensaje genérico.
  }
  return `Error al consultar la descarga (HTTP ${response.status})`;
}

/** Ejecuta un GET y deserializa el JSON, o lanza `DownloadError`. */
async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new DownloadError(response.status, await readErrorDetail(response));
  return (await response.json()) as T;
}

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
  if (!response.ok) throw new DownloadError(response.status, await readErrorDetail(response));
  return (await response.json()) as DownloadAccepted;
}

/**
 * Consulta el estado y las filas obtenidas de una descarga encolada.
 *
 * @param taskId Identificador devuelto por `POST /downloads`.
 * @returns Estado (`encolada`/`exito`/`parcial`/`fallo`) y filas obtenidas.
 * @throws DownloadError si el backend responde con un error HTTP.
 */
export function fetchDownloadStatus(taskId: string): Promise<DownloadInfo> {
  return getJson<DownloadInfo>(`/downloads/${encodeURIComponent(taskId)}`);
}

/**
 * Devuelve el historial de descargas en orden descendente por fecha.
 *
 * @returns Filas con fecha, activo, rango, estado y filas obtenidas.
 * @throws DownloadError si el backend responde con un error HTTP.
 */
export function fetchDownloadHistory(): Promise<DownloadHistoryEntry[]> {
  return getJson<DownloadHistoryEntry[]>('/downloads');
}
