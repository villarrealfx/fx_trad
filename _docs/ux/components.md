# Inventario de Componentes — Ciclo 05 (Mejoras UX del Gráfico y Cierre de Deuda)

> Nombres en inglés, labels visibles en español. Base:
> `_docs/iterations/04-dibujo-referencia-operacion/ux/components.md`.
> Este ciclo **añade tres componentes** (CMP-023…025), **retira una variante** (CMP-007 `sync`) y
> deja uno sin uso en producción (CMP-011 Tab). Los CMP-021/022 de la operación no cambian.

## Componentes heredados

| ID | Componente | Variantes | Nota en este ciclo |
|----|------------|-----------|--------------------|
| CMP-001 | Button | primary, ghost, icon | sin cambios; `Aplicar`/`Cancelar` del popover y `Precios` |
| CMP-002 | Input | text, date | **ampliado**: variante numérica (`inputMode="decimal"`, 5 decimales) dentro de CMP-025 |
| CMP-003 | Select | — | sin cambios |
| CMP-004 | RadioGroup | inline | sin cambios; patrón que sigue CMP-023 |
| CMP-005 | DateRange | — | sin cambios |
| CMP-006 | AssetList | — | sin cambios |
| CMP-007 | ChartPane | single ~~, sync~~ | **se retira la variante `sync`** con las props `sync`/`syncId` (ADR-029) |
| CMP-008 | ChartToolbar | — | sin cambios |
| CMP-009 | DrawTool | + operación | sin cambios |
| CMP-010 | IndicatorItem | overlay, panel | sin cambios |
| CMP-011 | Tab | — | **pierde su uso en producción** al retirarse SCR-005; se conserva como componente del kit (con tests) |
| CMP-012 | StatusBanner | success, error, warning | sin cambios; **cambia la condición** que dispara el aviso de cobertura (RF-402), no el componente |
| CMP-013 | ProgressBar | determinate | sin cambios |
| CMP-014 | Modal | export, confirm | sin cambios; `SCR-006` **se mantiene** (RF-411/D-18) |
| CMP-015 | Toast | success, error | sin cambios |
| CMP-016 | IndicatorForm | popover | sin cambios |
| CMP-017 | ChartHeader | — | **ampliado**: aloja CMP-023 a la izquierda del botón de Indicadores |
| CMP-018 | DrawingHandle | endpoint, midpoint | sin cambios |
| CMP-019 | EditableDrawing | + operación | sin cambios |
| CMP-020 | LiveRegion | polite, assertive | sin cambios; **anuncia también** los cambios hechos por CMP-025 |
| CMP-021 | OperationDrawing | buy, sell, zeroRisk | sin cambios |
| CMP-022 | OperationLabels | anchored, displaced | sin cambios; deja de tener uso en Multigráfico (retirada) |

## Componentes nuevos

| ID | Componente | Variantes | Props clave | Estados | Usado en |
|----|------------|-----------|-------------|---------|----------|
| **CMP-023** | **TimeframeSelector** | `segmented` | `value: Timeframe`, `options: Timeframe[]`, `disabled`, `onChange` | default, hover, focus, active, disabled | SCR-004 |
| **CMP-024** | **CandleContextMenu** | `candle` | `candle: Candle`, `anchor: {x, y}`, `onClose` | open, closing, repositioned, closed | SCR-004 |
| **CMP-025** | **OperationNumericFields** | `popover` | `entry: number`, `stopLoss: number`, `decimals = 5`, `onApply`, `onCancel` | idle, editing, invalid, committed | SCR-004 |

### CMP-023 · TimeframeSelector

Control segmentado con **un solo TF activo** a la vez (RF-406).

- **Opciones:** exactamente `TIMEFRAMES` (`1m, 5m, 15m, 1h, 4h, 1d`); no se inventan TF. `30 m`
  queda fuera del glosario (D-6).
- **Contrato de accesibilidad:** `role="radiogroup"` + `aria-label="Timeframe"`; cada opción es un
  `radio` con `aria-checked`; flechas ←/→ y `Home`/`End` mueven la selección; target ≥44×32 px (el
  criterio **AA** aplicable es WCAG 2.5.8, ≥24×24; 2.5.5 son 44×44 y es **AAA**).
- **Estado `disabled`:** mientras el gráfico está en `loading` o `switching-tf`, para no encadenar
  cambios de serie.
- **No confirma ni descarta:** el cambio es reversible y no destructivo (los dibujos pertenecen al
  activo, ADR-027).

### CMP-024 · CandleContextMenu

Panel flotante con el dato exacto de una vela (RF-408).

- **Contenido:** cabecera `fecha · hora` y las cuatro cifras OHLC en dos columnas, a 5 decimales
  con `font-num` tabular (misma fuente de formato que el eje y la leyenda).
- **Apertura:** clic derecho sobre una vela. **No sustituye** la leyenda inferior `🎯`: la leyenda
  sigue al cursor; el menú **fija** una vela.
- **Cierre:** `Escape`, clic fuera o al cambiar de TF; el foco vuelve al gráfico.
- **Reposicionamiento:** si el panel no cabe en el viewport se desplaza (estado `repositioned`);
  **nunca** recorta el dato.
- **Rendimiento:** fondo y sombra estáticos, sin desenfoque (`backdrop-filter`), para no
  comprometer los 60 FPS (RNF-403).

### CMP-025 · OperationNumericFields

Popover anclado a la figura seleccionada con Entrada y SL por teclado (RF-410).

- **Apertura:** botón «Precios» con la figura seleccionada, o doble clic sobre la etiqueta de un
  nivel. Se ancla a la figura, no a la pantalla.
- **Campos:** dos `Input` numéricos con **label visible** (`Entrada`, `Stop Loss`), `inputMode`
  decimal y la precisión del activo (5 decimales; admite el separador local).
- **Validación:** valor no numérico o `Entrada == SL` con `R = 0` → error **inline** asociado al
  campo (`role="alert"`), botón `Aplicar` deshabilitado. Nunca un alert del navegador.
- **Aplicar:** `Enter` confirma, `Tab` pasa de Entrada a SL, `Escape` cancela y devuelve el foco a
  la figura. La mutación pasa por el command stack (`Ctrl+Z` la revierte) y se anuncia en
  `LiveRegion` con el mismo formato que el resto de mutaciones (CMP-020).
- **Por qué un popover y no campos fijos:** no roba alto al gráfico (RNF-403 y eficiencia de
  pantalla) y mantiene el foco donde está el trabajo.

## Reglas de composición

Se heredan todas las del ciclo 04 y se añaden:

- **Ningún `Button` sin label visible o `aria-label`**; ningún `Input` solo con placeholder: los
  campos de CMP-025 llevan `label` visible.
- **Errores inline, nunca en `alert`**: el popover numérico marca el campo y asocia el mensaje.
- **Todo panel flotante atrapa el foco al abrir y lo devuelve al cerrar** (CMP-024 y CMP-025), y
  se cierra con `Escape`.
- **El color nunca es el único portador de información** (heredada): el TF activo se marca con
  color **y** con `aria-checked`/forma; los niveles con su etiqueta.
- **Ningún color se escribe literal en el componente**: todo pasa por tokens (RNF-204/305),
  incluida la línea de eje corregida (`color-draw-line`).

## Contratos de datos que estos componentes consumen

- `Candle` (`{time, open, high, low, close}`) — `time` en segundos UTC (RNF-004): lo consume
  CMP-024.
- `Timeframe` = los valores de `TIMEFRAMES` (`contracts/ohlc.ts`): los consume CMP-023.
- `PriceTimePoint` (`{time, price}`) — ancla de los dibujos; es lo que permite verlos en cualquier
  TF (ADR-027).
- **Documento v2** en `localStorage`, clave `fxtrad.chart.v2.{symbol}`:
  `{version: 2, symbol, drawings, indicators, selection}` (ADR-027). Sustituye al documento por
  activo+TF del ciclo 04.
- **Selección** `{timeframe, start?, end?}` dentro del documento v2 (ADR-028); precedencia
  URL > persistido > defecto.

## Componentes pendientes de definir

- **Panel visual de resumen de la operación:** los valores salen por `LiveRegion` y por las
  etiquetas del canvas, pero no hay equivalente visual permanente. **Fuera de alcance**: ningún RF
  lo pide (`design-system.md` §7).
- **Sustituta de Multigráfico:** no se define; volver a tener comparación multi-activo exige un
  requisito nuevo (`RF-W-404`).
