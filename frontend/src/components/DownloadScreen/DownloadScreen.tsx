/**
 * Pantalla SCR-002: descarga de datos históricos (TASK-UI-020/021).
 *
 * Compone el formulario, el progreso asíncrono y el historial con sus estados
 * (`loading`/`empty`/`error`/`success`/`partial`). Al completarse una descarga
 * recarga el historial y anuncia el resultado; una fila `parcial` sugiere
 * completar el rango pendiente (incremental RF-006).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  fetchDownloadHistory,
  type DownloadHistoryEntry,
  type DownloadInfo,
} from '../../services/downloads';
import { epochToIsoDay } from '../../utils/dates';
import DownloadForm from '../DownloadForm/DownloadForm';
import type { DownloadPrefill } from '../DownloadForm/DownloadForm';
import DownloadHistory from '../DownloadHistory/DownloadHistory';
import DownloadProgress from '../DownloadProgress/DownloadProgress';
import type { QueuedDownload } from '../DownloadProgress/DownloadProgress';
import StatusBanner from '../ui/StatusBanner';
import './DownloadScreen.css';

/** Mensaje del banner de resultado de una descarga terminada. */
function settledMessage(result: DownloadInfo): string {
  const rows = result.filas.toLocaleString('es-ES');
  if (result.estado === 'exito') return `Descarga completada: ${rows} velas.`;
  if (result.estado === 'parcial') {
    return `Descarga parcial: ${rows} velas. Usa "Completar rango" para la incremental.`;
  }
  return 'La descarga falló. Revisa el historial e inténtalo de nuevo.';
}

/**
 * Pantalla de descarga de datos históricos (SCR-002).
 */
export default function DownloadScreen() {
  const [entries, setEntries] = useState<readonly DownloadHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<QueuedDownload | null>(null);
  const [settled, setSettled] = useState<DownloadInfo | null>(null);
  const [prefill, setPrefill] = useState<DownloadPrefill | null>(null);

  /** Carga el historial persistido (`GET /downloads`, TASK-047). */
  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      setEntries(await fetchDownloadHistory());
      setHistoryError(null);
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : 'No se pudo cargar el historial de descargas',
      );
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  /** Sigue la descarga recién encolada y limpia el resultado anterior. */
  function handleQueued(task: QueuedDownload): void {
    setSettled(null);
    setActiveTask(task);
  }

  /** Al terminar, deja de seguir la tarea, anuncia el resultado y recarga. */
  function handleSettled(result: DownloadInfo): void {
    setActiveTask(null);
    setSettled(result);
    void loadHistory();
  }

  /** Ofrece completar el rango de una descarga parcial en el formulario. */
  function handleCompleteRange(entry: DownloadHistoryEntry): void {
    setPrefill({
      asset: entry.active,
      start: epochToIsoDay(entry.range.start),
      end: epochToIsoDay(entry.range.end),
    });
  }

  return (
    <section className="download-screen" aria-label="Descarga de datos históricos">
      <h2>Descargar datos históricos</h2>
      <DownloadForm onQueued={handleQueued} prefill={prefill} disabled={activeTask !== null} />
      {activeTask !== null && <DownloadProgress task={activeTask} onSettled={handleSettled} />}
      {settled !== null && settled.estado === 'exito' && (
        <StatusBanner
          tone="success"
          message={settledMessage(settled)}
          autoDismissMs={5000}
          onClose={() => setSettled(null)}
        />
      )}
      {settled !== null && settled.estado === 'parcial' && (
        <StatusBanner tone="warning" message={settledMessage(settled)} />
      )}
      {settled !== null && settled.estado === 'fallo' && (
        <StatusBanner tone="error" message={settledMessage(settled)} />
      )}
      {historyError !== null && (
        <StatusBanner
          tone="error"
          message={historyError}
          actionLabel="Reintentar"
          onAction={() => void loadHistory()}
        />
      )}
      <DownloadHistory entries={entries} onCompleteRange={handleCompleteRange} />
    </section>
  );
}
