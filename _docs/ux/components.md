# Inventario de Componentes

> Componentes reutilizables; nombres en inglés, labels visibles en español.
> Consumo directo por `/sdd-implement`; props clave = contrato mínimo del componente.

| ID | Componente | Variantes | Props clave | Estados | Usado en |
|----|------------|-----------|-------------|---------|----------|
| CMP-001 | Button | primary, ghost, icon | `label`, `onClick`, `disabled`, `loading`, `ariaLabel` | default, hover, focus, active, disabled, loading | SCR-001…006 |
| CMP-002 | Input | text, date | `label`, `value`, `error`, `onChange`, `ariaLabel` | default, focus, error, disabled | SCR-002, SCR-003 |
| CMP-003 | Select | — | `label`, `options`, `value`, `onChange`, `error` | default, focus, error, disabled | SCR-002, SCR-003, SCR-004, SCR-005 |
| CMP-004 | RadioGroup | inline | `name`, `options`, `value`, `onChange` | default, focus, disabled | SCR-003, SCR-006 |
| CMP-005 | DateRange | — | `start`, `end`, `min`, `max`, `validación`, `onChange` | default, parcial, error (inicio>fin, fuera de cobertura) | SCR-002, SCR-003 |
| CMP-006 | AssetList | — | `rows` (activo, cobertura, estado), `onGraph`, `onUpdate` | default, empty, loading, row-error | SCR-001 |
| CMP-007 | ChartPane | single, sync | `data` (OHLC), `options`, `onCrosshair`, `size`, `id` | loading, empty, error, success, no-data | SCR-004, SCR-005 |
| CMP-008 | ChartToolbar | — | `tools` (activo), `onTool`, `onZoomFit`, `disabled` | default, tool-activa, disabled | SCR-004 |
| CMP-009 | DrawTool | línea, rect, fib, buy, sell, borrar | `type`, `active`, `onSelect`, `icon`, `ariaLabel` | default, active (`aria-pressed`), disabled | SCR-004 |
| CMP-010 | IndicatorItem | overlay (MA/ATR), panel (RSI) | `name`, `params`, `onConfig`, `onRemove`, `visible` | default, config-open, removed | SCR-004 |
| CMP-011 | Tab | — | `tabs` (activo·TF), `active`, `onAdd`, `onRemove` | default, active, disabled | SCR-005 |
| CMP-012 | StatusBanner | success, error, warning | `tone`, `message`, `action?`, `onAction` | default, dismissible, auto-dismiss (success) | SCR-001, SCR-002, SCR-004 |
| CMP-013 | ProgressBar | determinate (descarga) | `percent`, `label`, `ariaValuenow` | running, paused, complete | SCR-002 |
| CMP-014 | Modal | export, confirm | `open`, `title`, `children`, `onClose`, `focusTrap` | open, closed, loading | SCR-006 |
| CMP-015 | Toast | success, error | `tone`, `message`, `duration`, `onClose` | visible, auto-dismiss, dismissible | SCR-001, SCR-002, SCR-004, SCR-006 |

## Reglas de composición

- Un Button nunca se usa sin label visible o `aria-label` **y** tooltip si es icon-only.
- Los Inputs/Selects siempre van con `<label>` visible (nunca placeholder como único label).
- Los errores se muestran inline por campo; errores globales en StatusBanner/Toast (no en alert nativo).
- ChartPane consume únicamente el contrato OHLC (`time` segundos UTC / `open`/`high`/`low`/`close`) — RNF-008, sin transformaciones de datos en frontend.
- El overlay de dibujos (DrawTool) es responsabilidad del ChartPane (canvas overlay, ADR-005); los tools NO mantienen estado de dibujo persistente (RI-003).

## Contratos de datos que estos componentes consumen (para /sdd-implement)

- `GET /assets` → `[{symbol, type, coverage_start, coverage_end, status}]`
- `GET /assets/{symbol}/series?from&to&timeframe` → `[{time, open, high, low, close}]`
- `POST /downloads` + `POST /downloads/status` → estado de descarga asíncrona (Celery)
- `GET /downloads` (historial, RI-002) → `[{date, active, range, status, rows}]`

## Componentes pendientes de definir

- **Selector de resolución de export** (P-2 pendiente: 1x/2x/4x, formatos). Contrato cerrado al resolver P-2.
- **Indicadores configurables:** panel de configuración de parámetros (MA period, RSI period, ATR period) — definición de campos abierta al implementar, default MA 20/50/200, RSI 14, ATR 14.