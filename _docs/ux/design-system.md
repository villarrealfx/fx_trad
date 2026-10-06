# Design System — Ciclo 05 (Mejoras UX del Gráfico y Cierre de Deuda)

> Dark-first, minimalista y denso. Base: `_docs/iterations/04-dibujo-referencia-operacion/ux/design-system.md`.
> Este ciclo **no redefine el sistema**: corrige un token (`color-draw-line`), parte el formato del
> eje X en dos filas y reutiliza el resto para los tres componentes nuevos. Todo lo demás se hereda
> sin cambios.
> Contrato técnico: `frontend/src/styles/tokens.ts` + `tokens.css`, con test de anti-drift
> (RNF-204, RNF-305, DRY-044).

## 1. Principios de diseño

Se heredan los cinco del ciclo 04 y se añade uno:

- **Claridad sobre adorno:** nada decorativo sobre el canvas.
- **Datos primero:** velas, precio y tiempo son protagonistas.
- **Consistencia de dominio:** convenciones de trading (eje de precio a la derecha, 5 decimales).
- **Eficiencia de pantalla:** el gráfico usa todo el alto disponible.
- **Un dato, una cifra exacta:** los precios se muestran tal cual se calculan, a 5 decimales.
- **La escala no es un compartimento estanco:** *(nuevo)* el trabajo del usuario (dibujos,
  indicadores, selección) pertenece al **activo**, no al timeframe que esté mirando en ese momento
  (ADR-027, ADR-028).

## 2. Tokens

### Color — base (heredada, con una corrección)

| Token | Valor | Uso | Contraste sobre `#0A0C10` |
|-------|-------|-----|----------------------------|
| color-bg | `#0A0C10` | Fondo app/chart | — |
| color-surface | `#161B22` | Paneles, toolbars, chips, menú contextual | — |
| color-border | `#30363D` | Bordes/separadores | (no texto) |
| color-text | `#E6EDF3` | Texto principal | 16.56:1 ✅ |
| color-text-muted | `#8B949E` | Secundario/nombre de etiqueta | 6.36:1 ✅ |
| color-up | `#26A69A` | Velas alcistas | 6.53:1 ✅ |
| color-down | `#EF5350` | Velas bajistas | 5.61:1 ✅ |
| color-warning | `#C9B458` | Estado parcial | 8:1 ✅ |
| color-focus | `#58A6FF` | Anillo de foco | 7.75:1 ✅ |
| **color-draw-line** | **`#7D8590`** *(era `#4A6572`)* | Línea (mate) | **5.25:1 ✅ AA** (era 3.16:1 ⚠️) |
| color-draw-rect | `#D6C7AE` | Rectángulo (mate) | no textual ✅ |
| color-draw-fib | `#DDB2AC` | Fibonacci (mate) | no textual ✅ |

**Corrección de `color-draw-line` (RNF-405, cierra TECH-302):** el valor anterior `#4A6572` daba
**3.16:1**; se sube a `#7D8590` = **5.25:1** sobre `#0A0C10`. Candidatos medidos:

| Candidato | Contraste | Veredicto |
|-----------|-----------|-----------|
| `#4A6572` (anterior) | 3.16:1 | No AA para texto |
| `#6E7F8D` | 4.74:1 | Cumple, con poco margen |
| **`#7D8590` (elegido)** | **5.25:1** | Cumple con margen y sigue **mate** |
| `#8B949E` = `color-text-muted` | 6.36:1 | Cumple, pero reutiliza un token con otro rol y resta jerarquía |

El elegido mantiene el tono desaturado (sigue siendo la línea más discreta del gráfico) y queda por
debajo de `color-text-muted` (6.36:1), de modo que la jerarquía línea < etiqueta se conserva. **No
se introduce ningún color nuevo**: se ajusta el valor de un token existente.

### Color — operación (heredada del ciclo 04, sin cambios)

| Token | Valor | Uso | Sobre chart `#0A0C10` | Sobre chip `#161B22` |
|-------|-------|-----|----------------------|---------------------|
| `drawOpSl` | `#EF5350` | Línea y etiqueta **SL** | **5.61:1** ✅ AA | **4.96:1** ✅ AA |
| `drawOpEntry` | `#E6EDF3` | Línea y etiqueta **Entrada** | **16.56:1** ✅ AA | **14.64:1** ✅ AA |
| `drawOpTp` | `#26A69A` | Línea y etiqueta de los **3 TP** | **6.53:1** ✅ AA | **5.77:1** ✅ AA |

Los tres TP comparten verde (D-5 heredada) y se distinguen por el nombre de su etiqueta: el color
nunca es el único portador de información.

### Tipografía (heredada, sin cambios)

| Token | Fuente | Tamaño | Peso | Uso |
|-------|--------|--------|------|-----|
| font-h1 | Inter / system-ui | 24px | 700 | Título de pantalla |
| font-h2 | Inter / system-ui | 16px | 600 | Secciones/toolbars |
| font-body | Inter / system-ui | 14px | 400 | Texto general |
| font-small | Inter / system-ui | 12px | 400 | Nombre de etiqueta de nivel, **eje X**, menú contextual |
| font-num | tabular-nums | 12px | 500 | Precio de etiqueta, **OHLC del menú**, campos del popover |

### Formato del eje (modificado en el ciclo 05)

`AXIS_TOKENS` parte el formato en dos filas (RF-407):

| Token | Antes | Ahora | Uso |
|-------|-------|-------|-----|
| `xFormat` | `'{día} {HH:mm}'` | — *(se retira)* | — |
| `xFormatTop` | — | `'{día}'` → `18-nov-25` | Fila superior del eje X |
| `xFormatBottom` | — | `'{HH:mm}'` → `00:15` | Fila inferior del eje X |
| `axisRowGap` | — | `12px` | Separación entre las dos filas |
| `xTick` | `15m` | `15m` | Separación de marcas (sin cambios) |
| `priceDecimals` / `priceSide` | 5 / `right` | sin cambios | Eje Y |

**Impacto de layout:** la franja del eje X pasa de **28 px a ~40 px**. El canvas cede ese alto (no
hay scroll); el layout sigue siendo appbar 48 + ChartHeader 40 + toolbar 40 + canvas flexible +
eje ~40 + leyenda 28.

### Tokens del menú contextual y del popover (nuevos componentes, sin tokens nuevos)

| Necesidad | Token reutilizado |
|-----------|-------------------|
| Fondo del panel | `color-surface` `#161B22` |
| Borde | `color-border` `#30363D` (aquí sí aporta: delimita un panel flotante sobre el canvas) |
| Sombra | `shadow-popover` `0 8px 24px rgba(0,0,0,0.5)` |
| Radio | `radius-md` 6px |
| Separaciones internas | `space-sm` 8px · `space-xs` 4px |
| Texto | `font-small` (etiquetas) + `font-num` (cifras OHLC y campos) |
| Foco | `color-focus` `#58A6FF` (anillo de 2px) |

### Formato de la operación (heredado del ciclo 04, sin cambios)

`opLabelMinGap` 20px · `opLabelOffset` 4px · `opLabelPadX` 4px · `opLabelPadY` 2px ·
`opLabelRadius` 4px · `opHitRadius` 6px · `opLeaderWidth` 1px · `opTPMultipliers` `[1.382, 1.5, 2]`.

### Espaciado (base 8, heredado)

`space-xs` 4px · `space-sm` 8px · `space-md` 16px · `space-lg` 24px · `space-xl` 32px.

### Radios y sombras (heredados, sin cambios)

`radius-sm` 4px (inputs/botones/chips) · `radius-md` 6px (toolbars/paneles/popover/menú) ·
`shadow-sm` `0 1px 2px rgba(0,0,0,0.4)` · `shadow-popover` `0 8px 24px rgba(0,0,0,0.5)`.

## 3. Modo oscuro

Dark único, heredado. La arquitectura de tokens permite `[data-theme="light"]` sin refactor, fuera
de alcance.

## 4. Iconografía

- Set: **Lucide** (MIT, $0 — RNF-006). Grid 24px, stroke 1.75. Heredado.
- La paleta de `DrawTool` no cambia: `✏️` línea, `▭` rectángulo, `Φ` Fibonacci, `◎` operación,
  `▲` compra, `▼` venta, `🗑` borrar.
- **Nuevo:** el botón «Precios» del popover numérico usa el glifo de edición (`✎`) ya presente en
  la app; el menú contextual **no lleva icono** (es texto tabulado OHLC).

## 5. Grid y layout

Sin cambios en el grid. El ciclo 05 ajusta una franja: la del **eje X** (28 → ~40 px) por las dos
filas de `RF-407`. Ni el selector de TF ni el menú contextual ocupan espacio de layout: el primero
vive en `ChartHeader`, el segundo flota sobre el canvas.

## 6. Contrato visual del menú contextual (nuevo)

```
┌──────────────────────────────┐   ← fondo color-surface, radius-md, shadow-popover,
│ 18-nov-25 · 00:15            │     padding 8px (space-sm)
│ O 1.10000    H 1.10300       │   ← font-num tabular, color-text
│ L 1.09850    C 1.10120       │
└──────────────────────────────┘
```

- Cabecera con **fecha y hora juntas** y separador `·`: es la identidad de la vela.
- Las cuatro cifras en **dos columnas** (O/H y L/C) para que el panel no crezca en alto.
- Sin borde grueso ni fondo translúcido: el desenfoque sobre un canvas animado cuesta frames
  (RNF-403).

## 7. Deuda visual registrada

- ~~`color-draw-line` en 3.16:1~~ → **resuelta en el ciclo 05** con `#7D8590` (5.25:1, RNF-405).
- ~~Sin entrada numérica de Entrada/SL~~ → **resuelta en el ciclo 05** con `CMP-025` (RF-410).
- **Sin panel visual de resumen de la operación:** los valores siguen saliendo por `LiveRegion` y
  por las etiquetas del canvas. Sigue fuera de alcance (ningún RF lo pide).
- **La pantalla Multigráfico** no es deuda: se retira (RF-409, ADR-029).

## 8. Referencias

- `_docs/adr/ADR-027` (documento v2), `ADR-028` (selección persistida), `ADR-029` (retirada de
  Multigráfico), `ADR-024`/`ADR-025`/`ADR-022`/`ADR-018` (heredados), `ADR-005`/`ADR-011`/`ADR-017`.
- Wireframes ASCII en `_docs/ux/wireframes/`.
- Token de entrada en código: `frontend/src/styles/tokens.ts` + `tokens.css` (anti-drift).
