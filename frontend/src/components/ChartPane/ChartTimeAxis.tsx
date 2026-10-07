/**
 * Franja del eje X en dos filas (RF-407, TASK-UI-406).
 *
 * Componente **presentacional**: recibe las marcas ya resueltas por
 * `selectAxisRows` (formato + umbral de separación). La fila superior muestra la
 * fecha y la inferior `hh:mm`; la posición horizontal es absoluta dentro de la
 * franja y la separación vertical la fija `--axis-row-gap`.
 */
import type { AxisRows } from '../../charting/axis-format';
import './ChartTimeAxis.css';

export interface ChartTimeAxisProps {
  /** Marcas de las dos filas del eje. */
  rows: AxisRows;
}

export default function ChartTimeAxis({ rows }: ChartTimeAxisProps) {
  return (
    <div className="chart-time-axis" data-testid="chart-time-axis">
      <div className="chart-time-axis__row" data-row="date" aria-hidden="true">
        {rows.top.map((tick) => (
          <span
            key={`date-${tick.time}`}
            className="chart-time-axis__tick"
            style={{ left: tick.x }}
          >
            {tick.label}
          </span>
        ))}
      </div>
      <div className="chart-time-axis__row" data-row="time" aria-hidden="true">
        {rows.bottom.map((tick) => (
          <span
            key={`time-${tick.time}`}
            className="chart-time-axis__tick"
            style={{ left: tick.x }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
