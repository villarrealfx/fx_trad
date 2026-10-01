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
import { PRICE_FORMAT, formatAxisLabel } from '../../charting/axis-format';
import { createOverlayBinding, type OverlayBinding } from '../../charting/chart-binding';
import type { ChartSyncController } from '../../charting/chart-sync';
import { constrainToAxis } from '../../charting/drawing-edit';
import { markerAnchorPrice } from '../../charting/markers';
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
import { useDrawingEdit } from '../../charting/use-drawing-edit';
import { useDrawingHistory } from '../../charting/use-drawing-history';
import { createFrameBatcher, type FrameBatcher } from '../../performance/frame-batch';
import { composeChartCanvas, type ExportScale } from '../../export';
import ChartHeader from '../ChartHeader/ChartHeader';
import ChartToolbar, { type ChartToolDescriptor } from '../ChartToolbar/ChartToolbar';
import { type ChartToolType } from '../DrawTool/DrawTool';
import StatusBanner from '../ui/StatusBanner';
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

/** Herramienta activa del panel: simulador (buy/sell) o dibujo (line/rect/fib/erase). */
type ActiveTool = ChartToolType;

/** Herramientas de la barra (CMP-008/009); `label` es el nombre accesible. */
const TOOL_DESCRIPTORS: ReadonlyArray<ChartToolDescriptor> = [
  { type: 'line', icon: '✏️', label: 'Línea' },
  { type: 'rect', icon: '▭', label: 'Rectángulo' },
  { type: 'fib', icon: 'Φ', label: 'Fibonacci' },
  { type: 'operation', icon: '◎', label: 'Operación: 2 clics (Entrada, SL)' },
  { type: 'buy', icon: '▲', label: 'Compra' },
  { type: 'sell', icon: '▼', label: 'Venta' },
  { type: 'erase', icon: '🗑', label: 'Borrar trazo' },
];

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
  /** Dibujos iniciales que siembran el historial editable (TASK-UI-241). */
  initialDrawings?: ReadonlyArray<OverlayShape>;
  /** Notifica los dibujos tras cada cambio (persistencia, TASK-UI-241). */
  onDrawingsChange?: (shapes: ReadonlyArray<OverlayShape>) => void;
  /** Parámetros de indicadores a renderizar (RF-013). Si se omite, no se dibujan. */
  indicators?: IndicatorParameters;
  /** Controlador de sincronización entre paneles (TASK-034, RF-014). */
  sync?: ChartSyncController;
  /** Id de este panel dentro del controlador de sincronización. */
  syncId?: string;
  /** Notifica la vela de la leyenda (última o bajo el crosshair) — TASK-UI-050. */
  onLegend?: (candle: Candle | null) => void;
  /** Estado abierto del formulario de indicadores (CMP-017, RF-203). */
  indicatorsOpen?: boolean;
  /** Abre/cierra el formulario de indicadores (CMP-017, RF-203). */
  onOpenIndicators?: () => void;
  /** Dispara la exportación de la captura (CMP-017, RF-205). */
  onExport?: () => void;
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
  {
    symbol,
    timeframe,
    start,
    end,
    drawings = EMPTY_DRAWINGS,
    initialDrawings,
    onDrawingsChange,
    indicators,
    sync,
    syncId = 'pane',
    onLegend,
    indicatorsOpen = false,
    onOpenIndicators,
    onExport,
  },
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
  const [partialCoverage, setPartialCoverage] = useState(false);
  const [legendBar, setLegendBar] = useState<Candle | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [overlayBinding, setOverlayBinding] = useState<OverlayBinding | null>(null);
  const candlesRef = useRef<ReadonlyArray<Candle>>([]);
  const [markers, setMarkers] = useState<ReadonlyArray<MarkerShape>>([]);
  const [activeTool, setActiveTool] = useState<ActiveTool>(DEFAULT_MARKER_TOOL);
  /** Historial reversible de los trazos creados/editados (RF-213).
   *  Se siembra con los dibujos persistidos (TASK-UI-241). */
  const history = useDrawingHistory(initialDrawings ?? EMPTY_DRAWINGS);
  const drawnShapes = history.shapes;
  /** Notifica los dibujos al padre tras cada cambio (persistencia). */
  const onDrawingsChangeRef = useRef(onDrawingsChange);
  onDrawingsChangeRef.current = onDrawingsChange;
  useEffect(() => {
    onDrawingsChangeRef.current?.(history.shapes);
  }, [history.shapes]);
  const [drawFrom, setDrawFrom] = useState<PriceTimePoint | null>(null);
  const [previewShape, setPreviewShape] = useState<OverlayShape | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const clickHandlerRef = useRef<(param: MouseEventParams<Time>) => void>(() => {});
  const previewHandlerRef = useRef<(param: MouseEventParams<Time>) => void>(() => {});
  /** Estado de la tecla `Shift` para restringir líneas a H/V (RF-210). */
  const shiftRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Shift') shiftRef.current = true;
    };
    const onKeyUp = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Shift') shiftRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  /** Edición por arrastre de los trazos creados (mover/redimensionar, RF-212). */
  const { selectedShapeId, setSelectedShapeId, ...drawingEditHandlers } = useDrawingEdit({
    hostRef,
    getMapper: () => overlayBinding,
    getInverseMapper: () => ({
      coordinateToTime: (x) => {
        const scale = chartRef.current?.timeScale();
        const time = scale ? scale.coordinateToTime(x) : null;
        return time === null ? null : Number(time);
      },
      coordinateToPrice: (y) => seriesRef.current?.coordinateToPrice(y) ?? null,
    }),
    shapes: drawnShapes,
    onShapesChange: history.update,
    onGestureStart: history.begin,
    onGestureEnd: history.end,
    enabled: status === 'success' && activeTool !== 'erase',
  });

  /** Notifica la vela de la leyenda al consumidor sin re-suscribir (TASK-UI-050). */
  const onLegendRef = useRef(onLegend);
  onLegendRef.current = onLegend;
  useEffect(() => {
    onLegendRef.current?.(legendBar);
  }, [legendBar]);

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
      timeScale: {
        borderColor: COLOR_BORDER,
        // Eje X con `{día} {HH:mm}` UTC de apertura de la vela (RF-206).
        tickMarkFormatter: (time: Time) => (typeof time === 'number' ? formatAxisLabel(time) : ''),
      },
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
      // Eje Y a 5 decimales en la escala derecha (RF-207).
      priceFormat: PRICE_FORMAT,
    });
    legendBatcherRef.current = createFrameBatcher();
    let suppress = 0;
    let lastRange = { from: Number.NaN, to: Number.NaN };
    /** Publica el crosshair actual a los demás paneles (RF-014). */
    const publishCrosshair = (param: MouseEventParams<Time>): void => {
      if (sync === undefined || suppress > 0) return;
      if (param.time === undefined || param.point === undefined) return;
      const data = param.seriesData.get(series) as Partial<Candle> | undefined;
      const price = data?.close ?? series.coordinateToPrice(param.point.y);
      if (price === undefined || price === null) return;
      sync.publish({
        source: syncId,
        crosshair: { time: Number(param.time), price: Number(price) },
      });
    };
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
      publishCrosshair(param);
      previewHandlerRef.current(param);
    });
    chartRef.current = chart;
    seriesRef.current = series;
    setOverlayBinding(createOverlayBinding(chart, series));
    const onChartClick = (param: MouseEventParams<Time>): void => clickHandlerRef.current(param);
    chart.subscribeClick(onChartClick);

    let unsubscribeVisibleRange: (() => void) | null = null;
    let unsubscribeSync: (() => void) | null = null;
    if (sync !== undefined) {
      const onVisibleRange = (): void => {
        if (suppress > 0) return;
        const range = chart.timeScale().getVisibleRange();
        if (range === null) return;
        const from = Number(range.from);
        const to = Number(range.to);
        if (from === lastRange.from && to === lastRange.to) return;
        lastRange = { from, to };
        sync.publish({ source: syncId, timeRange: { from, to } });
      };
      chart.timeScale().subscribeVisibleTimeRangeChange(onVisibleRange);
      unsubscribeVisibleRange = () =>
        chart.timeScale().unsubscribeVisibleTimeRangeChange(onVisibleRange);
      unsubscribeSync = sync.subscribe((message) => {
        if (message.source === syncId) return;
        suppress += 1;
        try {
          // Un panel puede no tener datos aún: no se aplica el rango (getVisibleRange null).
          if (message.timeRange !== undefined && chart.timeScale().getVisibleRange() !== null) {
            chart.timeScale().setVisibleRange({
              from: message.timeRange.from as Time,
              to: message.timeRange.to as Time,
            });
          }
          if (message.crosshair === null) {
            chart.clearCrosshairPosition();
          } else if (message.crosshair !== undefined) {
            chart.setCrosshairPosition(
              message.crosshair.price,
              message.crosshair.time as Time,
              series,
            );
          }
        } catch {
          // El panel destino no está listo (sin datos/serie); se ignora el mensaje.
        } finally {
          queueMicrotask(() => {
            suppress -= 1;
          });
        }
      });
    }
    return () => {
      chart.unsubscribeClick(onChartClick);
      unsubscribeVisibleRange?.();
      unsubscribeSync?.();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setOverlayBinding(null);
      legendBatcherRef.current?.cancel();
      legendBatcherRef.current = null;
    };
  }, [sync, syncId]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setPartialCoverage(false);
    seriesRef.current?.setData([]);
    fetchSeries({ symbol, timeframe, start, end })
      .then((response) => {
        if (cancelled) return;
        if (response.candles.length === 0) {
          setStatus('empty');
          return;
        }
        const last = response.candles[response.candles.length - 1];
        const first = response.candles[0];
        lastRef.current = last;
        candlesRef.current = response.candles;
        setLegendBar(last);
        seriesRef.current?.setData(response.candles as CandlestickData[]);
        chartRef.current?.timeScale().fitContent();
        setPartialCoverage(
          (start !== undefined && first.time > start) || (end !== undefined && last.time < end),
        );
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
    if (indicators.showAtr !== false) {
      const atrSerie = chart.addLineSeries({
        priceLineVisible: false,
        lastValueVisible: false,
        color: ATR_SERIES_COLOR,
        lineWidth: 1,
        priceScaleId: 'right',
      });
      atrSerie.setData(
        toLinePoints(times, atr.get(indicators.atrPeriod) ?? []) as LineData<Time>[],
      );
      indicatorSeriesRef.current.push(atrSerie);
    }
    if (indicators.showRsi !== false) {
      const rsiSerie = chart.addLineSeries({
        priceLineVisible: false,
        lastValueVisible: false,
        color: RSI_SERIES_COLOR,
        lineWidth: 1,
        priceScaleId: RSI_PRICE_SCALE_ID,
      });
      rsiSerie.setData(
        toLinePoints(times, rsi.get(indicators.rsiPeriod) ?? []) as LineData<Time>[],
      );
      indicatorSeriesRef.current.push(rsiSerie);
    }
    chart.priceScale('right').applyOptions({ scaleMargins: MAIN_SCALE_MARGINS });
    if (indicators.showRsi !== false) {
      chart.priceScale(RSI_PRICE_SCALE_ID).applyOptions({ scaleMargins: RSI_SCALE_MARGINS });
    }
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
      history.update((current) => current.filter((shape) => shape.id !== hit.id));
    }
  }

  /** Aplica la restricción H/V de `Shift` al 2.º punto de línea u operación (RF-210). */
  function constrainLineAnchor(
    from: PriceTimePoint,
    to: PriceTimePoint,
    cursor: PixelPoint,
  ): PriceTimePoint {
    const shiftable = activeTool === 'line' || activeTool === 'operation';
    if (!shiftable || !shiftRef.current || overlayBinding === null) return to;
    const fromPixel = projectPoint(from, overlayBinding);
    return fromPixel === null ? to : constrainToAxis(from, to, fromPixel, cursor);
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
    const to = constrainLineAnchor(drawFrom, anchor, cursor);
    const id = `${activeTool}-${drawFrom.time}-${to.time}`;
    let shape: OverlayShape;
    if (activeTool === 'line') {
      shape = { id, kind: 'line', from: drawFrom, to };
    } else if (activeTool === 'rect') {
      shape = { id, kind: 'rect', from: drawFrom, to };
    } else if (activeTool === 'operation') {
      shape = { id, kind: 'operation', from: drawFrom, to };
    } else {
      shape = { id, kind: 'fib', from: drawFrom, to };
    }
    history.update((current) => [...current, shape]);
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
    if (
      activeTool === 'line' ||
      activeTool === 'rect' ||
      activeTool === 'fib' ||
      activeTool === 'operation'
    ) {
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
    const anchorPrice = markerAnchorPrice(symbol, activeTool, candle.low, candle.high);
    const marker: MarkerShape = {
      id: `${activeTool}-${barTime}`,
      kind: 'marker',
      // Ancla fuera del rango de la vela (10 pips bajo/sobre la vela) — RF-208.
      position: { time: barTime, price: anchorPrice },
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
    setSelectedShapeId(null);
  }, [activeTool, setSelectedShapeId]);

  /** Maneja los atajos de teclado del panel (+/− zoom, 1 ajustar, Esc cancelar). */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && (event.key === 'z' || event.key === 'Z')) {
      event.preventDefault();
      if (event.shiftKey) {
        history.redo();
      } else {
        history.undo();
      }
      return;
    }
    if (modifier && (event.key === 'y' || event.key === 'Y')) {
      event.preventDefault();
      history.redo();
      return;
    }
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
    if (indicators.showAtr !== false) {
      entries.push({ label: `ATR(${indicators.atrPeriod})`, color: ATR_SERIES_COLOR });
    }
    if (indicators.showRsi !== false) {
      entries.push({ label: `RSI(${indicators.rsiPeriod})`, color: RSI_SERIES_COLOR });
    }
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
    if (
      drawFrom === null ||
      (activeTool !== 'line' &&
        activeTool !== 'rect' &&
        activeTool !== 'fib' &&
        activeTool !== 'operation')
    ) {
      return;
    }
    const point = param.point;
    if (point === undefined) return;
    const price = priceAt(point.y);
    if (param.time === undefined || price === null) return;
    const anchorTo = { time: Number(param.time), price };
    const to = constrainLineAnchor(drawFrom, anchorTo, { x: point.x, y: point.y });
    setPreviewShape({ id: 'preview', kind: activeTool, from: drawFrom, to } as OverlayShape);
  };

  return (
    <div className="chart-pane" data-shapes={overlayShapes.length}>
      <ChartHeader
        symbol={symbol}
        timeframe={timeframe}
        indicatorsOpen={indicatorsOpen}
        onOpenIndicators={onOpenIndicators ?? (() => {})}
        onExport={onExport ?? (() => {})}
        onFit={() => chartRef.current?.timeScale().fitContent()}
        disabled={status !== 'success'}
      />
      <ChartToolbar
        tools={TOOL_DESCRIPTORS}
        active={activeTool}
        onTool={setActiveTool}
        onUndo={history.undo}
        onRedo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
      />
      <div className="chart-pane__graph">
        <div
          ref={hostRef}
          className="chart-pane__host"
          role="img"
          aria-label={`Gráfico de velas ${symbol} ${timeframe}`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDownCapture={drawingEditHandlers.onPointerDown}
          onPointerMoveCapture={drawingEditHandlers.onPointerMove}
          onPointerUpCapture={drawingEditHandlers.onPointerUp}
          onPointerCancelCapture={drawingEditHandlers.onPointerCancel}
        />
        <OverlayCanvas
          hostRef={hostRef}
          binding={overlayBinding}
          shapes={overlayShapes}
          selectedShapeId={selectedShapeId}
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
        {status === 'loading' && (
          <div className="chart-pane__overlay" role="status" aria-live="polite">
            <span className="chart-pane__sr">Cargando serie…</span>
            <div className="chart-pane__skeleton" aria-hidden="true">
              {Array.from({ length: 14 }, (_, index) => (
                <span
                  key={index}
                  className="chart-pane__skeleton-bar"
                  style={{ height: `${30 + ((index * 7) % 55)}%` }}
                />
              ))}
            </div>
          </div>
        )}
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
      </div>
      {status === 'success' && partialCoverage && (
        <StatusBanner
          tone="warning"
          message="La cobertura disponible es menor al rango solicitado"
        />
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
