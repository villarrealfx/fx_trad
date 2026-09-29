# Design System — Ciclo 03

> Dark-first, minimalista y denso. Base: `_docs/iterations/01-mvp/ux/design-system.md`.
> Evoluciona el sistema con la paleta de dibujos, el formulario flotante y la precisión de ejes.

## 1. Principios de diseño

- **Claridad sobre adorno:** nada decorativo sobre el canvas.
- **Datos primero:** velas, precio y tiempo son protagonistas.
- **Consistencia de dominio:** convenciones de trading (eje de precio a la derecha, 5 decimales).
- **Eficiencia de pantalla:** el gráfico usa todo el alto disponible (sin panel inferior).

## 2. Tokens

### Color (base)

| Token | Valor (hex) | Uso | Contraste |
|-------|-------------|-----|-----------|
| color-bg | `#0A0C10` | Fondo app/chart | — |
| color-surface | `#161B22` | Paneles, toolbars, filas | texto sobre surface ≈ 14.6:1 ✅ |
| color-border | `#30363D` | Bordes/separadores | (no texto) |
| color-text | `#E6EDF3` | Texto principal | ≈ 16.6:1 ✅ |
| color-text-muted | `#8B949E` | Secundario/leyendas | ≈ 6.4:1 ✅ |
| color-up | `#26A69A` | Velas alcistas / CTA | ≈ 6.6:1 ✅ |
| color-down | `#EF5350` | Velas bajistas / errores | ≈ 5.6:1 ✅ |
| color-warning | `#C9B458` | Estado parcial | ≈ 8:1 ✅ |
| color-focus | `#58A6FF` | Anillo de foco | ≈ 7.5:1 ✅ |

### Color (dibujos y superficies flotantes — nuevo ciclo 03)

| Token | Valor (hex) | Uso | Nota |
|-------|-------------|-----|------|
| color-draw-line | `#4A6572` | Dibujo línea (mate) | No textual; se distingue por forma — RF-209 |
| color-draw-rect | `#D6C7AE` | Dibujo rectángulo (mate) | No textual; contorno visible — RF-209 |
| color-draw-fib | `#DDB2AC` | Dibujo Fibonacci (mate) | No textual; niveles etiquetados — RF-209 |
| color-popover-bg | `#161B22` | Superficie del formulario flotante | Igual a surface |
| color-popover-border | `#30363D` | Borde del popover | — |
| shadow-popover | `0 8px 24px rgba(0,0,0,0.5)` | Profundidad del popover | — |

*Los colores de dibujo son tonos claros sobre fondo oscuro; el contraste no textual ≥3:1 se
verifica con axe/Lighthouse. Siempre se acompaña de forma/etiqueta además del color.*

### Tipografía

| Token | Fuente | Tamaño | Peso | Uso |
|-------|--------|--------|------|-----|
| font-h1 | Inter / system-ui | 24px | 700 | Título de pantalla |
| font-h2 | Inter / system-ui | 16px | 600 | Secciones/toolbars |
| font-body | Inter / system-ui | 14px | 400 | Texto general |
| font-small | Inter / system-ui | 12px | 400 | Helpers/leyenda |
| font-num | tabular-nums | 12px | 500 | Precios del crosshair/ejes |

*Numeración tabular para que los precios no "rierren" al moverse.*

### Formato de ejes (nuevo)

| Token | Valor | Uso | Requisito |
|-------|-------|-----|-----------|
| price-decimals | `5` | Decimales del eje Y (derecha) | RF-207 |
| axis-price-side | `right` | Lado de la escala de precios | RF-207 (vista de usuario) |
| axis-x-format | `{día} {HH:mm}` | Etiqueta del eje X | RF-206 |
| axis-x-tick | `15m` | Separación entre marcas (según zoom) | RF-206 |
| marker-offset-pips | `10` | Separación de marcas compra/venta | RF-208 |
| pip-value | `0.0001` / `0.01` (JPY) | Valor del pip por par | RF-208 |

### Espaciado (base 8)

| Token | Valor |
|-------|-------|
| space-xs | 4px |
| space-sm | 8px |
| space-md | 16px |
| space-lg | 24px |
| space-xl | 32px |

### Radios y sombras

| Token | Valor |
|-------|-------|
| radius-sm | 4px (inputs/botones) |
| radius-md | 6px (toolbars/paneles/popover) |
| shadow-sm | `0 1px 2px rgba(0,0,0,0.4)` |
| shadow-popover | `0 8px 24px rgba(0,0,0,0.5)` |

## 3. Modo oscuro

Dark-first, modo único (convención de dominio). La arquitectura de tokens permite
añadir `[data-theme="light"]` sin refactor (RF-016), fuera de alcance aquí.

## 4. Iconografía

- Set: **Lucide** (MIT, $0 — RNF-006). 24px grid, stroke 1.75.
- Tamaños: 16px (toolbar), 20px (controles), 24px (CTA primario).
- Se revisan íconos ambiguos para usar los más representativos (RF-211).

## 5. Grid y layout

- App single-window desktop (sin breakpoints móviles, RNF-005).
- **SCR-004/005:** appbar (48px) + **ChartHeader** (40px, indicadores+export) + toolbar de
  herramientas (40px) + canvas flexible (flex-1) + leyenda (28px). **Sin panel inferior** (RF-202).
- Formularios (SCR-002/003): contenido **centrado horizontalmente** (RF-214, RF-218).
- Container: 100% del viewport en el chart; formularios con max-width ~720px centrado.

## 6. Referencias

- ADR-005 (lightweight-charts), ADR-017 (capa de dibujo), ADR-019 (formulario flotante).
- Wireframes ASCII en `_docs/ux/wireframes/` como fuente de verdad.
