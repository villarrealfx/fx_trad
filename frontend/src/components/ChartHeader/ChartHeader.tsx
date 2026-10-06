import type { Timeframe } from '../../contracts/ohlc';
import TimeframeSelector from '../TimeframeSelector/TimeframeSelector';
import './ChartHeader.css';

/** Props del header del gráfico (CMP-017, `components.md`). */
export interface ChartHeaderProps {
  /** Símbolo del activo (p. ej. EURUSD). */
  symbol: string;
  /** Timeframe activo (p. ej. 1h). */
  timeframe: Timeframe;
  /** Estado abierto del formulario de indicadores (RF-203). */
  indicatorsOpen: boolean;
  /** Abre/cierra el formulario de indicadores (RF-203). */
  onOpenIndicators: () => void;
  /** Dispara la exportación de la captura (RF-205). */
  onExport: () => void;
  /** Ajusta la vista a toda la serie (atajo `1`). */
  onFit: () => void;
  /** Deshabilita las acciones (p. ej. mientras carga). */
  disabled?: boolean;
  /**
   * Notifica el cambio de timeframe (RF-406, TASK-UI-403).
   *
   * Si se omite, el header no muestra el selector: los usos que no cambian de
   * escala (p. ej. el multigráfico) siguen funcionando igual.
   */
  onChangeTimeframe?: (timeframe: Timeframe) => void;
}

/**
 * Header del gráfico (CMP-017, SCR-004/005).
 *
 * Agrupa el título `símbolo · timeframe`, el selector de timeframe (CMP-023, a
 * la izquierda de Indicadores, RF-406) y las acciones principales: indicadores
 * (con texto visible y `aria-expanded`), exportar y ajustar vista (icon-only con
 * `aria-label` + tooltip).
 */
export default function ChartHeader({
  symbol,
  timeframe,
  indicatorsOpen,
  onOpenIndicators,
  onExport,
  onFit,
  disabled = false,
  onChangeTimeframe,
}: ChartHeaderProps) {
  return (
    <header className="chart-header">
      <div className="chart-header__left">
        <span className="chart-header__title">
          {symbol} · {timeframe}
        </span>
        {onChangeTimeframe !== undefined && (
          <TimeframeSelector value={timeframe} onChange={onChangeTimeframe} disabled={disabled} />
        )}
      </div>
      <div className="chart-header__actions">
        <button
          type="button"
          className="chart-header__action chart-header__action--text"
          aria-expanded={indicatorsOpen}
          disabled={disabled}
          onClick={onOpenIndicators}
        >
          <span aria-hidden="true">◆</span> Indicadores
        </button>
        <button
          type="button"
          className="chart-header__action"
          aria-label="Exportar"
          title="Exportar"
          disabled={disabled}
          onClick={onExport}
        >
          <span aria-hidden="true">⤓</span>
        </button>
        <button
          type="button"
          className="chart-header__action"
          aria-label="Ajustar vista"
          title="Ajustar vista (1)"
          disabled={disabled}
          onClick={onFit}
        >
          <span aria-hidden="true">⟲</span>
        </button>
      </div>
    </header>
  );
}
