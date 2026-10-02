import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { fetchCatalog, type AssetRow, type AssetType } from '../../services/assets';
import { requestDownload } from '../../services/downloads';
import { endOfDayEpoch, isoDay, shiftDays, startOfDayEpoch } from '../../utils/dates';
import Button from '../ui/Button';
import DateRange from '../ui/DateRange';
import Select from '../ui/Select';
import StatusBanner from '../ui/StatusBanner';
import type { QueuedDownload } from '../DownloadProgress/DownloadProgress';
import './DownloadForm.css';

/** Ventana máxima de antigüedad: 2 años como 730 días (RNF-003). */
const WINDOW_DAYS = 730;

/** Opciones de tipo de activo (glosario: forex / metal / petróleo). */
const ASSET_TYPE_OPTIONS = [
  { value: 'forex', label: 'Forex' },
  { value: 'metal', label: 'Metal' },
  { value: 'oil', label: 'Petróleo' },
];

/** Estado del envío del formulario (SCR-002). */
type SubmitStatus = 'idle' | 'loading' | 'error';

/** Rango sugerido para completar una descarga parcial (RF-006). */
export interface DownloadPrefill {
  asset: string;
  start: string;
  end: string;
}

/** Props del formulario de descarga (SCR-002). */
export interface DownloadFormProps {
  /** Fecha de referencia (ISO) para la ventana de 2 años; por defecto hoy. */
  referenceDate?: string;
  /** Notifica la descarga encolada para seguir su progreso (TASK-UI-021). */
  onQueued?: (queued: QueuedDownload) => void;
  /** Rango a completar sugerido por el historial (`parcial`, RF-006). */
  prefill?: DownloadPrefill | null;
  /** Deshabilita el formulario mientras hay una descarga en curso. */
  disabled?: boolean;
}

/**
 * Formulario de descarga de datos históricos (TASK-UI-020/021, SCR-002).
 *
 * Tipo + activo + rango de fechas, periodicidad base fija (1m UTC) y validación
 * inline (inicio ≤ fin y ventana ≤ 2 años, RNF-003). Al encolar (`POST
 * /downloads`, 202) notifica la tarea por `onQueued`; los valores se conservan
 * tras un error. Acepta `prefill` para completar el rango de una descarga
 * parcial y `disabled` mientras hay una descarga en curso.
 */
export default function DownloadForm({
  referenceDate,
  onQueued,
  prefill,
  disabled = false,
}: DownloadFormProps) {
  const reference = referenceDate ?? isoDay(new Date());
  const minDate = shiftDays(reference, -WINDOW_DAYS);

  const [catalog, setCatalog] = useState<readonly AssetRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [type, setType] = useState<AssetType>('forex');
  const assets = useMemo(() => catalog.filter((item) => item.type === type), [catalog, type]);
  const [asset, setAsset] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [message, setMessage] = useState('');

  /** Carga el catálogo canónico completo (`GET /assets?scope=all`, RF-216). */
  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    fetchCatalog()
      .then((rows) => {
        if (cancelled) return;
        setCatalog(rows);
        setCatalogError(null);
        setCatalogLoading(false);
        setAsset(rows[0]?.symbol ?? '');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCatalogError(
          error instanceof Error ? error.message : 'No se pudo cargar el catálogo de activos',
        );
        setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (prefill == null) return;
    const found = catalog.find((item) => item.symbol === prefill.asset);
    if (found !== undefined) setType(found.type);
    setAsset(prefill.asset);
    setStart(prefill.start);
    setEnd(prefill.end);
  }, [prefill, catalog]);

  /** Al cambiar el tipo, selecciona el primer activo de esa categoría. */
  function handleTypeChange(next: AssetType): void {
    setType(next);
    setAsset(catalog.find((item) => item.type === next)?.symbol ?? '');
  }

  const orderInvalid = start !== '' && end !== '' && start > end;
  const windowInvalid = start !== '' && start < minDate;
  const incomplete = asset === '' || start === '' || end === '';
  const invalid = incomplete || orderInvalid || windowInvalid;

  /** Encola la descarga con el rango convertido a segundos UTC. */
  async function submit(): Promise<void> {
    if (invalid || disabled) return;
    setStatus('loading');
    setMessage('');
    const startEpoch = startOfDayEpoch(start);
    const endEpoch = endOfDayEpoch(end);
    try {
      const result = await requestDownload({ asset, start: startEpoch, end: endEpoch });
      setStatus('idle');
      onQueued?.({ taskId: result.task_id, asset, start: startEpoch, end: endEpoch });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al solicitar la descarga');
      setStatus('error');
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submit();
  }

  const assetOptions = assets.map((item) => ({ value: item.symbol, label: item.symbol }));

  return (
    <form
      className="download-form"
      aria-label="Descarga de datos históricos"
      onSubmit={handleSubmit}
    >
      <fieldset className="download-form__fieldset" disabled={disabled || catalogLoading}>
        <div className="download-form__grid">
          <Select
            label="Tipo"
            options={ASSET_TYPE_OPTIONS}
            value={type}
            onChange={(value) => handleTypeChange(value as AssetType)}
          />
          <Select label="Activo" options={assetOptions} value={asset} onChange={setAsset} />
          <DateRange
            start={start}
            end={end}
            min={minDate}
            onChange={(value) => {
              setStart(value.start);
              setEnd(value.end);
            }}
          />
        </div>
      </fieldset>
      <p className="download-form__note">Periodicidad base: 1 minuto (UTC) — fija, no editable.</p>
      {catalogLoading && (
        <p className="download-form__note" role="status">
          Cargando catálogo de activos…
        </p>
      )}
      {catalogError !== null && <StatusBanner tone="error" message={catalogError} />}
      {status === 'error' && (
        <StatusBanner
          tone="error"
          message={message}
          actionLabel="Reintentar"
          onAction={() => void submit()}
        />
      )}
      <Button
        label="Iniciar descarga"
        type="submit"
        loading={status === 'loading'}
        disabled={invalid || disabled}
      />
    </form>
  );
}
