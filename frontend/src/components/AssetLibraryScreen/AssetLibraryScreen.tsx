/**
 * Pantalla SCR-001: biblioteca de activos guardados (TASK-UI-010).
 *
 * Carga `GET /assets` (cobertura y estado) y la última descarga de
 * `GET /downloads`, y orquesta los cinco estados de la pantalla:
 * `loading` (esqueleto), `empty` (CTA a SCR-002), `error` (banner + reintento),
 * `success` (tabla) y `partial` (badge por fila). Los activos se pueden graficar
 * (→ SCR-003) o actualizar con una descarga incremental (→ SCR-002).
 */
import { useCallback, useEffect, useState } from 'react';
import { navigate } from '../../app/useHashRoute';
import { fetchAssets, type AssetRow } from '../../services/assets';
import { fetchDownloadHistory, type DownloadHistoryEntry } from '../../services/downloads';
import { formatHistoryDate } from '../../utils/dates';
import AssetList from '../AssetList/AssetList';
import Button from '../ui/Button';
import StatusBanner from '../ui/StatusBanner';
import './AssetLibraryScreen.css';

/** Props de la pantalla de biblioteca (SCR-001). */
export interface AssetLibraryScreenProps {
  /** Navegación entre pantallas; por defecto usa el router por hash. */
  onNavigate?: (path: string) => void;
}

/**
 * Pantalla de la biblioteca de activos (SCR-001).
 *
 * @param props Callback de navegación inyectable (por defecto, hash router).
 */
export default function AssetLibraryScreen({ onNavigate = navigate }: AssetLibraryScreenProps) {
  const [assets, setAssets] = useState<readonly AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDownload, setLastDownload] = useState<DownloadHistoryEntry | null>(null);

  /** Carga el catálogo y la última descarga registrada. */
  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setAssets(await fetchAssets());
      setError(null);
    } catch (assetsError) {
      setError(
        assetsError instanceof Error ? assetsError.message : 'No se pudo cargar la biblioteca',
      );
    } finally {
      setLoading(false);
    }
    try {
      const history = await fetchDownloadHistory();
      setLastDownload(history[0] ?? null);
    } catch {
      // La última descarga es informativa: si falla, la pantalla sigue operativa.
      setLastDownload(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="asset-library" aria-label="Biblioteca de activos">
      <h2>Activos guardados</h2>
      {error !== null && (
        <StatusBanner
          tone="error"
          message={error}
          actionLabel="Reintentar"
          onAction={() => void load()}
        />
      )}
      {error === null && (
        <>
          <AssetList
            rows={assets}
            loading={loading}
            onGraph={(symbol) => onNavigate(`/open?symbol=${encodeURIComponent(symbol)}`)}
            onUpdate={() => onNavigate('/downloads')}
            onDownloadFirst={() => onNavigate('/downloads')}
          />
          {!loading && assets.length > 0 && (
            <div className="asset-library__actions">
              <Button variant="ghost" label="Abrir gráfico" onClick={() => onNavigate('/open')} />
            </div>
          )}
        </>
      )}
      {lastDownload !== null && (
        <p className="asset-library__last">
          Última descarga: {formatHistoryDate(lastDownload.date)} · {lastDownload.active} ·{' '}
          {lastDownload.rows.toLocaleString('es-ES')} filas
        </p>
      )}
    </section>
  );
}
