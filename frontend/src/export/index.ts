/**
 * API pública del módulo `export` (TASK-035, RF-015).
 *
 * Expone la composición del lienzo (velas + indicadores + dibujos) que
 * consumirá el export PNG de TASK-036.
 */
export {
  EXPORT_SCALES,
  composeChartCanvas,
  type ComposeChartOptions,
  type CompositionLayers,
  type ExportScale,
} from './compose';
