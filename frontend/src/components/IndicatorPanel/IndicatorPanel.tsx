import { useState } from 'react';
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
import './IndicatorPanel.css';

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

/** Props del panel de indicadores (CMP-010). */
export interface IndicatorPanelProps {
  /** Lista de indicadores configurados. */
  configs: ReadonlyArray<IndicatorConfig>;
  /** Notifica la lista editada (redibuja el ChartPane). */
  onChange: (configs: IndicatorConfig[]) => void;
}

/**
 * Panel de indicadores (TASK-UI-042, CMP-010).
 *
 * Lista editable de indicadores: añadir, quitar, ocultar y reconfigurar el
 * periodo. Los cambios se delegan al padre, que convierte la lista a
 * `IndicatorParameters` y redibuja el gráfico (RF-013, J-004).
 */
export default function IndicatorPanel({ configs, onChange }: IndicatorPanelProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [newKind, setNewKind] = useState<IndicatorKind>('MA');

  /** Aplica un cambio parcial a un indicador. */
  function update(id: string, patch: Partial<IndicatorConfig>): void {
    onChange(configs.map((config) => (config.id === id ? { ...config, ...patch } : config)));
  }

  /** Quita un indicador del panel. */
  function remove(id: string): void {
    onChange(configs.filter((config) => config.id !== id));
    setOpenId((current) => (current === id ? null : current));
  }

  /** Añade un indicador del tipo seleccionado con su periodo por defecto. */
  function add(): void {
    onChange([
      ...configs,
      {
        id: nextIndicatorId(newKind),
        kind: newKind,
        period: NEW_INDICATOR_PERIOD[newKind],
        visible: true,
      },
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
    <section className="indicator-panel" aria-label="Indicadores">
      <h2 className="indicator-panel__title">Indicadores</h2>
      <ul className="indicator-panel__list">
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
      <div className="indicator-panel__add">
        <Select
          label="Añadir indicador"
          options={KIND_OPTIONS}
          value={newKind}
          onChange={(value) => setNewKind(value as IndicatorKind)}
        />
        <Button label="Añadir" variant="ghost" onClick={add} />
      </div>
    </section>
  );
}
