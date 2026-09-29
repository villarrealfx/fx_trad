import { useCallback, useEffect, useRef, useState } from 'react';
import { buildChartUrl, DEFAULT_TIMEFRAME, type ChartQuery } from '../../app/routes';
import { TIMEFRAMES, type Timeframe } from '../../contracts/ohlc';
import { fetchAssets, type AssetRow } from '../../services/assets';
import { epochToIsoDay, formatEpochRange } from '../../utils/dates';
import Button from '../ui/Button';
import DateRange from '../ui/DateRange';
import RadioGroup from '../ui/RadioGroup';
import Select from '../ui/Select';
import StatusBanner from '../ui/StatusBanner';
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
  /** Activo preseleccionado (p. ej. al llegar desde la biblioteca, SCR-001). */
  defaultSymbol?: string;
  /** CTA del estado vacío: descargar un activo (→ SCR-002). */
  onDownload?: () => void;
}

/**
 * Selector de activo, periodo y timeframe (TASK-026/TASK-UI-030, SCR-003).
 *
 * Carga la cobertura almacenada con `GET /assets` y cubre los cinco estados:
 * `loading` (esqueleto), `empty` (bloquea "Abrir gráfico" y ofrece CTA a
 * SCR-002), `error` (banner + reintento preservando la selección), `success`
 * (abre SCR-004) y `partial` (aviso del rango útil exacto). Valida el rango
 * contra la cobertura de forma inline y enfoca el campo en error (a11y).
 */
export default function ChartSelector({ onOpen, defaultSymbol, onDownload }: ChartSelectorProps) {
  const [assets, setAssets] = useState<readonly AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState(defaultSymbol ?? '');
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  /** Carga la biblioteca y garantiza un activo seleccionable. */
  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const rows = await fetchAssets();
      setAssets(rows);
      setError(null);
      setSymbol((current) => {
        if (rows.some((asset) => asset.symbol === current)) return current;
        if (defaultSymbol !== undefined && rows.some((asset) => asset.symbol === defaultSymbol)) {
          return defaultSymbol;
        }
        return rows[0]?.symbol ?? '';
      });
    } catch (loadError) {
      // La selección previa se preserva; solo se muestra el banner.
      setError(loadError instanceof Error ? loadError.message : 'No se pudo leer la cobertura');
    } finally {
      setLoading(false);
    }
  }, [defaultSymbol]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = assets.find((asset) => asset.symbol === symbol);
  // El catálogo de la biblioteca siempre trae cobertura; se contempla `null` por
  // el contrato de `GET /assets` (scope=all) sin romper el tipado.
  const coverageStart = selected?.coverage_start ?? null;
  const coverageEnd = selected?.coverage_end ?? null;
  const minDay = coverageStart !== null ? epochToIsoDay(coverageStart) : undefined;
  const maxDay = coverageEnd !== null ? epochToIsoDay(coverageEnd) : undefined;
  const coverageRange =
    coverageStart !== null && coverageEnd !== null
      ? formatEpochRange(coverageStart, coverageEnd)
      : '';
  const partialMessage =
    selected !== undefined
      ? `La cobertura de ${selected.symbol} es parcial. Rango útil exacto: ${coverageRange}.`
      : '';
  const orderInvalid = start !== '' && end !== '' && start > end;
  const startOut = start !== '' && minDay !== undefined && start < minDay;
  const endOut = end !== '' && maxDay !== undefined && end > maxDay;
  const rangeInvalid = orderInvalid || startOut || endOut;

  /** Enfoca el primer campo marcado como inválido (a11y 3.3.1). */
  function focusFirstInvalid(): void {
    formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
  }

  /** Navega al gráfico con la selección actual si el rango es válido. */
  function handleOpen(): void {
    if (rangeInvalid) {
      focusFirstInvalid();
      return;
    }
    const selection: ChartQuery = {
      symbol,
      timeframe,
      ...(start !== '' ? { start } : {}),
      ...(end !== '' ? { end } : {}),
    };
    onOpen(buildChartUrl(selection));
  }

  if (loading && assets.length === 0) {
    return (
      <div className="chart-selector chart-selector--loading" role="status" aria-live="polite">
        <span className="chart-selector__loading-text">Cargando activos…</span>
        <div className="chart-selector__skeleton" aria-hidden="true" />
      </div>
    );
  }

  if (error === null && assets.length === 0) {
    return (
      <section className="chart-selector chart-selector--empty" aria-label="Selector de gráfico">
        <p className="chart-selector__empty-text">
          Descarga primero un activo para poder graficarlo.
        </p>
        {onDownload !== undefined && <Button label="Descargar datos" onClick={onDownload} />}
        <Button label="Abrir gráfico" disabled />
      </section>
    );
  }

  return (
    <form
      ref={formRef}
      className="chart-selector"
      aria-label="Selector de gráfico"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleOpen();
      }}
    >
      {error !== null && (
        <StatusBanner
          tone="error"
          message={error}
          actionLabel="Reintentar"
          onAction={() => void load()}
        />
      )}
      <Select
        label="Activo (de la biblioteca)"
        options={assets.map((asset) => ({ value: asset.symbol, label: asset.symbol }))}
        value={symbol}
        onChange={setSymbol}
      />
      {selected !== undefined && (
        <p className="chart-selector__coverage">Cobertura: {coverageRange}</p>
      )}
      {selected?.status === 'parcial' && <StatusBanner tone="warning" message={partialMessage} />}
      <fieldset className="chart-selector__group">
        <legend>Periodo a visualizar (dentro de la cobertura)</legend>
        <DateRange
          start={start}
          end={end}
          min={minDay}
          max={maxDay}
          onChange={(value) => {
            setStart(value.start);
            setEnd(value.end);
          }}
        />
      </fieldset>
      <RadioGroup
        name="timeframe"
        legend="Timeframe (agregado desde 1 m)"
        options={TIMEFRAME_OPTIONS}
        value={timeframe}
        onChange={(value) => setTimeframe(value as Timeframe)}
      />
      <Button label="Abrir gráfico" type="submit" disabled={loading} />
    </form>
  );
}
