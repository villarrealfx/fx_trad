# Design System

> Dark-first, minimalista y denso (plan §3.1 IN#15: "interfaz gráfica minimalista pero eficiente").
> Sistema visual del dominio de trading: alto contraste de velas contra fondo oscuro.

## 1. Principios de diseño

- **Claridad sobre adorno:** cada pixel compite con el gráfico; nada decorativo encima del canvas.
- **Datos primero:** velas, precio y tiempo son el protagonista; la chroma global es sobria.
- **Consistencia de dominio:** color-up/down, ejes UTC y leyendas siguen la convención de apps de trading (TradingView, Binance) para cero fricción cognitiva.
- **Eficiencia de pantalla:** toolbars compactas y destinadas (densidad alta), acciones frecuentes en 1 clic de distancia.

## 2. Tokens

### Color

| Token | Valor (hex) | Uso | Contraste verificado |
|-------|-------------|-----|----------------------|
| color-bg | `#0A0C10` | Fondo de la app / chart | — |
| color-surface | `#161B22` | Paneles, toolbars, filas | text sobre surface ≈ 14.6:1 ✅ |
| color-border | `#30363D` | Bordes y separadores | (no texto significante) |
| color-text | `#E6EDF3` | Texto principal | ≈ 16.6:1 sobre bg ✅ |
| color-text-muted | `#8B949E` | Secundario, helper, leyendas | ≈ 6.4:1 sobre bg ✅ |
| color-up | `#26A69A` | Velas alcistas, accent (CTA) | ≈ 6.6:1 sobre bg ✅ |
| color-down | `#EF5350` | Velas bajistas, errores | ≈ 5.6:1 sobre bg ✅ |
| color-warning | `#C9B458` | Estado parcial / pendiente | ≈ 8:1 sobre bg ✅ |
| color-focus | `#58A6FF` | Anillo de foco visible | ≈ 7.5:1 sobre bg ✅ |

*Ratios calculados contra `color-bg`; verificación final con axe/Lighthouse en CI (accessibility.md).*

### Tipografía

| Token | Fuente | Tamaño | Peso | Uso |
|-------|--------|--------|------|-----|
| font-h1 | Inter / system-ui | 24px | 700 | Título de pantalla (appbar) |
| font-h2 | Inter / system-ui | 16px | 600 | Secciones y toolbars |
| font-body | Inter / system-ui | 14px | 400 | Texto general y controles |
| font-small | Inter / system-ui | 12px | 400 | Helpers, captions, leyenda |
| font-num | tabular-nums (system) | 12px | 500 | Precios OHLC del crosshair/leyenda |

*Justificación: numeración tabular evita que los precios "rieguen" al cambiar en vivo; 14px base en app de densidad alta (convención desktop trading).*

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
| radius-sm | 4px (inputs, botones) |
| radius-md | 6px (toolbars, paneles) |
| shadow-sm | 0 1px 2px rgba(0,0,0,0.4) |
| shadow-modal | 0 12px 32px rgba(0,0,0,0.6) |

*radius 4/6 mínimo por minimalismo (IN#15); sombras sutiles para profundidad en dark.*

## 3. Modo oscuro (único en MVP)

- Dark-first es el modo por defecto y único del MVP (convención de dominio, justificada en proposal).
- No se define palette light en esta iteración; la arquitectura de tokens (variables) permite añadir `[data-theme="light"]` sin refactor (RF-016).

| Rol | Dark (único) |
|-----|--------------|
| bg | `#0A0C10` |
| surface | `#161B22` |
| up | `#26A69A` |
| down | `#EF5350` |

## 4. Iconografía

- **Set:** Lucide (MIT, costo $0, RNF-006) — 24px grid, stroke 1.75.
- **Tamaños:** 16px en toolbar compacta, 20px en controles, 24px en CTA primario.
- Acciones de herramienta (línea, rect, fib, compra, venta): ícono + tooltip; la leyenda en máx 4 caracteres si el espacio lo permite.

## 5. Grid y layout

- **Modelo:** app de trabajo single-window; no hay breakpoints móviles (RNF-005: desktop moderno).
- **Pantalla chart (SCR-004/005):** appbar (48px) + toolbar herramientas (40px) + toolbar indicadores (36px) + canvas flexible (flex-1) + leyenda fija (28px).
- **Container:** 100% del viewport (sin max-width); densidad al máximo para área de chart.
- **Formularios (SCR-002/003):** layout en columnas de 2, 12-col grid, form max-w 720px.

## 6. Referencias

- ADR-005 (lightweight-charts v4) define la estética base de velas y ejes.
- Convención visual de oscuridad heredada de TradingView/Binance como referencia de dominio.
- Sin Figma aún; los wireframes ASCII (`_docs/ux/wireframes/`) son la fuente para el diseñador.