import { useState } from 'react';
import { buildChartUrl, DEFAULT_TIMEFRAME, type ChartQuery } from '../../app/routes';
import { ASSET_CATALOG } from '../../catalog';
import { TIMEFRAMES, type Timeframe } from '../../contracts/ohlc';
import Button from '../ui/Button';
import DateRange from '../ui/DateRange';
import RadioGroup from '../ui/RadioGroup';
import Select from '../ui/Select';
import './ChartSelector.css';

/** Opciones de timeframe (radiogroup, SCR-003). */
const TIMEFRAME_OPTIONS = TIMEFRAMES.map((timeframe) => ({
  value: timeframe,
  label: timeframe,
}));

/** Props del selector de gráfico (SCR-003). */
export interface ChartSelectorProps {
  /** Abre el gráfico con la selección (navega a SCR-004). */
  onOpen: (url: string) => void;
}

/**
 * Selector de activo, periodo y timeframe (TASK-026, SCR-003).
 *
 * Al confirmar, construye la URL del gráfico (`/chart?symbol&timeframe[&start&end]`)
 * y navega a SCR-004, que carga la serie del rango elegido (RF-007/RF-008).
 * Timeframe como `RadioGroup` real (a11y) y validación inline de fechas
 * (inicio ≤ fin) mediante `DateRange`.
 */
export default function ChartSelector({ onOpen }: ChartSelectorProps) {
  const [symbol, setSymbol] = useState(ASSET_CATALOG[0]?.symbol ?? 'EURUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const assetOptions = ASSET_CATALOG.map((asset) => ({
    value: asset.symbol,
    label: asset.symbol,
  }));
  const orderInvalid = start !== '' && end !== '' && start > end;

  /** Navega al gráfico con la selección actual. */
  function handleOpen(): void {
    if (orderInvalid) return;
    const selection: ChartQuery = {
      symbol,
      timeframe,
      ...(start !== '' ? { start } : {}),
      ...(end !== '' ? { end } : {}),
    };
    onOpen(buildChartUrl(selection));
  }

  return (
    <form
      className="chart-selector"
      aria-label="Selector de gráfico"
      onSubmit={(event) => {
        event.preventDefault();
        handleOpen();
      }}
    >
      <Select
        label="Activo (de la biblioteca)"
        options={assetOptions}
        value={symbol}
        onChange={setSymbol}
      />
      <DateRange
        start={start}
        end={end}
        onChange={(value) => {
          setStart(value.start);
          setEnd(value.end);
        }}
      />
      <RadioGroup
        name="timeframe"
        legend="Timeframe (agregado desde 1s)"
        options={TIMEFRAME_OPTIONS}
        value={timeframe}
        onChange={(value) => setTimeframe(value as Timeframe)}
      />
      <Button label="Abrir gráfico" type="submit" disabled={orderInvalid} />
    </form>
  );
}
