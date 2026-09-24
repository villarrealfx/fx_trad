import { useState } from 'react';
import { TIMEFRAMES, type Timeframe } from '../../contracts/ohlc';
import ChartPane from '../ChartPane/ChartPane';
import Button from '../ui/Button';
import Select from '../ui/Select';
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
 * Layout de hasta 3 paneles de gráfico (TASK-033, SCR-005).
 *
 * Cada panel es independiente y tiene su propio timeframe; se pueden añadir
 * (hasta 3) y quitar paneles. La sincronización de crosshair/zoom (TASK-034) y
 * el pulido de tabs WAI-ARIA (TASK-UI-050) llegan después.
 */
export default function MultiChart({ symbol }: MultiChartProps) {
  const [panes, setPanes] = useState<readonly PaneConfig[]>(() => [
    { id: nextPaneId(), timeframe: '1h' },
    { id: nextPaneId(), timeframe: '1d' },
  ]);

  /** Añade un panel si no se alcanzó el máximo. */
  function addPane(): void {
    if (panes.length >= MAX_PANES) return;
    setPanes((current) => [...current, { id: nextPaneId(), timeframe: '5m' }]);
  }

  /** Quita un panel (conservando al menos uno). */
  function removePane(id: string): void {
    setPanes((current) =>
      current.length <= 1 ? current : current.filter((pane) => pane.id !== id),
    );
  }

  /** Cambia el timeframe de un panel. */
  function setTimeframe(id: string, timeframe: Timeframe): void {
    setPanes((current) => current.map((pane) => (pane.id === id ? { ...pane, timeframe } : pane)));
  }

  return (
    <section className="multi-chart" aria-label={`Multigráfico de ${symbol}`}>
      <header className="multi-chart__toolbar">
        <span className="multi-chart__symbol">{symbol} · sincronizado</span>
        <Button
          label="Añadir panel"
          variant="ghost"
          onClick={addPane}
          disabled={panes.length >= MAX_PANES}
        />
      </header>
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
              <Button
                label="Quitar panel"
                variant="ghost"
                ariaLabel={`Quitar panel ${index + 1}`}
                onClick={() => removePane(pane.id)}
                disabled={panes.length <= 1}
              />
            </div>
            <div className="multi-chart__graph">
              <ChartPane symbol={symbol} timeframe={pane.timeframe} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
