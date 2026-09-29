import { useEffect, useRef, type MutableRefObject, type Ref, type RefObject } from 'react';
import { COLOR_TEXT_MUTED } from '../components/ChartPane/theme';
import { createFrameBatcher, type FrameBatcher } from '../performance/frame-batch';
import type { OverlayBinding } from './chart-binding';
import { colorForShape } from './drawings';
import { projectShape, type MarketDirection, type OverlayShape } from './overlay-geometry';

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
  /** Ref opcional al `<canvas>` overlay para su composición en export (TASK-035). */
  canvasRef?: Ref<HTMLCanvasElement>;
}

/** Triángulo del marcador (▲ compra / ▼ venta) con base sobre el ancla. */
const MARKER_SIZE = 6;

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

/** Overlay decorativo, no interactivo (los tools son TASK-028/029/030). */
export default function OverlayCanvas({
  hostRef,
  binding,
  shapes,
  strokeColor,
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
        drawMarker(context, fragment.position, fragment.direction, colorForShape(shape));
      }
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
  }, [hostRef, binding, shapes, strokeColor]);

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
