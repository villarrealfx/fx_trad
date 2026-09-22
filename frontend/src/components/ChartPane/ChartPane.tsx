import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import type { Candle, Timeframe } from '../../contracts/ohlc';
import { fetchSeries } from '../../services/series';
import { COLOR_BG, COLOR_BORDER, COLOR_DOWN, COLOR_TEXT, COLOR_UP } from './theme';
import './ChartPane.css';

/** Estados de carga del panel (interaction-specs SCR-004, CMP-007). */
type ChartStatus = 'loading' | 'empty' | 'error' | 'success';

export interface ChartPaneProps {
  /** Símbolo del activo, p. ej. EURUSD. */
  symbol: string;
  /** Granularidad canónica (RF-009). */
  timeframe: Timeframe;
  /** Inicio del rango en segundos UTC (inclusivo, opcional). */
  start?: number;
  /** Fin del rango en segundos UTC (inclusivo, opcional). */
  end?: number;
}

/** Formatea un precio al formato de dominio FX (5 decimales). */
function formatPrice(value: number | undefined): string {
  return value === undefined ? '—' : value.toFixed(5);
}

/**
 * Panel de velas basado en lightweight-charts v4 (CMP-007, ADR-005).
 *
 * Renderiza velas japonesas desde `GET /series` (TASK-021) consumiendo el
 * contrato OHLC sin transformación (RNF-008). Incluye los estados loading,
 * empty, error y success, leyenda OHLC textual (a11y SCR-004) y atajos
 * ``+``/``-`` (zoom) y ``1`` (ajuste de vista).
 */
export default function ChartPane({ symbol, timeframe, start, end }: ChartPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lastRef = useRef<Candle | null>(null);
  const [status, setStatus] = useState<ChartStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [legendBar, setLegendBar] = useState<Candle | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    const chart = createChart(host, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: COLOR_BG },
        textColor: COLOR_TEXT,
      },
      grid: {
        vertLines: { color: COLOR_BORDER },
        horzLines: { color: COLOR_BORDER },
      },
      timeScale: { borderColor: COLOR_BORDER },
      rightPriceScale: { borderColor: COLOR_BORDER },
      crosshair: {
        vertLine: { color: COLOR_BORDER },
        horzLine: { color: COLOR_BORDER },
      },
    });
    const series = chart.addCandlestickSeries({
      upColor: COLOR_UP,
      downColor: COLOR_DOWN,
      borderUpColor: COLOR_UP,
      borderDownColor: COLOR_DOWN,
      wickUpColor: COLOR_UP,
      wickDownColor: COLOR_DOWN,
    });
    chart.subscribeCrosshairMove((param) => {
      const data = param.seriesData.get(series) as Partial<Candle> | undefined;
      if (param.time !== undefined && data !== undefined && data.open !== undefined) {
        setLegendBar({
          time: Number(param.time),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        } as Candle);
        return;
      }
      setLegendBar(lastRef.current);
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    seriesRef.current?.setData([]);
    fetchSeries({ symbol, timeframe, start, end })
      .then((response) => {
        if (cancelled) return;
        if (response.candles.length === 0) {
          setStatus('empty');
          return;
        }
        const last = response.candles[response.candles.length - 1];
        lastRef.current = last;
        setLegendBar(last);
        seriesRef.current?.setData(response.candles as CandlestickData[]);
        chartRef.current?.timeScale().fitContent();
        setStatus('success');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : 'Error desconocido al cargar la serie',
        );
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe, start, end, retryToken]);

  /** Aplica zoom a la vista actual alrededor del centro visible (atajo +/−). */
  function applyZoom(factor: number): void {
    const chart = chartRef.current;
    if (chart === null) return;
    const range = chart.timeScale().getVisibleLogicalRange();
    if (range === null) return;
    const from = Number(range.from);
    const to = Number(range.to);
    const bars = to - from;
    const center = (from + to) / 2;
    const half = (bars * factor) / 2;
    chart.timeScale().setVisibleLogicalRange({ from: center - half, to: center + half });
  }

  /** Maneja los atajos de teclado del panel (+/− zoom, 1 ajustar). */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      applyZoom(0.5);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      applyZoom(2);
    } else if (event.key === '1') {
      event.preventDefault();
      chartRef.current?.timeScale().fitContent();
    }
  }

  return (
    <div className="chart-pane">
      <div
        ref={hostRef}
        className="chart-pane__host"
        role="img"
        aria-label={`Gráfico de velas ${symbol} ${timeframe}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      />
      {status === 'loading' && <div className="chart-pane__overlay">Cargando serie…</div>}
      {status === 'empty' && (
        <div className="chart-pane__overlay">
          <p>Sin datos en este periodo</p>
        </div>
      )}
      {status === 'error' && (
        <div className="chart-pane__overlay" role="alert">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => setRetryToken((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      )}
      <footer className="chart-pane__legend" aria-label="Leyenda OHLC">
        <span>O {formatPrice(legendBar?.open)}</span>
        <span>H {formatPrice(legendBar?.high)}</span>
        <span>L {formatPrice(legendBar?.low)}</span>
        <span>C {formatPrice(legendBar?.close)}</span>
      </footer>
    </div>
  );
}
