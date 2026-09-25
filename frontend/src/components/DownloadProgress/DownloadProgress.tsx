/**
 * Progreso de una descarga asíncrona (TASK-UI-021, SCR-002).
 *
 * Consulta `GET /downloads/{task_id}` (TASK-006) mientras la tarea sigue
 * `encolada` y muestra una `ProgressBar` determinista: el avance procede de
 * las filas reales obtenidas, no de un temporizador (sin timeout visual). Al
 * alcanzar un estado terminal (`exito`/`parcial`/`fallo`) deja de consultar y
 * notifica el resultado una sola vez.
 */
import { useEffect, useRef, useState } from 'react';
import { fetchDownloadStatus, type DownloadInfo } from '../../services/downloads';
import { formatEpochRange } from '../../utils/dates';
import ProgressBar from '../ui/ProgressBar';
import type { ProgressStatus } from '../ui/ProgressBar';
import StatusBanner from '../ui/StatusBanner';
import './DownloadProgress.css';

/** Descarga recién encolada que se va a seguir. */
export interface QueuedDownload {
  /** Identificador de la tarea devuelto por `POST /downloads`. */
  taskId: string;
  /** Activo descargado. */
  asset: string;
  /** Inicio del rango en segundos UTC. */
  start: number;
  /** Fin del rango en segundos UTC. */
  end: number;
}

/** Props del progreso de descarga (SCR-002). */
export interface DownloadProgressProps {
  /** Descarga encolada a seguir. */
  task: QueuedDownload;
  /** Se llama una sola vez cuando la descarga alcanza un estado terminal. */
  onSettled: (result: DownloadInfo) => void;
  /** Intervalo de consulta en ms (default 2000). */
  pollIntervalMs?: number;
}

/** Texto de dominio del estado consultado. */
function stateText(info: DownloadInfo | null): string {
  if (info === null) return 'Descarga en curso…';
  if (info.estado === 'exito')
    return `Descarga completada: ${info.filas.toLocaleString('es-ES')} velas`;
  if (info.estado === 'parcial')
    return `Descarga parcial: ${info.filas.toLocaleString('es-ES')} velas`;
  if (info.estado === 'fallo') return 'La descarga falló';
  return 'Descarga en curso…';
}

/**
 * Barra de progreso de una descarga asíncrona (CMP-013, SCR-002).
 *
 * @param props Tarea a seguir, callback terminal e intervalo de consulta.
 */
export default function DownloadProgress({
  task,
  onSettled,
  pollIntervalMs = 2000,
}: DownloadProgressProps) {
  const [info, setInfo] = useState<DownloadInfo | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    settledRef.current = false;
    setInfo(null);
    setQueryError(null);
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    /** Consulta el estado; al ser terminal detiene el polling y notifica. */
    async function poll(): Promise<void> {
      try {
        const next = await fetchDownloadStatus(task.taskId);
        if (cancelled) return;
        setInfo(next);
        setQueryError(null);
        if (next.estado !== 'encolada') {
          if (timer !== null) clearInterval(timer);
          if (!settledRef.current) {
            settledRef.current = true;
            onSettledRef.current(next);
          }
        }
      } catch (error) {
        if (cancelled) return;
        if (timer !== null) clearInterval(timer);
        setQueryError(error instanceof Error ? error.message : 'No se pudo consultar el estado');
      }
    }

    timer = setInterval(() => void poll(), pollIntervalMs);
    void poll();
    return () => {
      cancelled = true;
      if (timer !== null) clearInterval(timer);
    };
  }, [task.taskId, pollIntervalMs, attempt]);

  const expected = Math.max(1, task.end - task.start + 1);
  const complete = info?.estado === 'exito';
  const percent = complete
    ? 100
    : info !== null
      ? Math.min(100, Math.round((info.filas / expected) * 100))
      : 0;
  const status: ProgressStatus = complete
    ? 'complete'
    : info !== null && info.estado !== 'encolada'
      ? 'paused'
      : 'running';

  return (
    <section className="download-progress" aria-label="Descarga en curso">
      <ProgressBar
        percent={percent}
        label={`${task.asset} ${formatEpochRange(task.start, task.end)}`}
        status={status}
      />
      <p className="download-progress__state" role="status" aria-live="polite">
        {stateText(info)}
      </p>
      {queryError !== null && (
        <StatusBanner
          tone="error"
          message={queryError}
          actionLabel="Reintentar"
          onAction={() => setAttempt((value) => value + 1)}
        />
      )}
    </section>
  );
}
