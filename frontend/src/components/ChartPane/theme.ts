/**
 * Tokens del design system usados por el ChartPane (TASK-UI-000).
 *
 * Reexporta la fuente única `src/styles/tokens.ts` conservando los nombres
 * históricos para no romper a los consumidores (ChartPane, OverlayCanvas,
 * export). Para código nuevo, importar directamente desde `styles/tokens`.
 */
import { COLOR_TOKENS } from '../../styles/tokens';

/** Color de fondo de la app / chart. */
export const COLOR_BG: string = COLOR_TOKENS.bg;
/** Color de bordes y separadores. */
export const COLOR_BORDER: string = COLOR_TOKENS.border;
/** Color de texto principal. */
export const COLOR_TEXT: string = COLOR_TOKENS.text;
/** Color de texto secundario, helpers y leyendas. */
export const COLOR_TEXT_MUTED: string = COLOR_TOKENS.textMuted;
/** Color de velas alcistas y accent de CTA. */
export const COLOR_UP: string = COLOR_TOKENS.up;
/** Color de velas bajistas y errores. */
export const COLOR_DOWN: string = COLOR_TOKENS.down;
/** Color de estado parcial / pendiente. */
export const COLOR_WARNING: string = COLOR_TOKENS.warning;
/** Color del anillo de foco visible. */
export const COLOR_FOCUS: string = COLOR_TOKENS.focus;

/** Paleta de trazos para las medias móviles (MA20, MA50, MA200…) — RF-013. */
export const MA_SERIES_COLORS: readonly string[] = [COLOR_FOCUS, COLOR_UP, COLOR_WARNING];

/** Color del overlay ATR (secundario, sobrio sobre el precio). */
export const ATR_SERIES_COLOR: string = COLOR_TEXT_MUTED;

/** Color del RSI en su banda inferior. */
export const RSI_SERIES_COLOR: string = COLOR_FOCUS;
