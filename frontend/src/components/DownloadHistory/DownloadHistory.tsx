/**
 * Historial de descargas de la pantalla SCR-002 (TASK-UI-021, RI-002).
 *
 * Muestra las descargas persistidas que expone `GET /downloads` (TASK-047)
 * con fecha, rango, estado y filas. Sin filas el bloque queda oculto (estado
 * `empty`); una fila `parcial` sugiere completar el rango pendiente para la
 * descarga incremental (RF-006).
 */
import { Fragment } from 'react';
import type { DownloadHistoryEntry } from '../../services/downloads';
import { formatEpochRange, formatHistoryDate } from '../../utils/dates';
import Button from '../ui/Button';
import './DownloadHistory.css';

/** Props del historial de descargas (SCR-002). */
export interface DownloadHistoryProps {
  /** Filas del historial, en orden descendente por fecha. */
  entries: readonly DownloadHistoryEntry[];
  /** Al pedir completar una descarga `parcial` (incremental, RF-006). */
  onCompleteRange?: (entry: DownloadHistoryEntry) => void;
}

/** Etiqueta visible del estado de una descarga. */
const STATUS_LABELS: Record<DownloadHistoryEntry['status'], string> = {
  exito: 'éxito',
  parcial: 'parcial',
  fallo: 'fallo',
};

/** Clave estable de una fila del historial. */
function entryKey(entry: DownloadHistoryEntry): string {
  return `${entry.active}-${entry.range.start}-${entry.range.end}-${entry.date}`;
}

/**
 * Tabla del historial de descargas (CMP-006-like, SCR-002).
 *
 * @param props Filas del historial y acción de completar rango parcial.
 */
export default function DownloadHistory({ entries, onCompleteRange }: DownloadHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <section className="download-history" aria-label="Historial de descargas">
      <h3 className="download-history__title">Historial</h3>
      <table aria-label="Descargas realizadas">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Rango</th>
            <th scope="col">Estado</th>
            <th scope="col">Filas</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <Fragment key={entryKey(entry)}>
              <tr>
                <td>{formatHistoryDate(entry.date)}</td>
                <td>{formatEpochRange(entry.range.start, entry.range.end)}</td>
                <td>
                  <span
                    className={`download-history__status download-history__status--${entry.status}`}
                  >
                    {STATUS_LABELS[entry.status]}
                  </span>
                </td>
                <td className="download-history__rows">{entry.rows.toLocaleString('es-ES')}</td>
              </tr>
              {entry.status === 'parcial' && onCompleteRange !== undefined && (
                <tr className="download-history__suggestion">
                  <td colSpan={4}>
                    Falta completar {formatEpochRange(entry.range.start, entry.range.end)} del
                    activo {entry.active}.
                    <Button
                      variant="ghost"
                      label="Completar rango"
                      onClick={() => onCompleteRange(entry)}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </section>
  );
}
