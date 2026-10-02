# Inventario de Componentes — Ciclo 04 (Dibujo Referencia de Operación)

> Nombres en inglés, labels visibles en español. Base:
> `_docs/iterations/03-mejoras-ux/ux/components.md` (CMP-001…020) e
> `_docs/iterations/01-mvp/ux/components.md`.
> **Este ciclo no modifica ningún componente existente**: reutiliza CMP-009 (con una
> variante más), CMP-018, CMP-019 y CMP-020, y añade dos nuevos.

## Componentes heredados (sin cambios)

| ID | Componente | Variantes | Nota en este ciclo |
|----|------------|-----------|--------------------|
| CMP-001 | Button | primary, ghost, icon | sin cambios |
| CMP-002 | Input | text, date | sin cambios |
| CMP-003 | Select | — | sin cambios |
| CMP-004 | RadioGroup | inline | sin cambios |
| CMP-005 | DateRange | — | sin cambios |
| CMP-006 | AssetList | — | sin cambios |
| CMP-007 | ChartPane | single, sync | sin cambios (dentro vive el overlay) |
| CMP-008 | ChartToolbar | — | sin cambios; recibe una herramienta más |
| CMP-009 | DrawTool | **+ operación** | **única extensión**: una variante y su descriptor |
| CMP-010 | IndicatorItem | overlay, panel | sin cambios |
| CMP-011 | Tab | — | sin cambios |
| CMP-012 | StatusBanner | success, error, warning | sin cambios |
| CMP-013 | ProgressBar | determinate | sin cambios |
| CMP-014 | Modal | export, confirm | sin cambios |
| CMP-015 | Toast | success, error | sin cambios |
| CMP-016 | IndicatorForm | popover | sin cambios |
| CMP-017 | ChartHeader | — | sin cambios |
| CMP-018 | DrawingHandle | endpoint, midpoint | **reutilizado**: los 2 handles de la operación son endpoints |
| CMP-019 | EditableDrawing | + operación | **reutilizado**: misma edición, command stack y persistencia |
| CMP-020 | LiveRegion | polite, assertive | **reutilizado**: es quien anuncia los valores de la operación |

## Componentes nuevos

| ID | Componente | Variantes | Props clave | Estados | Usado en |
|----|------------|-----------|-------------|---------|----------|
| **CMP-021** | **OperationDrawing** | `buy`, `sell`, `zeroRisk` | `from` (PrecioTimePoint), `to` (PrecioTimePoint), `selected`, `preview`, `onChange`, `onSelect` | default, selected, preview, zeroRisk, dragging | SCR-004, SCR-005 |
| **CMP-022** | **OperationLabels** | `anchored`, `displaced` | `levels` (5 derivados), `mapper` (precio→y), `minGap`, `offset` | default, displaced (con guía), hidden (zeroRisk) | SCR-004, SCR-005 |

### CMP-021 · OperationDrawing

Dibuja la figura completa: 5 líneas horizontales con el color de su nivel, 5 etiquetas vía
`OperationLabels`, y los 2 handles vía `DrawingHandle` cuando está seleccionada.

- **Props de contrato:**
  - `from` / `to`: `PriceTimePoint` — `from` es **Entrada**, `to` es **SL**. Es el único
    estado propio de la figura; todo lo demás es derivado (ADR-022, RI-301).
  - `selected`: activa handles y contorno.
  - `preview`: dibuja la figura en construcción; **solo render**, nunca seleccionable ni
    persistido.
  - `zeroRisk`: `from.price === to.price` → solo se dibujan SL y Entrada (que coinciden) y
    **se ocultan los 3 TP**. Sin marca persistida (ADR-023).
- **Deriva internamente** (función pura, en `operation-geometry`): `direction`, `risk`,
  `levels[5]`, `levelColors`.
- **Hereda de CMP-019:** edición por arrastre, `Shift` H/V, target ≥24 px, command stack de
  undo/redo, serialización para persistencia.

### CMP-022 · OperationLabels

Fija las 5 etiquetas y resuelve su solape (ADR-025, RNF-301).

- **Algoritmo (contrato, ver ADR-025):** cada etiqueta arranca en la `y` proyectada de su
  línea; de arriba abajo se empuja cada una lo necesario para respetar `minGap` (20 px); si
  la última se sale por debajo, el reparto se corrige desde el final. Toda etiqueta cuya
  `y` final difiera de la de su línea dibuja **línea guía** de `opLeaderWidth`.
- **Chip:** fondo `color-surface` opaco, `radius-sm`, padding `2px 4px`, sin borde;
  nombre en `color-text-muted`, precio en el color del nivel con `font-num` tabular,
  a 5 decimales.
- **Contrato de datos:** `mapper` de precio a píxel **por pane**, para que la separación
  mínima se cumpla pane a pane en Multigráfico.

## Tokens que consumen los componentes nuevos

| Token | Origen | Dónde se usa |
|-------|--------|--------------|
| `drawOpSl` / `drawOpEntry` / `drawOpTp` | `COLOR_TOKENS` (tokens.ts + tokens.css) | Color de línea y de precio de etiqueta, según nivel |
| `opLabelMinGap` / `opLabelOffset` / `opLabelPadX` / `opLabelPadY` / `opLabelRadius` | `OPERATION_TOKENS` | Geometría del chip |
| `opHitRadius` | `OPERATION_TOKENS` | Radio de hit-test por línea |
| `opLeaderWidth` | `OPERATION_TOKENS` | Línea guía |
| `opTPMultipliers` | `OPERATION_TOKENS` | `[1.382, 1.5, 2]` |
| `font-small` / `font-num` | `TYPOGRAPHY_TOKENS` | Nombre y precio de etiqueta |
| `color-surface` / `color-text-muted` / `color-text` | `COLOR_TOKENS` | Fondo y texto del chip |

`OPERATION_TOKENS` sigue el patrón ya establecido por `AXIS_TOKENS` (RF-206/207) y
`MARKER_TOKENS` (RF-208): **los tokens de formato también viven en `tokens.ts`**, porque el
canvas no puede leer `var()` de CSS.

## Reglas de composición

Se heredan todas las del ciclo 03, y se añaden:

- **Una etiqueta de nivel nunca se dibuja sin su línea guía** si ha sido desplazada: sin
  guía, la asociación etiqueta↔nivel es ambigua.
- **El color nunca es el único portador de información**: los tres TP comparten verde y se
  distinguen por el nombre de su etiqueta.
- **Toda mutación de una operación anuncia sus valores** en `LiveRegion`; el texto sale de
  la misma función pura que dibuja los niveles, así que no puede desincronizarse.
- `OperationDrawing` **no** implementa hit-testing propio: usa el de `overlay-geometry` con
  `opHitRadius` por línea, igual que `fib`.
- Ningún color se escribe literal en el componente: todo pasa por tokens (RNF-204/305).

## Contratos de datos que estos componentes consumen

- `PriceTimePoint` (`{time, price}`) — `time` en segundos UTC (RNF-004).
- `CoordinateMapper` del pane (precio→píxel) — el mismo que consume `fib`.
- `localStorage` `fxtrad.chart.v{n}.{symbol}.{timeframe}` → `{version, indicators, drawings}`;
  la operación entra en `drawings` **sin campos nuevos** (ADR-023).

## Componentes pendientes de definir

- **Entrada numérica de Entrada/SL** (formulario): daría ruta por teclado y precio exacto al
  pip. **Fuera de alcance de este ciclo** — ningún RF lo pide; requiere requisitos propios.
  Registrado en `user-journeys.md` §Brechas y `design-system.md` §7.
- **Leyenda / panel de resumen de la operación**: los valores ya salen por `LiveRegion`
  (accesibilidad), pero no hay equivalente visual para usuario sin lector de pantalla.
  Descartado en este ciclo por OE-3 (no tocar lo existente) y RNF-007.