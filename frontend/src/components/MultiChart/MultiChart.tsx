import { useState } from 'react';
import { ChartSyncController } from '../../charting/chart-sync';
import { TIMEFRAMES, type Candle, type Timeframe } from '../../contracts/ohlc';
import { toIndicatorParameters, type IndicatorConfig } from '../../indicators/config';
import ChartPane from '../ChartPane/ChartPane';
import IndicatorForm from '../IndicatorForm/IndicatorForm';
import Select from '../ui/Select';
import Tab from '../ui/Tab';
import './MultiChart.css';

/** Máximo de paneles simultáneos (RF-014). */
const MAX_PANES = 3;

/** Opciones de timeframe por panel. */
const TIMEFRAME_OPTIONS = TIMEFRAMES.map((timeframe) => ({
  value: timeframe,
  label: timeframe,
}));

/** Configuración de un panel del multigráfico. */
interface PaneConfig {
  id: string;
  timeframe: Timeframe;
}

/** Contador de secuencia para ids únicos de paneles. */
let paneSequence = 0;

/** Genera un id único para un panel nuevo. */
function nextPaneId(): string {
  paneSequence += 1;
  return `pane-${paneSequence}`;
}

/** Props del multigráfico (SCR-005). */
export interface MultiChartProps {
  /** Activo base compartido por los paneles. */
  symbol: string;
}

/**
 * Multigráfico de hasta 3 paneles con tabs WAI-ARIA (TASK-033/034/UI-050, SCR-005).
 *
 * Los paneles se gestionan con `Tab` (CMP-011): `tablist` navegable por flechas,
 * botón de añadir deshabilitado al llegar a 3 (con tooltip) y cierre por tab.
 * Cada panel tiene su timeframe y comparte `ChartSyncController` (RF-014); la
 * leyenda inferior combina el último cierre de cada panel.
 */
export default function MultiChart({ symbol }: MultiChartProps) {
  const [sync] = useState(() => new ChartSyncController());
  const [panes, setPanes] = useState<readonly PaneConfig[]>(() => [
    { id: nextPaneId(), timeframe: '1h' },
    { id: nextPaneId(), timeframe: '1d' },
  ]);
  const [activeId, setActiveId] = useState<string>(() => panes[0]?.id ?? '');
  const [legends, setLegends] = useState<Record<string, Candle | null>>({});
  // Indicadores compartidos por todos los panes (RF-203, TASK-UI-280).
  const [configs, setConfigs] = useState<readonly IndicatorConfig[]>([]);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);

  /** Añade un panel (hasta 3) y lo activa. */
  function addPane(): void {
    if (panes.length >= MAX_PANES) return;
    const pane: PaneConfig = { id: nextPaneId(), timeframe: '5m' };
    setPanes((current) => [...current, pane]);
    setActiveId(pane.id);
  }

  /** Quita un panel (conservando al menos uno). */
  function removePane(id: string): void {
    if (panes.length <= 1) return;
    const next = panes.filter((pane) => pane.id !== id);
    setPanes(next);
    if (activeId === id) setActiveId(next[0]?.id ?? '');
  }

  /** Cambia el timeframe de un panel. */
  function setTimeframe(id: string, timeframe: Timeframe): void {
    setPanes((current) => current.map((pane) => (pane.id === id ? { ...pane, timeframe } : pane)));
  }

  const tabs = panes.map((pane) => ({ id: pane.id, label: pane.timeframe }));

  return (
    <section className="multi-chart" aria-label={`Multigráfico de ${symbol}`}>
      <IndicatorForm
        open={indicatorsOpen}
        configs={configs}
        onChange={setConfigs}
        onClose={() => setIndicatorsOpen(false)}
      />
      <Tab
        tabs={tabs}
        active={activeId}
        onChange={setActiveId}
        onAdd={addPane}
        addDisabled={panes.length >= MAX_PANES}
        addTitle="Máximo 3 paneles"
        onRemove={removePane}
        label="Paneles del multigráfico"
      />
      <div className="multi-chart__grid" data-panes={panes.length}>
        {panes.map((pane, index) => (
          <article className="multi-chart__pane" key={pane.id} aria-label={`Panel ${index + 1}`}>
            <div className="multi-chart__pane-tools">
              <Select
                label={`Timeframe del panel ${index + 1}`}
                options={TIMEFRAME_OPTIONS}
                value={pane.timeframe}
                onChange={(value) => setTimeframe(pane.id, value as Timeframe)}
              />
            </div>
            <div className="multi-chart__graph">
              <ChartPane
                symbol={symbol}
                timeframe={pane.timeframe}
                sync={sync}
                syncId={pane.id}
                indicators={toIndicatorParameters(configs)}
                indicatorsOpen={indicatorsOpen}
                onOpenIndicators={() => setIndicatorsOpen((value) => !value)}
                onLegend={(candle) => setLegends((current) => ({ ...current, [pane.id]: candle }))}
              />
            </div>
          </article>
        ))}
      </div>
      <footer className="multi-chart__legend" aria-label="Leyenda combinada">
        {panes.map((pane) => {
          const candle = legends[pane.id];
          return (
            <span className="multi-chart__legend-item" key={pane.id}>
              {pane.timeframe}: C {candle ? candle.close.toFixed(5) : '—'}
            </span>
          );
        })}
      </footer>
    </section>
  );
}
