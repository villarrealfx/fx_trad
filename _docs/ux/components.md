# Inventario de Componentes — Ciclo 03

> Nombres en inglés, labels visibles en español. Base: `_docs/iterations/01-mvp/ux/components.md`.
> Los componentes nuevos/refactorizados del ciclo 03 están marcados.

| ID | Componente | Variantes | Props clave | Estados | Usado en |
|----|------------|-----------|-------------|---------|----------|
| CMP-001 | Button | primary, ghost, icon | `label`, `onClick`, `disabled`, `loading`, `ariaLabel` | default, hover, focus, active, disabled, loading | SCR-001…006 |
| CMP-002 | Input | text, date | `label`, `value`, `error`, `onChange`, `ariaLabel` | default, focus, error, disabled | SCR-002, SCR-003 |
| CMP-003 | Select | — | `label`, `options`, `value`, `onChange`, `error` | default, focus, error, disabled | SCR-002, SCR-003, SCR-004, SCR-005 |
| CMP-004 | RadioGroup | inline | `name`, `options`, `value`, `onChange` | default, focus, disabled | SCR-003, SCR-006 |
| CMP-005 | DateRange | — | `start`, `end`, `min`, `max`, `onChange` | default, parcial, error | SCR-002, SCR-003 |
| CMP-006 | AssetList | — | `rows` (activo, cobertura, estado), `onGraph`, `onUpdate` | default, empty, loading, row-error | SCR-001 |
| CMP-007 | ChartPane | single, sync | `data` (OHLC), `options` (ejes X/Y), `onCrosshair` | loading, empty, error, success, no-data | SCR-004, SCR-005 |
| CMP-008 | ChartToolbar | — | `tools`, `onTool`, `onZoomFit`, `onUndo`, `onRedo`, `disabled` | default, tool-activa, can-undo, can-redo, disabled | SCR-004 |
| CMP-009 | DrawTool | línea, rect, fib, buy, sell, borrar | `type`, `active`, `onSelect`, `icon`, `ariaLabel` | default, active (`aria-pressed`), disabled | SCR-004 |
| CMP-010 | IndicatorItem | overlay (MA/ATR), panel (RSI) | `name`, `params`, `visible`, `onToggle`, `onConfig`, `onRemove` | default, config-open, oculto, removed | SCR-004 |
| CMP-011 | Tab | — | `tabs`, `active`, `onAdd`, `onRemove` | default, active, disabled | SCR-005 |
| CMP-012 | StatusBanner | success, error, warning | `tone`, `message`, `action?`, `onAction` | default, dismissible, auto-dismiss | SCR-001, SCR-002, SCR-004 |
| CMP-013 | ProgressBar | determinate | `percent`, `label`, `ariaValuenow` | running, paused, complete | SCR-002 |
| CMP-014 | Modal | export, confirm | `open`, `title`, `children`, `onClose`, `focusTrap` | open, closed, loading | SCR-006 |
| CMP-015 | Toast | success, error | `tone`, `message`, `duration`, `onClose` | visible, auto-dismiss, dismissible | SCR-001, SCR-002, SCR-004, SCR-006 |
| **CMP-016** | **IndicatorForm** (nuevo) | popover no modal | `open`, `indicators`, `onAdd`, `onToggle`, `onConfig`, `onRemove`, `onClose` | closed, open, empty-list, adding | SCR-004, SCR-005 |
| **CMP-017** | **ChartHeader** (nuevo) | — | `symbol`, `timeframe`, `onOpenIndicators`, `onExport`, `onFit` | default, indicators-open | SCR-004, SCR-005 |
| **CMP-018** | **DrawingHandle** (nuevo) | endpoint, midpoint | `position`, `onDragStart`, `onDrag`, `onDragEnd` | default, hover, active, disabled | SCR-004, SCR-005 |
| **CMP-019** | **EditableDrawing** (nuevo) | line, rect, fib, buy, sell | `model`, `editable`, `onChange`, `selected` | default, selected, dragging, read-only | SCR-004, SCR-005 |

## Reglas de composición

- Un Button nunca se usa sin label visible o `aria-label` (y tooltip si es icon-only).
- Inputs/Selects siempre con `<label>` visible (nunca solo placeholder).
- Errores inline por campo; globales en StatusBanner/Toast.
- ChartPane consume únicamente el contrato OHLC (RNF-008).
- **IndicatorForm:** popover no modal; `Escape` cierra; cerrado **no** elimina indicadores (persisten).
- **EditableDrawing + DrawingHandle:** edición por arrastre (target ≥24px); cada mutación pasa por el command stack (undo/redo); serializable para persistencia (ADR-017/018).
- Los colores de dibujo se toman de los tokens `color-draw-*` (no hardcodeados).

## Contratos de datos que estos componentes consumen

- `GET /assets` → `AssetRow[]` (fuente única del catálogo, ADR-021).
- `GET /series?symbol&timeframe&start&end` → `OhlcResponse` (ADR-005, RNF-008).
- `POST /downloads` + `GET /downloads/{id}` → estado de descarga asíncrona.
- `GET /downloads` → `[{date, active, range, status, rows}]` (RI-002; **active** visible).
- `localStorage` `fxtrad.chart.v{n}.{symbol}.{timeframe}` → `{version, indicators, drawings}` (ADR-018).

## Componentes pendientes de definir

- Campos exactos de configuración de indicadores (MA/RSI/ATR) — abierto a `/sdd-implement`,
  defaults MA 20/50/200, RSI 14, ATR 14.
- Migración de esquema de persistencia ante cambio de versión (política de descarte vs migrar).
