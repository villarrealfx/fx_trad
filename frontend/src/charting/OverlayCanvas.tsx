import { useEffect, useRef, type MutableRefObject, type Ref, type RefObject } from 'react';
import { COLOR_FOCUS, COLOR_TEXT_MUTED } from '../components/ChartPane/theme';
import { createFrameBatcher, type FrameBatcher } from '../performance/frame-batch';
import { COLOR_TOKENS, FONT_FAMILY, OPERATION_TOKENS, TYPOGRAPHY_TOKENS } from '../styles/tokens';
import { PRICE_FORMAT } from './axis-format';
import type { OverlayBinding } from './chart-binding';
import { HANDLE_DRAW_SIZE, handlePositions } from './drawing-edit';
import { colorForShape } from './drawings';
import { layoutOperationLabels, type OperationColorRole } from './operation-geometry';
import {
  projectPoint,
  projectShape,
  type MarketDirection,
  type OverlayShape,
} from './overlay-geometry';

/**
 * Lienzo overlay de dibujos sincronizado con los ejes de lightweight-charts
 * (ADR-005, RF-011, TASK-027).
 *
 * Canvas transparente superpuesto al contenedor del gráfico donde se pintan
 * trazos anclados a precio/tiempo. Los redibujos ante pan/zoom y resize se
 * encolan con el batcher de frames (RNF-001): como máximo un repintado por
 * frame (60 FPS). Cada repintado re-proyecta las anclas con el mapeo actual,
 * lo que mantiene el trazo fijo a datos y no a píxeles.
 */
export interface OverlayCanvasProps {
  /** Contenedor del gráfico que define el tamaño del lienzo. */
  hostRef: RefObject<HTMLDivElement | null>;
  /** Binding al chart instanciado; null hasta que la serie está lista. */
  binding: OverlayBinding | null;
  /** Trazos a dibujar (anclados a precio/tiempo, efímeros RI-003). */
  shapes: ReadonlyArray<OverlayShape>;
  /**
   * Color de trazo que sobrescribe la paleta por tipo (RF-209). Si se omite,
   * cada trazo usa el token del design system según su `kind`.
   */
  strokeColor?: string;
  /** Id del trazo seleccionado: pinta sus handles de edición (RF-212). */
  selectedShapeId?: string | null;
  /** Ref opcional al `<canvas>` overlay para su composición en export (TASK-035). */
  canvasRef?: Ref<HTMLCanvasElement>;
}

/** Triángulo del marcador (▲ compra / ▼ venta) con base sobre el ancla. */
const MARKER_SIZE = 6;

/** Color de cada nivel de la operación, desde los tokens (RF-309, ADR-024). */
const OPERATION_LEVEL_COLORS: Record<OperationColorRole, string> = {
  sl: COLOR_TOKENS.drawOpSl,
  entry: COLOR_TOKENS.drawOpEntry,
  tp: COLOR_TOKENS.drawOpTp,
};

/** Tamaño de fuente de las etiquetas de nivel, en píxeles (font-num). */
const OPERATION_LABEL_FONT_SIZE = Number.parseInt(TYPOGRAPHY_TOKENS.num.fontSize, 10);

/** Traza un rectángulo redondeado (chip de etiqueta), sin borde (ADR-025). */
function traceRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

/**
 * Pinta una operación: cinco líneas de extremo a extremo con el color de su
 * nivel, sus chips de etiqueta (nombre + precio a `PRICE_FORMAT`) y la línea
 * guía de las desplazadas (RF-308, RF-309, RF-312, RNF-301).
 */
function drawOperation(
  context: CanvasRenderingContext2D,
  shape: Extract<OverlayShape, { kind: 'operation' }>,
  fragment: Extract<ReturnType<typeof projectShape>, { kind: 'operation' }>,
  mapper: OverlayBinding,
  width: number,
  height: number,
): void {
  // En riesgo nulo (Entrada == SL) solo se dibujan SL y Entrada; los TP se ocultan.
  const zeroRisk = shape.from.price === shape.to.price;
  const levels = zeroRisk
    ? fragment.levels.filter((level) => level.colorRole !== 'tp')
    : fragment.levels;

  for (const level of levels) {
    context.strokeStyle = OPERATION_LEVEL_COLORS[level.colorRole];
    context.beginPath();
    context.moveTo(0, level.y);
    context.lineTo(width, level.y);
    context.stroke();
  }

  const layout = layoutOperationLabels(
    levels.map((level) => ({ key: level.key, y: level.y })),
    OPERATION_TOKENS.labelMinGap,
    { top: 0, bottom: height },
  );

  const stop = projectPoint(shape.to, mapper);
  const labelX = (stop === null ? width : stop.x) + OPERATION_TOKENS.labelOffset;
  const chipHeight = OPERATION_LABEL_FONT_SIZE + OPERATION_TOKENS.labelPadY * 2;
  context.font = [
    TYPOGRAPHY_TOKENS.num.fontWeight,
    TYPOGRAPHY_TOKENS.num.fontSize,
    FONT_FAMILY,
  ].join(' ');
  context.textBaseline = 'middle';
  context.textAlign = 'left';

  for (const [index, level] of levels.entries()) {
    const placed = layout[index];
    const name = level.label;
    const price = level.price.toFixed(PRICE_FORMAT.precision);
    const nameWidth = context.measureText(name).width;
    const priceWidth = context.measureText(price).width;
    const chipWidth =
      OPERATION_TOKENS.labelPadX * 2 + nameWidth + OPERATION_TOKENS.labelPadX + priceWidth;

    if (placed.leader) {
      context.strokeStyle = OPERATION_LEVEL_COLORS[level.colorRole];
      context.lineWidth = OPERATION_TOKENS.leaderWidth;
      context.beginPath();
      context.moveTo(labelX - 2, level.y);
      context.lineTo(labelX - 2, placed.y);
      context.stroke();
      context.lineWidth = 1.5;
    }

    context.fillStyle = COLOR_TOKENS.surface;
    traceRoundedRect(
      context,
      labelX,
      placed.y - chipHeight / 2,
      chipWidth,
      chipHeight,
      OPERATION_TOKENS.labelRadius,
    );
    context.fill();

    context.fillStyle = COLOR_TEXT_MUTED;
    context.fillText(name, labelX + OPERATION_TOKENS.labelPadX, placed.y);
    context.fillStyle = OPERATION_LEVEL_COLORS[level.colorRole];
    context.fillText(
      price,
      labelX + OPERATION_TOKENS.labelPadX + nameWidth + OPERATION_TOKENS.labelPadX,
      placed.y,
    );
  }
}

function drawMarker(
  context: CanvasRenderingContext2D,
  position: { x: number; y: number },
  direction: MarketDirection,
  color: string,
): void {
  const size = MARKER_SIZE;
  const tipOffset = direction === 'buy' ? -size : size;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(position.x, position.y);
  context.lineTo(position.x + size, position.y);
  context.lineTo(position.x, position.y + tipOffset);
  context.lineTo(position.x - size, position.y);
  context.closePath();
  context.fill();
}

/** Pinta los handles de edición del trazo seleccionado (RF-212). */
function drawSelectionHandles(
  context: CanvasRenderingContext2D,
  shapes: ReadonlyArray<OverlayShape>,
  selectedShapeId: string | null,
  mapper: OverlayBinding,
): void {
  if (selectedShapeId === null) return;
  const selected = shapes.find((shape) => shape.id === selectedShapeId);
  if (selected === undefined) return;
  const half = HANDLE_DRAW_SIZE / 2;
  context.fillStyle = COLOR_FOCUS;
  for (const handle of handlePositions(selected, mapper)) {
    const x = handle.point.x - half;
    const y = handle.point.y - half;
    context.fillRect(x, y, HANDLE_DRAW_SIZE, HANDLE_DRAW_SIZE);
  }
}

/** Overlay decorativo, no interactivo (los tools son TASK-028/029/030). */
export default function OverlayCanvas({
  hostRef,
  binding,
  shapes,
  strokeColor,
  selectedShapeId = null,
  canvasRef: externalCanvasRef,
}: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const batcherRef = useRef<FrameBatcher | null>(null);

  /** Asigna el nodo al ref interno y, si existe, al ref externo de export. */
  const assignCanvas = (node: HTMLCanvasElement | null): void => {
    canvasRef.current = node;
    if (typeof externalCanvasRef === 'function') {
      externalCanvasRef(node);
    } else if (externalCanvasRef != null) {
      (externalCanvasRef as MutableRefObject<HTMLCanvasElement | null>).current = node;
    }
  };

  useEffect(() => {
    batcherRef.current = createFrameBatcher();
    return () => {
      batcherRef.current?.cancel();
      batcherRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (canvas === null || host === null || binding === null) return;
    const context = canvas.getContext('2d');
    if (context === null) return;

    const draw = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = host.clientWidth;
      const height = host.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1.5;
      for (const shape of shapes) {
        const fragment = projectShape(shape, binding);
        if (fragment.kind === 'hidden') continue;
        // Paleta por tipo desde los tokens; `strokeColor` la sobrescribe (RF-209).
        context.strokeStyle = strokeColor ?? colorForShape(shape);
        if (fragment.kind === 'line') {
          context.beginPath();
          context.moveTo(fragment.from.x, fragment.from.y);
          context.lineTo(fragment.to.x, fragment.to.y);
          context.stroke();
          continue;
        }
        if (fragment.kind === 'rect') {
          const x = Math.min(fragment.from.x, fragment.to.x);
          const y = Math.min(fragment.from.y, fragment.to.y);
          const width = Math.abs(fragment.to.x - fragment.from.x);
          const height = Math.abs(fragment.to.y - fragment.from.y);
          context.strokeRect(x, y, width, height);
          continue;
        }
        if (fragment.kind === 'fib') {
          const x1 = Math.min(fragment.from.x, fragment.to.x);
          const x2 = Math.max(fragment.from.x, fragment.to.x);
          for (const level of fragment.levels) {
            context.beginPath();
            context.moveTo(x1, level.y);
            context.lineTo(x2, level.y);
            context.stroke();
          }
          context.fillStyle = COLOR_TEXT_MUTED;
          context.font = '10px sans-serif';
          context.textBaseline = 'middle';
          for (const level of fragment.levels) {
            context.fillText(String(level.ratio), x2 + 4, level.y);
          }
          continue;
        }
        if (fragment.kind === 'operation') {
          if (shape.kind === 'operation') {
            drawOperation(context, shape, fragment, binding, width, height);
          }
          continue;
        }
        drawMarker(context, fragment.position, fragment.direction, colorForShape(shape));
      }
      drawSelectionHandles(context, shapes, selectedShapeId, binding);
    };

    const scheduleRedraw = (): void => batcherRef.current?.schedule(draw);
    const unsubscribe = binding.subscribeRedraw(scheduleRedraw);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleRedraw);
      resizeObserver.observe(host);
    }

    scheduleRedraw();

    return () => {
      unsubscribe();
      resizeObserver?.disconnect();
    };
  }, [hostRef, binding, shapes, strokeColor, selectedShapeId]);

  return (
    <canvas
      ref={assignCanvas}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 3,
      }}
      aria-hidden="true"
    />
  );
}
