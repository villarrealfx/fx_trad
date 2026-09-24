import { useMemo, useState, type FormEvent } from 'react';
import { ASSET_TYPE_OPTIONS, assetsByType, type AssetType } from '../../catalog';
import { requestDownload } from '../../services/downloads';
import { endOfDayEpoch, isoDay, shiftDays, startOfDayEpoch } from '../../utils/dates';
import Button from '../ui/Button';
import DateRange from '../ui/DateRange';
import Select from '../ui/Select';
import StatusBanner from '../ui/StatusBanner';
import './DownloadForm.css';

/** Ventana máxima de antigüedad: 2 años como 730 días (RNF-003). */
const WINDOW_DAYS = 730;

/** Estado del envío del formulario (SCR-002). */
type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

/** Props del formulario de descarga (SCR-002). */
export interface DownloadFormProps {
  /** Fecha de referencia (ISO) para la ventana de 2 años; por defecto hoy. */
  referenceDate?: string;
}

/**
 * Formulario de descarga de datos históricos (TASK-UI-020, SCR-002).
 *
 * Tipo + activo + rango de fechas, periodicidad base fija (1s UTC) y validación
 * inline (inicio ≤ fin y ventana ≤ 2 años, RNF-003). Encola la descarga
 * (`POST /downloads`, 202) y da feedback con `StatusBanner`; los valores se
 * conservan tras un error.
 */
export default function DownloadForm({ referenceDate }: DownloadFormProps) {
  const reference = referenceDate ?? isoDay(new Date());
  const minDate = shiftDays(reference, -WINDOW_DAYS);

  const [type, setType] = useState<AssetType>('forex');
  const assets = useMemo(() => assetsByType(type), [type]);
  const [asset, setAsset] = useState(assets[0]?.symbol ?? '');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [message, setMessage] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);

  /** Al cambiar el tipo, selecciona el primer activo de esa categoría. */
  function handleTypeChange(next: AssetType): void {
    setType(next);
    setAsset(assetsByType(next)[0]?.symbol ?? '');
  }

  const orderInvalid = start !== '' && end !== '' && start > end;
  const windowInvalid = start !== '' && start < minDate;
  const incomplete = asset === '' || start === '' || end === '';
  const invalid = incomplete || orderInvalid || windowInvalid;

  /** Encola la descarga con el rango convertido a segundos UTC. */
  async function submit(): Promise<void> {
    if (invalid) return;
    setStatus('loading');
    setMessage('');
    try {
      const result = await requestDownload({
        asset,
        start: startOfDayEpoch(start),
        end: endOfDayEpoch(end),
      });
      setTaskId(result.task_id);
      setStatus('success');
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
      <p className="download-form__note">Periodicidad base: 1 segundo (UTC) — fija, no editable.</p>
      {status === 'error' && (
        <StatusBanner
          tone="error"
          message={message}
          actionLabel="Reintentar"
          onAction={() => void submit()}
        />
      )}
      {status === 'success' && (
        <StatusBanner
          tone="success"
          message={`Descarga encolada (task_id: ${taskId ?? ''})`}
          onClose={() => setStatus('idle')}
        />
      )}
      <Button
        label="Iniciar descarga"
        type="submit"
        loading={status === 'loading'}
        disabled={invalid}
      />
    </form>
  );
}
