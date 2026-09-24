import './IndicatorItem.css';

/** Props del item de indicador (CMP-010, TASK-UI-042). */
export interface IndicatorItemProps {
  /** Identificador del indicador. */
  id: string;
  /** Etiqueta visible (p. ej. `MA 20`, `RSI`). */
  name: string;
  /** Periodo configurado. */
  period: number;
  /** Si el indicador se dibuja. */
  visible: boolean;
  /** Si el editor de parámetros está abierto (estado `config-open`). */
  configOpen: boolean;
  /** Color de la serie (token). */
  color: string;
  /** Abre/cierra el editor de parámetros. */
  onToggleConfig: () => void;
  /** Muestra/oculta el indicador en el gráfico. */
  onToggleVisible: () => void;
  /** Cambia el periodo (solo enteros ≥ 1). */
  onPeriodChange: (period: number) => void;
  /** Quita el indicador del panel. */
  onRemove: () => void;
}

/**
 * Item de indicador del panel (CMP-010).
 *
 * Estados `default` y `config-open` (expuestos en `data-state`); la acción de
 * quitar la resuelve el contenedor. a11y: checkbox de visibilidad y botones con
 * nombre accesible; el editor de periodo usa una label visible.
 */
export default function IndicatorItem({
  id,
  name,
  period,
  visible,
  configOpen,
  color,
  onToggleConfig,
  onToggleVisible,
  onPeriodChange,
  onRemove,
}: IndicatorItemProps) {
  return (
    <li className="indicator-item" data-state={configOpen ? 'config-open' : 'default'}>
      <span className="indicator-item__dot" style={{ background: color }} aria-hidden="true" />
      <span className="indicator-item__name">{name}</span>
      <label className="indicator-item__visible">
        <input type="checkbox" checked={visible} onChange={onToggleVisible} />
        Mostrar
      </label>
      <button
        type="button"
        className="indicator-item__action"
        aria-expanded={configOpen}
        aria-controls={`${id}-config`}
        onClick={onToggleConfig}
      >
        Configurar
      </button>
      <button
        type="button"
        className="indicator-item__action"
        aria-label={`Quitar ${name}`}
        onClick={onRemove}
      >
        Quitar
      </button>
      {configOpen && (
        <div className="indicator-item__config" id={`${id}-config`}>
          <label className="indicator-item__label" htmlFor={`${id}-period`}>
            Periodo {name}
          </label>
          <input
            id={`${id}-period`}
            className="indicator-item__input"
            type="number"
            min={1}
            step={1}
            value={period}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(next) && next >= 1) onPeriodChange(next);
            }}
          />
        </div>
      )}
    </li>
  );
}
