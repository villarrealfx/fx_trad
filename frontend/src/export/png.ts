/**
 * Export PNG del lienzo compuesto (TASK-036, RF-015).
 *
 * Convierte el canvas compuesto por TASK-035 (velas + indicadores + dibujos)
 * en un `Blob` PNG vía `HTMLCanvasElement.toBlob` y lo entrega listo para
 * descargar. **No persiste nada** (RI-003): el blob se descarga y el object URL
 * se revoca; no se escribe en el canvas, en el estado de React ni en
 * `localStorage`. El formato y la resolución se parametrizan (P-2): por defecto
 * PNG a 2x; el selector visual llega con el modal de TASK-UI-060.
 */
import { type ExportScale } from './compose';

/** Formatos de imagen soportados por el export (SCR-006; P-2). */
export const EXPORT_FORMATS = ['png', 'webp'] as const;

/** Formato de imagen exportado. */
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** MIME por formato para `toBlob`. */
const FORMAT_MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  webp: 'image/webp',
};

/** No hay lienzo que exportar (estado *empty* de SCR-006). */
export class EmptyExportError extends Error {
  constructor(message = 'No hay gráfico que exportar') {
    super(message);
    this.name = 'EmptyExportError';
  }
}

/** La generación del blob falló (estado *error* de SCR-006). */
export class ExportError extends Error {
  constructor(message = 'No se pudo generar la imagen') {
    super(message);
    this.name = 'ExportError';
  }
}

/** Opciones de `exportChartPng`. */
export interface ExportPngOptions {
  /** Canvas compuesto (salida de `ChartPane.compose`); `null` → empty. */
  canvas: HTMLCanvasElement | null;
  /** Símbolo del activo, usado en el nombre del archivo. */
  symbol: string;
  /** Granularidad, usada en el nombre del archivo. */
  timeframe: string;
  /** Factor de resolución (default 2x, P-2). */
  scale?: ExportScale;
  /** Formato de imagen (default PNG). */
  format?: ExportFormat;
}

/** Resultado de la generación del PNG. */
export interface ExportPngResult {
  /** Imagen generada lista para descargar. */
  blob: Blob;
  /** Nombre de archivo sugerido. */
  filename: string;
}

/** Partes del nombre de archivo de la captura. */
export interface ExportFilenameParts {
  symbol: string;
  timeframe: string;
  scale: ExportScale;
  format: ExportFormat;
}

/** Construye un nombre de archivo determinista para la captura. */
export function buildExportFilename(parts: ExportFilenameParts): string {
  return `fxtrad-${parts.symbol}-${parts.timeframe}-${parts.scale}x.${parts.format}`;
}

/**
 * Convierte un canvas en un `Blob` en el formato pedido.
 *
 * @param canvas Canvas ya compuesto a serializar.
 * @param format Formato de imagen (default PNG).
 * @returns El blob generado.
 * @throws ExportError si `toBlob` devuelve `null` (fallo de generación).
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat = 'png',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new ExportError());
        return;
      }
      resolve(blob);
    }, FORMAT_MIME[format]);
  });
}

/**
 * Genera el PNG del canvas compuesto sin descargarlo.
 *
 * @param options Canvas, metadatos y formato/resolución.
 * @returns El blob y el nombre de archivo sugerido.
 * @throws EmptyExportError si no hay canvas (nada que exportar).
 * @throws ExportError si la generación del blob falla.
 */
export async function exportChartPng(options: ExportPngOptions): Promise<ExportPngResult> {
  const { canvas, symbol, timeframe, scale = 2, format = 'png' } = options;
  if (canvas === null) {
    throw new EmptyExportError();
  }
  const blob = await canvasToBlob(canvas, format);
  return { blob, filename: buildExportFilename({ symbol, timeframe, scale, format }) };
}

/**
 * Dispara la descarga del blob y libera el object URL (sin persistencia, RI-003).
 *
 * @param blob Imagen a descargar.
 * @param filename Nombre de archivo sugerido.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
