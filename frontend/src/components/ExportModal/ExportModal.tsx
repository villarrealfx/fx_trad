import { useEffect, useState } from 'react';
import {
  EXPORT_FORMATS,
  EXPORT_SCALES,
  downloadBlob,
  exportChartPng,
  type ExportFormat,
  type ExportScale,
} from '../../export';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import RadioGroup from '../ui/RadioGroup';
import StatusBanner from '../ui/StatusBanner';
import './ExportModal.css';

/** Estado del flujo de export (interaction-specs SCR-006). */
type ExportStatus = 'idle' | 'loading' | 'error' | 'empty';

/** Props del modal de export (CMP-014, SCR-006). */
export interface ExportModalProps {
  /** Controla la visibilidad. */
  open: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Compone el lienzo a la escala pedida; `null` si no hay gráfico. */
  compose: (scale: ExportScale) => HTMLCanvasElement | null;
  /** Símbolo del activo (preview/alt y nombre de archivo). */
  symbol: string;
  /** Timeframe (preview/alt y nombre de archivo). */
  timeframe: string;
  /** Nota de exclusión para el estado partial (pane sin datos). */
  partialNote?: string;
  /** Se llama tras descargar, con el nombre de archivo generado. */
  onExported?: (filename: string) => void;
}

/** Etiquetas de resolución (P-2: default 2x). */
const SCALE_LABELS: Record<ExportScale, string> = {
  1: '1x (1:1)',
  2: '2x (nice)',
  4: '4x (máx.)',
};

/** Etiquetas de formato (P-2: default PNG). */
const FORMAT_LABELS: Record<ExportFormat, string> = { png: 'PNG', webp: 'WebP' };

const SCALE_OPTIONS = EXPORT_SCALES.map((scale) => ({
  value: String(scale),
  label: SCALE_LABELS[scale],
}));
const FORMAT_OPTIONS = EXPORT_FORMATS.map((format) => ({
  value: format,
  label: FORMAT_LABELS[format],
}));

/**
 * Modal de exportación de captura (CMP-014, SCR-006, RF-015).
 *
 * Reúne resolución/formato (`RadioGroup`), vista previa accesible y todos los
 * estados de la interacción: loading (`aria-busy`), empty (sin gráfico), error
 * (con reintento), partial (nota de exclusión) y success (descarga + cierre +
 * Toast, delegado al consumidor vía `onExported`). El focus trap, Escape y la
 * gestión de foco los aporta `Modal`.
 */
export default function ExportModal({
  open,
  onClose,
  compose,
  symbol,
  timeframe,
  partialNote,
  onExported,
}: ExportModalProps) {
  const [scale, setScale] = useState<ExportScale>(2);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /** Regenera la vista previa al abrir o cambiar la resolución. */
  useEffect(() => {
    if (!open) return;
    const canvas = compose(scale);
    if (canvas === null) {
      setPreviewUrl(null);
      setStatus('empty');
      return;
    }
    setPreviewUrl(canvas.toDataURL('image/png'));
    setStatus('idle');
  }, [open, scale, compose]);

  /** Genera el PNG, dispara la descarga y cierra con confirmación. */
  async function handleDownload(): Promise<void> {
    setStatus('loading');
    try {
      const canvas = compose(scale);
      const result = await exportChartPng({ canvas, symbol, timeframe, scale, format });
      downloadBlob(result.blob, result.filename);
      onExported?.(result.filename);
      onClose();
    } catch {
      setStatus('error');
    }
  }

  const isEmpty = status === 'empty' || previewUrl === null;
  const isLoading = status === 'loading';

  return (
    <Modal
      open={open}
      title="Exportar captura"
      onClose={onClose}
      loading={isLoading}
      footer={
        <>
          <Button label="Cancelar" variant="ghost" onClick={onClose} />
          <Button
            label={`Descargar ${FORMAT_LABELS[format]}`}
            onClick={handleDownload}
            disabled={isEmpty}
            loading={isLoading}
          />
        </>
      }
    >
      <p className="export-modal__intro">
        Incluye: velas + dibujos + indicadores + anotaciones (ticker/TF).
      </p>
      <div className="export-modal__options">
        <RadioGroup
          name="export-scale"
          legend="Resolución"
          options={SCALE_OPTIONS}
          value={String(scale)}
          onChange={(value) => setScale(Number(value) as ExportScale)}
        />
        <RadioGroup
          name="export-format"
          legend="Formato"
          options={FORMAT_OPTIONS}
          value={format}
          onChange={(value) => setFormat(value as ExportFormat)}
        />
      </div>
      {partialNote !== undefined && <StatusBanner tone="warning" message={partialNote} />}
      {status === 'error' && (
        <StatusBanner
          tone="error"
          message="No se pudo generar la imagen"
          actionLabel="Reintentar"
          onAction={handleDownload}
        />
      )}
      <div className="export-modal__preview">
        {previewUrl !== null ? (
          <img
            className="export-modal__image"
            src={previewUrl}
            alt={`Vista previa del gráfico ${symbol} ${timeframe}`}
          />
        ) : (
          <p className="export-modal__empty">No hay gráfico que exportar</p>
        )}
      </div>
    </Modal>
  );
}
