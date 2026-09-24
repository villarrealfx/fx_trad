import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import type { Candle, Timeframe } from '../../contracts/ohlc';
import { createOverlayBinding, type OverlayBinding } from '../../charting/chart-binding';
import OverlayCanvas from '../../charting/OverlayCanvas';
import {
  hitTestFragment,
  hitTestMarker,
  projectPoint,
  projectShape,
  type MarketDirection,
  type MarkerShape,
  type OverlayShape,
  type PixelPoint,
  type PriceTimePoint,
} from '../../charting/overlay-geometry';
import { createFrameBatcher, type FrameBatcher } from '../../performance/frame-batch';
import { composeChartCanvas, type ExportScale } from '../../export';
import { fetchSeries } from '../../services/series';
import {
  computeIndicators,
  toLinePoints,
  type IndicatorParameters,
} from '../../indicators/indicators';
import {
  ATR_SERIES_COLOR,
  COLOR_BG,
  COLOR_BORDER,
  COLOR_DOWN,
  COLOR_TEXT,
  COLOR_UP,
  MA_SERIES_COLORS,
  RSI_SERIES_COLOR,
} from './theme';
import './ChartPane.css';

/** Sin trazos por defecto (estable; la creación es TASK-028/029/030). */
const EMPTY_DRAWINGS: ReadonlyArray<OverlayShape> = [];

/** Tool por defecto del simulador: compra (auto-selección, journey J-003). */
const DEFAULT_MARKER_TOOL: MarketDirection = 'buy';

/** Herramienta activa del panel: simulador (buy/sell) o dibujo (line/rect/erase). */
type ActiveTool = MarketDirection | 'line' | 'rect' | 'erase';

/** Escala de precios reservada para el RSI (banda inferior del pane, v4). */
const RSI_PRICE_SCALE_ID = 'rsi';

/** Margen inferior reservado a la banda RSI en la escala del precio (v4). */
const MAIN_SCALE_MARGINS = { top: 0.12, bottom: 0.34 };

/** Posición de la banda RSI dentro del pane (v4 no soporta panes separados). */
const RSI_SCALE_MARGINS = { top: 0.72, bottom: 0.02 };

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
  /** Parámetros de indicadores a renderizar (RF-013). Si se omite, no se dibujan. */
  indicators?: IndicatorParameters;
}

/** Handle imperativo del panel para el export PNG (TASK-035, RF-015). */
export interface ChartPaneHandle {
  /**
   * Compone velas + indicadores (canvas de la librería) y dibujos (overlay)
   * en un canvas fuera de pantalla a la escala indicada.
   *
   * @param scale Factor de resolución (default 2x, P-2).
   * @returns El canvas compuesto, o `null` si no hay gráfico (empty/error).
   */
  compose(scale?: ExportScale): HTMLCanvasElement | null;
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
const ChartPane = forwardRef<ChartPaneHandle, ChartPaneProps>(function ChartPane(
  { symbol, timeframe, start, end, drawings = EMPTY_DRAWINGS, indicators },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const indicatorSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const lastRef = useRef<Candle | null>(null);
  const legendBatcherRef = useRef<FrameBatcher | null>(null);
  const [status, setStatus] = useState<ChartStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [legendBar, setLegendBar] = useState<Candle | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [overlayBinding, setOverlayBinding] = useState<OverlayBinding | null>(null);
  const candlesRef = useRef<ReadonlyArray<Candle>>([]);
  const [markers, setMarkers] = useState<ReadonlyArray<MarkerShape>>([]);
  const [activeTool, setActiveTool] = useState<ActiveTool>(DEFAULT_MARKER_TOOL);
  const [drawnShapes, setDrawnShapes] = useState<ReadonlyArray<OverlayShape>>([]);
  const [drawFrom, setDrawFrom] = useState<PriceTimePoint | null>(null);
  const [previewShape, setPreviewShape] = useState<OverlayShape | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const clickHandlerRef = useRef<(param: MouseEventParams<Time>) => void>(() => {});
  const previewHandlerRef = useRef<(param: MouseEventParams<Time>) => void>(() => {});

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
      previewHandlerRef.current(param);
    });
    chartRef.current = chart;
    seriesRef.current = series;
    setOverlayBinding(createOverlayBinding(chart, series));
    const onChartClick = (param: MouseEventParams<Time>): void => clickHandlerRef.current(param);
    chart.subscribeClick(onChartClick);
    return () => {
      chart.unsubscribeClick(onChartClick);
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

  /** Dibuja o redibuja MA/ATR (overlays) y el RSI (banda inferior, v4) — RF-013. */
  useEffect(() => {
    const chart = chartRef.current;
    if (chart === null) return;
    for (const serie of indicatorSeriesRef.current) chart.removeSeries(serie);
    indicatorSeriesRef.current = [];
    if (status !== 'success' || candlesRef.current.length === 0 || indicators === undefined) {
      return;
    }
    const { times, ma, rsi, atr } = computeIndicators(candlesRef.current, indicators);
    for (const [index, period] of indicators.maPeriods.entries()) {
      const serie = chart.addLineSeries({
        priceLineVisible: false,
        lastValueVisible: false,
        color: MA_SERIES_COLORS[index % MA_SERIES_COLORS.length],
        lineWidth: 1,
        priceScaleId: 'right',
      });
      serie.setData(toLinePoints(times, ma.get(period) ?? []) as LineData<Time>[]);
      indicatorSeriesRef.current.push(serie);
    }
    const atrSerie = chart.addLineSeries({
      priceLineVisible: false,
      lastValueVisible: false,
      color: ATR_SERIES_COLOR,
      lineWidth: 1,
      priceScaleId: 'right',
    });
    atrSerie.setData(toLinePoints(times, atr.get(indicators.atrPeriod) ?? []) as LineData<Time>[]);
    indicatorSeriesRef.current.push(atrSerie);
    const rsiSerie = chart.addLineSeries({
      priceLineVisible: false,
      lastValueVisible: false,
      color: RSI_SERIES_COLOR,
      lineWidth: 1,
      priceScaleId: RSI_PRICE_SCALE_ID,
    });
    rsiSerie.setData(toLinePoints(times, rsi.get(indicators.rsiPeriod) ?? []) as LineData<Time>[]);
    indicatorSeriesRef.current.push(rsiSerie);
    chart.priceScale('right').applyOptions({ scaleMargins: MAIN_SCALE_MARGINS });
    chart.priceScale(RSI_PRICE_SCALE_ID).applyOptions({ scaleMargins: RSI_SCALE_MARGINS });
  }, [status, indicators]);

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

  /** Precio del eje correspondiente a una coordenada vertical del gráfico. */
  function priceAt(y: number): number | null {
    return seriesRef.current?.coordinateToPrice(y) ?? null;
  }

  /** Hit-test de los trazos dibujados (línea/rect) contra el cursor. */
  function shapeHitTest(shape: OverlayShape, cursor: PixelPoint): boolean {
    if (overlayBinding === null) return false;
    return hitTestFragment(cursor, projectShape(shape, overlayBinding));
  }

  /** Borra el marcador o trazo bajo el cursor (tool `erase`, RI-003). */
  function eraseAt(cursor: PixelPoint): void {
    for (const marker of markers) {
      const pixel = markerPixel(marker);
      if (pixel !== null && hitTestMarker(cursor, pixel)) {
        setMarkers((current) => current.filter((item) => item.id !== marker.id));
        setSelectedMarkerId(null);
        return;
      }
    }
    const hit = drawnShapes.find((shape) => shapeHitTest(shape, cursor));
    if (hit !== undefined) {
      setDrawnShapes((current) => current.filter((shape) => shape.id !== hit.id));
    }
  }

  /** Crea línea/rectángulo a dos clics con anclas de tiempo/precio (RF-011). */
  function handleDrawClick(param: MouseEventParams<Time>, cursor: PixelPoint): void {
    const price = priceAt(cursor.y);
    if (param.time === undefined || price === null) return;
    const anchor = { time: Number(param.time), price };
    if (drawFrom === null) {
      setDrawFrom(anchor);
      return;
    }
    const id = `${activeTool}-${drawFrom.time}-${anchor.time}`;
    const shape: OverlayShape =
      activeTool === 'line'
        ? { id, kind: 'line', from: drawFrom, to: anchor }
        : { id, kind: 'rect', from: drawFrom, to: anchor };
    setDrawnShapes((current) => [...current, shape]);
    setDrawFrom(null);
    setPreviewShape(null);
  }

  /**
   * Crea un marcador en la vela bajo el cursor (RF-012) o gestiona las
   * herramientas de dibujo (línea/rect) y borrado (RI-003).
   */
  function handleChartClick(param: MouseEventParams<Time>): void {
    const point = param.point;
    if (point === undefined) return;
    const cursor = { x: point.x, y: point.y };
    if (activeTool === 'erase') {
      eraseAt(cursor);
      return;
    }
    if (activeTool === 'line' || activeTool === 'rect') {
      handleDrawClick(param, cursor);
      return;
    }
    for (const marker of markers) {
      const pixel = markerPixel(marker);
      if (pixel !== null && hitTestMarker(cursor, pixel)) {
        setSelectedMarkerId(marker.id);
        return;
      }
    }
    if (param.time === undefined) return;
    const barTime = Number(param.time);
    const candle = candlesRef.current.find((item) => item.time === barTime);
    const duplicated = markers.some(
      (marker) => marker.direction === activeTool && marker.position.time === barTime,
    );
    if (candle === undefined || duplicated) return;
    const marker: MarkerShape = {
      id: `${activeTool}-${barTime}`,
      kind: 'marker',
      position: { time: barTime, price: candle.close },
      direction: activeTool,
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

  /** Al cambiar de herramienta, cancela el trazo pendiente y la selección. */
  useEffect(() => {
    setDrawFrom(null);
    setPreviewShape(null);
    setSelectedMarkerId(null);
  }, [activeTool]);

  /** Maneja los atajos de teclado del panel (+/− zoom, 1 ajustar, Esc cancelar). */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      if (selectedMarkerId !== null) {
        event.preventDefault();
        setSelectedMarkerId(null);
      } else if (drawFrom !== null) {
        event.preventDefault();
        setDrawFrom(null);
        setPreviewShape(null);
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
    () =>
      [
        ...drawings,
        ...markers,
        ...drawnShapes,
        ...(previewShape === null ? [] : [previewShape]),
      ] as ReadonlyArray<OverlayShape>,
    [drawings, markers, drawnShapes, previewShape],
  );

  /** Entradas de la leyenda de indicadores activos (RF-013). */
  const indicatorEntries: ReadonlyArray<{ label: string; color: string }> = useMemo(() => {
    if (status !== 'success' || indicators === undefined) return [];
    const entries = indicators.maPeriods.map((period, index) => ({
      label: `MA${period}`,
      color: MA_SERIES_COLORS[index % MA_SERIES_COLORS.length],
    }));
    entries.push({ label: `ATR(${indicators.atrPeriod})`, color: ATR_SERIES_COLOR });
    entries.push({ label: `RSI(${indicators.rsiPeriod})`, color: RSI_SERIES_COLOR });
    return entries;
  }, [status, indicators]);

  /** Expone la composición del lienzo para el export PNG (TASK-035, RF-015). */
  useImperativeHandle(
    ref,
    () => ({
      compose(scale: ExportScale = 2): HTMLCanvasElement | null {
        const host = hostRef.current;
        const chart = chartRef.current;
        if (host === null || chart === null) return null;
        let chartCanvas: HTMLCanvasElement | null = null;
        try {
          chartCanvas = chart.takeScreenshot();
        } catch {
          chartCanvas = null;
        }
        return composeChartCanvas({
          layers: { chartCanvas, overlayCanvas: overlayCanvasRef.current },
          width: host.clientWidth,
          height: host.clientHeight,
          scale,
          annotation: `${symbol} · ${timeframe}`,
        });
      },
    }),
    [symbol, timeframe],
  );

  /** Mantiene el handler de click actualizado para la suscripción del chart. */
  clickHandlerRef.current = handleChartClick;

  /** Actualiza el preview del trazo en curso con el movimiento del crosshair. */
  previewHandlerRef.current = (param) => {
    if (drawFrom === null || (activeTool !== 'line' && activeTool !== 'rect')) return;
    const y = param.point?.y;
    const price = y === undefined ? null : priceAt(y);
    if (param.time === undefined || price === null) return;
    setPreviewShape({
      id: 'preview',
      kind: activeTool,
      from: drawFrom,
      to: { time: Number(param.time), price },
    } as OverlayShape);
  };

  return (
    <div className="chart-pane" data-shapes={overlayShapes.length}>
      <div
        className="chart-pane__tools"
        role="group"
        aria-label="Herramientas de dibujo y simulador"
      >
        <button
          type="button"
          aria-pressed={activeTool === 'line'}
          onClick={() => setActiveTool('line')}
        >
          Línea
        </button>
        <button
          type="button"
          aria-pressed={activeTool === 'rect'}
          onClick={() => setActiveTool('rect')}
        >
          Rectángulo
        </button>
        <button
          type="button"
          aria-pressed={activeTool === 'erase'}
          onClick={() => setActiveTool('erase')}
        >
          Borrar trazo
        </button>
        <button
          type="button"
          aria-pressed={activeTool === 'buy'}
          onClick={() => setActiveTool('buy')}
        >
          Compra
        </button>
        <button
          type="button"
          aria-pressed={activeTool === 'sell'}
          onClick={() => setActiveTool('sell')}
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
        />
        <OverlayCanvas
          hostRef={hostRef}
          binding={overlayBinding}
          shapes={overlayShapes}
          canvasRef={overlayCanvasRef}
        />
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
        {indicatorEntries.map((entry, index) => (
          <span className="chart-pane__indicator" key={`${entry.label}-${index}`}>
            <span
              className="chart-pane__indicator-dot"
              style={{ background: entry.color }}
              aria-hidden="true"
            />
            {entry.label}
          </span>
        ))}
      </footer>
    </div>
  );
});

export default ChartPane;
