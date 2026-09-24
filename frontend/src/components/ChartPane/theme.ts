/**
 * Mapeo interino de tokens del design system (`_docs/ux/design-system.md`).
 *
 * Provisional hasta que TASK-UI-000 entregue los tokens consumibles desde
 * código (CSS custom properties); al llegar, estas constantes se reemplazan
 * por los nombres equivalentes del sistema de tokens.
 */
export const COLOR_BG = '#0A0C10';
export const COLOR_BORDER = '#30363D';
export const COLOR_TEXT = '#E6EDF3';
export const COLOR_TEXT_MUTED = '#8B949E';
export const COLOR_UP = '#26A69A';
export const COLOR_DOWN = '#EF5350';
export const COLOR_WARNING = '#C9B458';

/** Token accent del design system (#58A6FF); trazo del overlay de dibujos (TASK-027). */
export const COLOR_FOCUS = '#58A6FF';

/** Paleta de trazos para las medias móviles (MA20, MA50, MA200…) — RF-013. */
export const MA_SERIES_COLORS = [COLOR_FOCUS, COLOR_UP, COLOR_WARNING];

/** Color del overlay ATR (secundario, sobrio sobre el precio). */
export const ATR_SERIES_COLOR = COLOR_TEXT_MUTED;

/** Color del RSI en su banda inferior. */
export const RSI_SERIES_COLOR = COLOR_FOCUS;
