/**
 * Lista de activos guardados (CMP-006, SCR-001; TASK-UI-010).
 *
 * Tabla semántica con cobertura y estado por activo. Cubre los estados
 * `loading` (esqueleto de filas) y `empty` (CTA para descargar el primer
 * activo), y expone `onGraph` por fila y `onUpdate` (descarga incremental).
 * El estado `error` lo gobierna la pantalla con `StatusBanner`.
 */
import type { AssetRow } from '../../services/assets';
import { formatEpochRange } from '../../utils/dates';
import Button from '../ui/Button';
import './AssetList.css';

/** Filas del esqueleto de carga. */
const SKELETON_ROWS = 3;

/** Props de la lista de activos (CMP-006, SCR-001). */
export interface AssetListProps {
  /** Activos con datos almacenados, en orden canónico. */
  rows: readonly AssetRow[];
  /** Muestra el esqueleto de carga en lugar de la tabla. */
  loading?: boolean;
  /** Abre el gráfico del activo (→ SCR-003). */
  onGraph?: (symbol: string) => void;
  /** Inicia la descarga incremental (→ SCR-002). */
  onUpdate?: () => void;
  /** CTA del estado vacío: descargar el primer activo (→ SCR-002). */
  onDownloadFirst?: () => void;
}

/** Etiqueta visible del estado de cobertura (texto además de color). */
const STATUS_LABELS: Record<AssetRow['status'], string> = {
  completo: 'completo',
  parcial: 'parcial',
};

/**
 * Tabla de activos guardados (CMP-006).
 *
 * @param props Filas, estado de carga y callbacks de acción.
 */
export default function AssetList({
  rows,
  loading = false,
  onGraph,
  onUpdate,
  onDownloadFirst,
}: AssetListProps) {
  if (loading) {
    return (
      <div className="asset-list asset-list--loading" role="status" aria-live="polite">
        <span className="asset-list__loading-text">Cargando activos…</span>
        <div className="asset-list__skeleton" aria-hidden="true">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div className="asset-list__skeleton-row" key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="asset-list asset-list--empty">
        <p className="asset-list__empty-text">
          Aún no tienes activos guardados. Descarga datos para empezar.
        </p>
        {onDownloadFirst !== undefined && (
          <Button label="Descargar mi primer activo" onClick={onDownloadFirst} />
        )}
      </div>
    );
  }

  return (
    <div className="asset-list">
      <table aria-label="Activos guardados">
        <thead>
          <tr>
            <th scope="col">Activo</th>
            <th scope="col">Cobertura</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol}>
              <td className="asset-list__symbol">{row.symbol}</td>
              <td>{formatEpochRange(row.coverage_start, row.coverage_end)}</td>
              <td>
                <span className={`asset-list__status asset-list__status--${row.status}`}>
                  {STATUS_LABELS[row.status]}
                </span>
              </td>
              <td>
                {onGraph !== undefined && (
                  <Button variant="ghost" label="Graficar" onClick={() => onGraph(row.symbol)} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {onUpdate !== undefined && (
        <div className="asset-list__actions">
          <Button variant="ghost" label="Actualizar activos" onClick={onUpdate} />
        </div>
      )}
    </div>
  );
}
