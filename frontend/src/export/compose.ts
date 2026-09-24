/**
 * Composición del lienzo de export (TASK-035, RF-015).
 *
 * Une en un único canvas fuera de pantalla las tres capas del gráfico:
 *
 * 1. **Velas + indicadores**: el canvas que renderiza `lightweight-charts`
 *    (obtenido con `IChartApi.takeScreenshot()`), que ya incluye las velas y
 *    las series MA/ATR/RSI (RF-013).
 * 2. **Dibujos**: el canvas overlay con líneas, rectángulos, Fibonacci y
 *    marcadores compra/venta (RF-011, RF-012), efímeros por RI-003.
 * 3. **Anotación**: el ticker y el timeframe en la esquina (SCR-006).
 *
 * La composición es la base del export PNG (TASK-036): el canvas resultante
 * admite `toBlob()` sin exponer nada del DOM. Si no hay ninguna capa se
 * devuelve `null` (estado *empty*); si solo falta una, se compone lo
 * disponible (estado *partial*), según `interaction-specs.md` de SCR-006.
 */
import { COLOR_BG, COLOR_TEXT } from '../components/ChartPane/theme';

/** Escalas de export permitidas (1x/2x/4x, P-2 pendiente en SCR-006). */
export const EXPORT_SCALES = [1, 2, 4] as const;

/** Factor de resolución de la imagen exportada. */
export type ExportScale = (typeof EXPORT_SCALES)[number];

/** Capas de origen a componer; cualquiera puede faltar (partial/empty). */
export interface CompositionLayers {
  /** Canvas de velas + indicadores (`takeScreenshot`). */
  chartCanvas?: HTMLCanvasElement | null;
  /** Canvas overlay de dibujos y marcadores. */
  overlayCanvas?: HTMLCanvasElement | null;
}

/** Opciones de `composeChartCanvas`. */
export interface ComposeChartOptions {
  /** Capas a fusionar (chart, overlay). */
  layers: CompositionLayers;
  /** Ancho del viewport en píxeles CSS. */
  width: number;
  /** Alto del viewport en píxeles CSS. */
  height: number;
  /** Factor de resolución (default 2x, P-2). */
  scale?: ExportScale;
  /** Color de fondo; por defecto el token `color-bg`. */
  background?: string;
  /** Anotación superpuesta (ticker · timeframe); opcional. */
  annotation?: string;
}

/** Dibuja la anotación (ticker/TF) en la esquina superior izquierda. */
function drawAnnotation(context: CanvasRenderingContext2D, text: string, scale: ExportScale): void {
  const padding = 12 * scale;
  const fontSize = 12 * scale;
  context.font = `${fontSize}px sans-serif`;
  context.textBaseline = 'top';
  context.fillStyle = COLOR_TEXT;
  context.fillText(text, padding, padding);
}

/**
 * Compone las capas en un canvas nuevo a la escala indicada.
 *
 * @param options Capas, tamaño CSS del viewport, escala, fondo y anotación.
 * @returns El canvas compuesto, o `null` si no hay capas o tamaño válido.
 */
export function composeChartCanvas(options: ComposeChartOptions): HTMLCanvasElement | null {
  const { layers, width, height, scale = 2, background = COLOR_BG, annotation } = options;
  const { chartCanvas, overlayCanvas } = layers;
  if (width <= 0 || height <= 0) return null;
  if ((chartCanvas ?? null) === null && (overlayCanvas ?? null) === null) return null;

  const canvas = document.createElement('canvas');
  const outWidth = Math.round(width * scale);
  const outHeight = Math.round(height * scale);
  canvas.width = outWidth;
  canvas.height = outHeight;
  const context = canvas.getContext('2d');
  if (context === null) return null;

  context.fillStyle = background;
  context.fillRect(0, 0, outWidth, outHeight);
  if (chartCanvas != null) {
    context.drawImage(chartCanvas, 0, 0, outWidth, outHeight);
  }
  if (overlayCanvas != null) {
    context.drawImage(overlayCanvas, 0, 0, outWidth, outHeight);
  }
  if (annotation !== undefined && annotation !== '') {
    drawAnnotation(context, annotation, scale);
  }
  return canvas;
}
