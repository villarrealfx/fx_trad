import { useEffect, useRef, useState } from 'react';
import {
  NEW_INDICATOR_PERIOD,
  indicatorLabel,
  type IndicatorConfig,
  type IndicatorKind,
} from '../../indicators/config';
import { ATR_SERIES_COLOR, MA_SERIES_COLORS, RSI_SERIES_COLOR } from '../ChartPane/theme';
import IndicatorItem from '../IndicatorItem/IndicatorItem';
import Button from '../ui/Button';
import Select from '../ui/Select';
import './IndicatorForm.css';

/** Opciones de tipo de indicador para añadir. */
const KIND_OPTIONS = [
  { value: 'MA', label: 'Media móvil (MA)' },
  { value: 'RSI', label: 'RSI' },
  { value: 'ATR', label: 'ATR' },
];

/** Contador de secuencia para ids únicos de nuevos indicadores. */
let indicatorSequence = 0;

/** Genera un id único para un indicador nuevo. */
function nextIndicatorId(kind: IndicatorKind): string {
  indicatorSequence += 1;
  return `${kind.toLowerCase()}-${indicatorSequence}`;
}

/** Props del formulario flotante de indicadores (CMP-016). */
export interface IndicatorFormProps {
  /** Si el popover está abierto. */
  open: boolean;
  /** Indicadores configurados (estado del padre; persiste al cerrar). */
  configs: ReadonlyArray<IndicatorConfig>;
  /** Notifica la lista editada (redibuja el gráfico). */
  onChange: (configs: IndicatorConfig[]) => void;
  /** Cierra el popover sin descartar los indicadores. */
  onClose: () => void;
}

/**
 * Formulario flotante de indicadores (CMP-016, ADR-019, RF-203).
 *
 * Popover **no modal** anclado al gráfico: lista los indicadores con sus
 * acciones (mostrar/ocultar, configurar, eliminar) y permite añadir tipos
 * existentes (MA/RSI/ATR). Al cerrarse (`✕`/`Escape`) solo se oculta: los
 * indicadores viven en el padre y persisten. Navegable por teclado.
 */
export default function IndicatorForm({
  open,
  configs,
  onChange,
  onClose,
}: IndicatorFormProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [newKind, setNewKind] = useState<IndicatorKind>('MA');
  const [openId, setOpenId] = useState<string | null>(null);

  // Al abrir, lleva el foco al contenedor para habilitar Escape/teclado.
  useEffect(() => {
    if (open) containerRef.current?.focus();
  }, [open]);

  if (!open) return null;

  /** Aplica un cambio parcial a un indicador. */
  function update(id: string, patch: Partial<IndicatorConfig>): void {
    onChange(configs.map((config) => (config.id === id ? { ...config, ...patch } : config)));
  }

  /** Quita un indicador de la lista. */
  function remove(id: string): void {
    onChange(configs.filter((config) => config.id !== id));
    setOpenId((current) => (current === id ? null : current));
  }

  /** Añade un indicador del tipo por defecto seleccionado. */
  function add(kind: IndicatorKind): void {
    onChange([
      ...configs,
      { id: nextIndicatorId(kind), kind, period: NEW_INDICATOR_PERIOD[kind], visible: true },
    ]);
  }

  /** Colores de serie alineados con el ChartPane (MA rota por índice). */
  let maIndex = 0;
  const items = configs.map((config) => {
    let color: string;
    if (config.kind === 'MA') {
      color = MA_SERIES_COLORS[maIndex % MA_SERIES_COLORS.length];
      maIndex += 1;
    } else {
      color = config.kind === 'ATR' ? ATR_SERIES_COLOR : RSI_SERIES_COLOR;
    }
    return { config, color };
  });

  return (
    <div
      className="indicator-form"
      role="dialog"
      aria-label="Indicadores"
      tabIndex={-1}
      ref={containerRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="indicator-form__header">
        <h2 className="indicator-form__title">Indicadores</h2>
        <button
          type="button"
          className="indicator-form__close"
          aria-label="Cerrar indicadores"
          title="Cerrar"
          onClick={onClose}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      {items.length === 0 ? (
        <p className="indicator-form__empty">Sin indicadores. Añade uno para empezar.</p>
      ) : (
        <ul className="indicator-form__list">
          {items.map(({ config, color }) => (
            <IndicatorItem
              key={config.id}
              id={config.id}
              name={indicatorLabel(config)}
              period={config.period}
              visible={config.visible}
              configOpen={openId === config.id}
              color={color}
              onToggleConfig={() =>
                setOpenId((current) => (current === config.id ? null : config.id))
              }
              onToggleVisible={() => update(config.id, { visible: !config.visible })}
              onPeriodChange={(period) => update(config.id, { period })}
              onRemove={() => remove(config.id)}
            />
          ))}
        </ul>
      )}
      <div className="indicator-form__add">
        <Select
          label="Añadir indicador"
          options={KIND_OPTIONS}
          value={newKind}
          onChange={(value) => setNewKind(value as IndicatorKind)}
        />
        <Button label="Añadir" variant="ghost" onClick={() => add(newKind)} />
      </div>
    </div>
  );
}
