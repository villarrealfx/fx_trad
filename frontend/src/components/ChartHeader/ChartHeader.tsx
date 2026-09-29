import './ChartHeader.css';

/** Props del header del gráfico (CMP-017, `components.md`). */
export interface ChartHeaderProps {
  /** Símbolo del activo (p. ej. EURUSD). */
  symbol: string;
  /** Timeframe activo (p. ej. 1h). */
  timeframe: string;
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
}

/**
 * Header del gráfico (CMP-017, SCR-004/005).
 *
 * Agrupa el título `símbolo · timeframe` y las acciones principales:
 * indicadores (con texto visible y `aria-expanded`), exportar y ajustar vista
 * (icon-only con `aria-label` + tooltip). Sustituye al botón de export suelto
 * y al "Ajustar" de la toolbar (ADR-019).
 */
export default function ChartHeader({
  symbol,
  timeframe,
  indicatorsOpen,
  onOpenIndicators,
  onExport,
  onFit,
  disabled = false,
}: ChartHeaderProps) {
  return (
    <header className="chart-header">
      <span className="chart-header__title">
        {symbol} · {timeframe}
      </span>
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
