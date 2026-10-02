# Design System — Ciclo 04 (Dibujo Referencia de Operación)

> Dark-first, minimalista y denso. Base: `_docs/iterations/03-mejoras-ux/ux/design-system.md`
> y `_docs/iterations/01-mvp/ux/design-system.md`.
> Este ciclo **no redefine el sistema**: añade 6 tokens y fija el contrato visual de las
> etiquetas de la operación. Todo lo demás se hereda sin cambios.
> Contrato técnico: `frontend/src/styles/tokens.ts` + `tokens.css`, con test de anti-drift
> (RNF-204, RNF-305, DRY-044).

## 1. Principios de diseño

Se heredan los cuatro del ciclo 03 y se añade uno:

- **Claridad sobre adorno:** nada decorativo sobre el canvas.
- **Datos primero:** velas, precio y tiempo son protagonistas.
- **Consistencia de dominio:** convenciones de trading (eje de precio a la derecha, 5 decimales).
- **Eficiencia de pantalla:** el gráfico usa todo el alto disponible.
- **Un dato, una cifra exacta:** *(nuevo)* los precios se muestran tal cual se calculan,
  a 5 decimales, sin redondeo ni abreviación. En una herramienta cuyo contenido son
  números, redondear es mentir.

## 2. Tokens

### Color — base (heredada, sin cambios)

| Token | Valor | Uso | Contraste sobre `#0A0C10` |
|-------|-------|-----|----------------------------|
| color-bg | `#0A0C10` | Fondo app/chart | — |
| color-surface | `#161B22` | Paneles, toolbars, chips | — |
| color-border | `#30363D` | Bordes/separadores | (no texto) |
| color-text | `#E6EDF3` | Texto principal | 16.56:1 ✅ |
| color-text-muted | `#8B949E` | Secundario/nombre de etiqueta | 6.36:1 ✅ |
| color-up | `#26A69A` | Velas alcistas | 6.53:1 ✅ |
| color-down | `#EF5350` | Velas bajistas | 5.61:1 ✅ |
| color-warning | `#C9B458` | Estado parcial | 8:1 ✅ |
| color-focus | `#58A6FF` | Anillo de foco | 7.5:1 ✅ |
| color-draw-line | `#4A6572` | Línea (mate) | 3.16:1 ⚠️ no AA (preexistente, ver §7) |
| color-draw-rect | `#D6C7AE` | Rectángulo (mate) | no textual ✅ |
| color-draw-fib | `#DDB2AC` | Fibonacci (mate) | no textual ✅ |

### Color — operación (nuevo en ciclo 04)

| Token | Valor | Uso | Sobre chart `#0A0C10` | Sobre chip `#161B22` |
|-------|-------|-----|----------------------|---------------------|
| `drawOpSl` | `#EF5350` | Línea y etiqueta **SL** | **5.61:1** ✅ AA | **4.96:1** ✅ AA |
| `drawOpEntry` | `#E6EDF3` | Línea y etiqueta **Entrada** | **16.56:1** ✅ AA | **14.64:1** ✅ AA |
| `drawOpTp` | `#26A69A` | Línea y etiqueta de los **3 TP** | **6.53:1** ✅ AA | **5.77:1** ✅ AA |

**Justificación de los valores:** no se introduce **ningún color nuevo**. Los tres son
palabras ya existentes del design system: `#EF5350` es `color-down` (el rojo de
invalidación ya es dominio), `#26A69A` es `color-up` y `#E6EDF3` es `color-text`. La
operación se ve familiar porque habla el mismo idioma visual que el resto de la app.

**Se midió el contraste sobre los dos fondos reales**, no solo sobre el chart: el texto de
las etiquetas vive sobre el chip `color-surface`, no sobre el fondo del gráfico. Los cuatro
colores dan AA en ambos.

**Los tres TP comparten verde** (D-5, RF-309) y se distinguen por el nombre de su etiqueta.
Por eso el color nunca es el único portador de información.

**Rol y exclusividad:** `RF-209` (paleta mate por tipo) queda **extendido, no sustituido**:
la operación usa colores **semánticos** porque SL/Entrada/TP tienen significado de dominio,
mientras que línea/rectángulo/Fibonacci siguen mate. Ambas paletas conviven en la misma barra.

### Tipografía (heredada, sin cambios)

| Token | Fuente | Tamaño | Peso | Uso |
|-------|--------|--------|------|-----|
| font-h1 | Inter / system-ui | 24px | 700 | Título de pantalla |
| font-h2 | Inter / system-ui | 16px | 600 | Secciones/toolbars |
| font-body | Inter / system-ui | 14px | 400 | Texto general |
| font-small | Inter / system-ui | 12px | 400 | **Nombre de etiqueta de nivel** |
| font-num | tabular-nums | 12px | 500 | **Precio de etiqueta de nivel** |

Las etiquetas usan `font-small` + `font-num`: 12px con numeración tabular, la misma
combinación que los precios del crosshair y los ejes, para que las cifras no "rierren" al
arrastrar un handle.

### Formato de la operación (nuevo en ciclo 04)

| Token | Valor | Uso | Justificación |
|-------|-------|-----|---------------|
| `opLabelMinGap` | `20px` | Separación vertical mínima entre etiquetas | ≈ alto de una línea de etiqueta. En el zoom de 2 años los niveles caen a ~14 px (RNF-301, D-7 de `plan.md`) |
| `opLabelOffset` | `4px` | Separación chip↔borde derecho | Coherente con `space-xs` |
| `opLabelPadX` | `4px` | Padding horizontal del chip | Coherente con `space-xs` |
| `opLabelPadY` | `2px` | Padding vertical del chip | El chip debe ser compacto para no forzar separaciones mayores |
| `opLabelRadius` | `4px` | Radio del chip | `radius-sm` heredado |
| `opHitRadius` | `6px` | Radio de hit-test **por línea** | Alineado con el de `fib` para que la interacción se sienta homogénea (R-303, RF-306) |
| `opLeaderWidth` | `1px` | Grosor de la línea guía | Discreta; no debe competir con los datos |
| `opTPMultipliers` | `[1.382, 1.5, 2]` | Multiplicadores de TP | Fija en este ciclo (S-6); el 1:1 **no** se dibuja (D-3, RF-304) |

### Espaciado (base 8, heredado)

| Token | Valor |
|-------|-------|
| space-xs | 4px |
| space-sm | 8px |
| space-md | 16px |
| space-lg | 24px |
| space-xl | 32px |

### Radios y sombras (heredados, sin cambios)

| Token | Valor |
|-------|-------|
| radius-sm | 4px (inputs/botones/**chips de etiqueta**) |
| radius-md | 6px (toolbars/paneles/popover) |
| shadow-sm | `0 1px 2px rgba(0,0,0,0.4)` |
| shadow-popover | `0 8px 24px rgba(0,0,0,0.5)` |

**El chip de etiqueta no lleva sombra.** Encima de un canvas el sombreado añade ruido; el
fondo opaco `color-surface` ya lo separa del gráfico.

### Contrato visual del chip de etiqueta

```
┌─────────────────────────┐   ← fondo color-surface #161B22 (opaco), radius-sm 4px,
│ TP 1.382    1.10691    │     padding 2px 4px, SIN borde
└─────────────────────────┘
   ↑ font-small      ↑ font-num
   color-text-muted  color del nivel (drawOpTp aquí)
```

- **Una sola línea** (D-3): en el peor caso de zoom, dos líneas obligarían a separar ~28 px
  y empeorarían el problema que RNF-301 viene a resolver.
- El **nombre va en `text-muted`** y el **precio en el color del nivel**: la jerarquía pone
  el dato en la cifra, y el color permite emparejar etiqueta↔línea sin leer la guía.
- Sin borde: `#30363D` da solo 1.42:1 sobre `surface` y no aporta separación perceptible.

## 3. Modo oscuro

Dark único, heredado. La arquitectura de tokens permite `[data-theme="light"]` sin refactor,
fuera de alcance.

## 4. Iconografía

- Set: **Lucide** (MIT, $0 — RNF-006). Grid 24px, stroke 1.75. Heredado.
- La paleta de `DrawTool` usa glifos geométricos, no componentes: `✏️` línea, `▭`
  rectángulo, `Φ` Fibonacci, `◎` **operación** (nuevo), `▲` compra, `▼` venta, `🗑` borrar.
- **Justificación de `◎`:** los tres niveles de riesgo se leen mejor con un glifo de
  concentricidad que con flechas, que ya están ocupadas por compra/venta. Es `aria-hidden`;
  el nombre accesible es "Operación: 2 clics (Entrada, SL)".

## 5. Grid y layout

Sin cambios. App single-window desktop (RNF-005): appbar 48px + ChartHeader 40px + toolbar
40px + canvas flexible + leyenda 28px. La operación **no ocupa espacio de layout**: vive
dentro del canvas.

## 6. Referencias

- ADR-024 (tokens de la operación), ADR-025 (layout de etiquetas), ADR-022 (`kind` propio),
  ADR-023 (persistencia aditiva), ADR-005/ADR-011/ADR-017.
- Wireframes ASCII en `_docs/ux/wireframes/`.
- Token de entrada en código: `frontend/src/styles/tokens.ts` + `tokens.css` (anti-drift).

## 7. Deuda visual registrada

- `color-draw-line` (`#4A6572`) queda en **3.16:1**, por debajo de 4.5:1. Es **preexistente
  del ciclo 03** y no textual (se distingue por forma), así que no bloquea este ciclo. Se
  registra aquí para que no se pierda y se revise cuando toque.
- **Brecha de entrada numérica:** a zoom de 2 años (1,2 px/pip) no se puede colocar el SL
  con precisión de pip usando solo el ratón. Documentada en `user-journeys.md` §Brechas;
  requiere requisitos nuevos.