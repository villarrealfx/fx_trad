import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import {
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import type { Candle, Timeframe } from '../../contracts/ohlc';
import { createOverlayBinding, type OverlayBinding } from '../../charting/chart-binding';
import OverlayCanvas from '../../charting/OverlayCanvas';
import {
  hitTestMarker,
  projectPoint,
  type MarketDirection,
  type MarkerShape,
  type OverlayShape,
  type PixelPoint,
} from '../../charting/overlay-geometry';
import { createFrameBatcher, type FrameBatcher } from '../../performance/frame-batch';
import { fetchSeries } from '../../services/series';
import { COLOR_BG, COLOR_BORDER, COLOR_DOWN, COLOR_TEXT, COLOR_UP } from './theme';
import './ChartPane.css';

/** Sin trazos por defecto (estable; la creación es TASK-028/029/030). */
const EMPTY_DRAWINGS: ReadonlyArray<OverlayShape> = [];

/** Tool por defecto del simulador: compra (auto-selección, journey J-003). */
const DEFAULT_MARKER_TOOL: MarketDirection = 'buy';

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
  /** Trazos superpuestos anclados a precio/tiempo (TASK-027). */
  drawings?: ReadonlyArray<OverlayShape>;
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
export default function ChartPane({
  symbol,
  timeframe,
  start,
  end,
  drawings = EMPTY_DRAWINGS,
}: ChartPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lastRef = useRef<Candle | null>(null);
  const legendBatcherRef = useRef<FrameBatcher | null>(null);
  const [status, setStatus] = useState<ChartStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [legendBar, setLegendBar] = useState<Candle | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [overlayBinding, setOverlayBinding] = useState<OverlayBinding | null>(null);
  const candlesRef = useRef<ReadonlyArray<Candle>>([]);
  const [markers, setMarkers] = useState<ReadonlyArray<MarkerShape>>([]);
  const [markerTool, setMarkerTool] = useState<MarketDirection>(DEFAULT_MARKER_TOOL);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

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
    legendBatcherRef.current = createFrameBatcher();
    chart.subscribeCrosshairMove((param) => {
      const data = param.seriesData.get(series) as Partial<Candle> | undefined;
      legendBatcherRef.current?.schedule(() => {
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
    });
    chartRef.current = chart;
    seriesRef.current = series;
    setOverlayBinding(createOverlayBinding(chart, series));
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setOverlayBinding(null);
      legendBatcherRef.current?.cancel();
      legendBatcherRef.current = null;
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
        candlesRef.current = response.candles;
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

  /** Proyecta un marcador a píxeles con el mapeo actual (TASK-030). */
  function markerPixel(marker: MarkerShape): PixelPoint | null {
    if (overlayBinding === null) return null;
    return projectPoint(marker.position, overlayBinding);
  }

  /**
   * Crea un marcador en la vela bajo el cursor (via RF-012): la marca toma el
   * precio de la barra (close) y queda anclada a tiempo+precio reales.
   * Si el clic cae sobre un marcador existente, lo selecciona para borrar.
   */
  function handleChartClick(event: MouseEvent<HTMLDivElement>): void {
    const chart = chartRef.current;
    const host = hostRef.current;
    if (chart === null || host === null) return;
    const rect = host.getBoundingClientRect();
    const cursor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    for (const marker of markers) {
      const pixel = markerPixel(marker);
      if (pixel !== null && hitTestMarker(cursor, pixel)) {
        setSelectedMarkerId(marker.id);
        return;
      }
    }
    const time = chart.timeScale().coordinateToTime(cursor.x);
    if (time === null) return;
    const barTime = Number(time);
    const candle = candlesRef.current.find((item) => item.time === barTime);
    const duplicated = markers.some(
      (marker) => marker.direction === markerTool && marker.position.time === barTime,
    );
    if (candle === undefined || duplicated) return;
    const marker: MarkerShape = {
      id: `${markerTool}-${barTime}`,
      kind: 'marker',
      position: { time: barTime, price: candle.close },
      direction: markerTool,
    };
    setMarkers((current) => [...current, marker]);
    setSelectedMarkerId(null);
  }

  /** Descarta la selección del marcador (Cancelar/Escape). */
  function clearSelection(): void {
    setSelectedMarkerId(null);
  }

  /** Borra el marcador seleccionado (efímero RI-003: solo sesión). */
  function deleteSelected(): void {
    if (selectedMarkerId === null) return;
    setMarkers((current) => current.filter((marker) => marker.id !== selectedMarkerId));
    setSelectedMarkerId(null);
  }

  useEffect(() => {
    if (selectedMarkerId !== null) {
      confirmRef.current?.focus();
    }
  }, [selectedMarkerId]);

  /** Maneja los atajos de teclado del panel (+/− zoom, 1 ajustar, Esc cancelar). */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      if (selectedMarkerId !== null) {
        event.preventDefault();
        setSelectedMarkerId(null);
      }
    } else if (event.key === '+' || event.key === '=') {
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

  const selectedMarker = markers.find((marker) => marker.id === selectedMarkerId) ?? null;
  const selectedPixel = selectedMarker === null ? null : markerPixel(selectedMarker);
  const overlayShapes = useMemo(
    () => [...drawings, ...markers] as ReadonlyArray<OverlayShape>,
    [drawings, markers],
  );

  return (
    <div className="chart-pane">
      <div className="chart-pane__tools" role="group" aria-label="Simulador de compra/venta">
        <button
          type="button"
          aria-pressed={markerTool === 'buy'}
          onClick={() => setMarkerTool('buy')}
        >
          Compra
        </button>
        <button
          type="button"
          aria-pressed={markerTool === 'sell'}
          onClick={() => setMarkerTool('sell')}
        >
          Venta
        </button>
      </div>
      <div className="chart-pane__graph">
        <div
          ref={hostRef}
          className="chart-pane__host"
          role="img"
          aria-label={`Gráfico de velas ${symbol} ${timeframe}`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={handleChartClick}
        />
        <OverlayCanvas hostRef={hostRef} binding={overlayBinding} shapes={overlayShapes} />
        {selectedMarker !== null && selectedPixel !== null && (
          <div
            className="chart-pane__confirm"
            style={{ left: selectedPixel.x, top: selectedPixel.y }}
            role="group"
            aria-label={`Marcador ${selectedMarker.direction === 'buy' ? 'de compra' : 'de venta'}
              seleccionado`}
          >
            <span>¿Borrar marcador?</span>
            <button type="button" ref={confirmRef} onClick={deleteSelected}>
              Borrar
            </button>
            <button type="button" onClick={clearSelection}>
              Cancelar
            </button>
          </div>
        )}
      </div>
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
