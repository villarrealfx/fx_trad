import type { IndicatorParameters } from '../../indicators/indicators';
import { ATR_SERIES_COLOR, MA_SERIES_COLORS, RSI_SERIES_COLOR } from '../ChartPane/theme';
import './IndicatorPanel.css';

export interface IndicatorPanelProps {
  /** Parámetros activos de los indicadores (RF-013). */
  readonly params: IndicatorParameters;
  /** Notifica los parámetros editados (redibuja el ChartPane). */
  readonly onChange: (params: IndicatorParameters) => void;
}

/** Parsea un periodo desde el input; devuelve null si no es un entero ≥ 1. */
function parsePeriod(raw: string): number | null {
  const period = Number.parseInt(raw, 10);
  if (Number.isNaN(period) || period < 1) return null;
  return period;
}

/**
 * Panel de parámetros de los indicadores (TASK-032, RF-013).
 *
 * Controlado: muestra los periodos activos con sus colores y permite editar
 * cada ventana (MA/RSI/ATR). Los labels son visibles (a11y F003) y los cambios
 * se delegan al padre para que el ChartPane recompute y redibuje (J-004).
 */
export default function IndicatorPanel({ params, onChange }: IndicatorPanelProps) {
  function updateMa(index: number, raw: string): void {
    const period = parsePeriod(raw);
    if (period === null) return;
    const maPeriods = params.maPeriods.map((value, i) => (i === index ? period : value));
    onChange({ ...params, maPeriods });
  }

  function updateRsi(raw: string): void {
    const period = parsePeriod(raw);
    if (period === null) return;
    onChange({ ...params, rsiPeriod: period });
  }

  function updateAtr(raw: string): void {
    const period = parsePeriod(raw);
    if (period === null) return;
    onChange({ ...params, atrPeriod: period });
  }

  return (
    <section className="indicator-panel" aria-label="Indicadores">
      <h2 className="indicator-panel__title">Indicadores</h2>
      <ul className="indicator-panel__list">
        {params.maPeriods.map((period, index) => (
          <li key={`ma-${index}`} className="indicator-panel__row">
            <span
              className="indicator-panel__dot"
              style={{ background: MA_SERIES_COLORS[index % MA_SERIES_COLORS.length] }}
              aria-hidden="true"
            />
            <label className="indicator-panel__label" htmlFor={`indicator-ma-${index}`}>
              MA {period}
            </label>
            <input
              id={`indicator-ma-${index}`}
              className="indicator-panel__input"
              type="number"
              min={1}
              step={1}
              value={period}
              onChange={(event) => updateMa(index, event.target.value)}
            />
          </li>
        ))}
        <li className="indicator-panel__row">
          <span
            className="indicator-panel__dot"
            style={{ background: ATR_SERIES_COLOR }}
            aria-hidden="true"
          />
          <label className="indicator-panel__label" htmlFor="indicator-atr">
            ATR
          </label>
          <input
            id="indicator-atr"
            className="indicator-panel__input"
            type="number"
            min={1}
            step={1}
            value={params.atrPeriod}
            onChange={(event) => updateAtr(event.target.value)}
          />
        </li>
        <li className="indicator-panel__row">
          <span
            className="indicator-panel__dot"
            style={{ background: RSI_SERIES_COLOR }}
            aria-hidden="true"
          />
          <label className="indicator-panel__label" htmlFor="indicator-rsi">
            RSI
          </label>
          <input
            id="indicator-rsi"
            className="indicator-panel__input"
            type="number"
            min={1}
            step={1}
            value={params.rsiPeriod}
            onChange={(event) => updateRsi(event.target.value)}
          />
        </li>
      </ul>
    </section>
  );
}
