/**
 * API pública del módulo `export` (TASK-035/TASK-036, RF-015).
 *
 * Expone la composición del lienzo (velas + indicadores + dibujos) y su
 * serialización a PNG descargable.
 */
export {
  EXPORT_SCALES,
  composeChartCanvas,
  type ComposeChartOptions,
  type CompositionLayers,
  type ExportScale,
} from './compose';
export {
  EXPORT_FORMATS,
  EmptyExportError,
  ExportError,
  buildExportFilename,
  canvasToBlob,
  downloadBlob,
  exportChartPng,
  type ExportFilenameParts,
  type ExportFormat,
  type ExportPngOptions,
  type ExportPngResult,
} from './png';
