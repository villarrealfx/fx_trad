# Especificaciones de Interacción — Ciclo 05 (Mejoras UX del Gráfico y Cierre de Deuda)

> Estados obligatorios por pantalla: loading, empty, error, success, partial.
> Transiciones globales: 200ms, ease-out; respetar `prefers-reduced-motion`.
> Base: `_docs/iterations/04-dibujo-referencia-operacion/ux/interaction-specs.md`.
> SCR-001, SCR-002, SCR-003 y SCR-006 **se heredan sin cambios**. **SCR-005 se retira** (RF-409).

## SCR-004: Gráfico principal — estados de pantalla

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Abrir gráfico | Skeleton de velas; toolbar y **selector de TF** deshabilitados | Hasta carga |
| empty | Sin datos en rango | Overlay "Sin datos en este periodo" + volver a SCR-003 | persistente |
| error | Fallo de serie | Banner + "Reintentar"; estado del chart y la selección intactos | persistente |
| success | Datos OK | Velas + **eje X en dos filas** (fecha / `hh:mm`), Y 5 dec. derecha; operación con 5 niveles; 60 FPS | — |
| partial | **La serie no cubre el rango pedido** | Velas continuas; aviso de cobertura recortada | — |

> **Cambio en `partial` (RF-402):** el aviso se dispara **solo** si el primer/último bucket
> servido deja velas ausentes **dentro** del rango pedido. El desfase por redondeo al bucket del
> TF y los huecos de mercado (fin de semana, feriados) **fuera** del rango no lo disparan.

## SCR-004: cambio de timeframe (nuevo en ciclo 05)

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| **`switching-tf`** | Clic en `CMP-023` con un TF distinto | Se pide la serie del TF destino; **skeleton de velas** y el selector deshabilitado con el TF destino marcado. Los **dibujos permanecen** en pantalla: no dependen de la serie | Hasta carga (típ. < 1 s en caliente) |
| **`tf-ready`** | Serie del TF destino recibida | Velas del nuevo TF; indicadores **recalculados** con esas velas; los dibujos se re-proyectan con el nuevo eje temporal **sin moverse**; `LiveRegion` anuncia *"Timeframe 15 minutos."*; la selección se persiste | 200ms |
| **`tf-error`** | Fallo al cargar el TF destino | Se mantiene el TF anterior y su serie; banner + "Reintentar"; la selección persistida **no** se actualiza | persistente |

- **Reversible y no destructivo:** no pide confirmación; cambiar de TF no borra nada.
- **Un solo TF activo:** el selector es un `radiogroup`; no hay multi-selección.
- **Si no hay rango explícito**, el rango visible se conserva entre TFs; si lo hay, se respeta.

## SCR-004: menú contextual de vela (nuevo en ciclo 05)

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| **`context-open`** | Clic derecho sobre una vela | Panel flotante con `fecha · hora` y OHLC (5 decimales, `font-num`); el foco entra en el panel | 150ms |
| **`repositioned`** | El panel no cabe en el viewport | Se desplaza para quedar completo; **nunca** recorta el dato | — |
| **`context-closing`** | `Escape`, clic fuera o cambio de TF | Se cierra y **el foco vuelve al gráfico** | 150ms |

- **No sustituye** la leyenda inferior `🎯`: la leyenda sigue la posición del cursor; el menú
  **fija** una vela.
- Sin desenfoque de fondo (`backdrop-filter`) para no comprometer los 60 FPS (RNF-403).

## SCR-004: precios numéricos de la operación (nuevo en ciclo 05)

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| **`editing-prices`** | Botón "Precios" con la figura seleccionada, o doble clic en una etiqueta de nivel | Popover anclado a la figura con los campos Entrada y Stop Loss; primer campo enfocado | 150ms |
| **`invalid`** | Valor no numérico, o `Entrada == SL` con `R = 0` | Error **inline** (`role="alert"`) asociado al campo; "Aplicar" deshabilitado | — |
| **`committed`** | `Enter` o "Aplicar" con valores válidos | La figura se recalcula (dirección, `R` y TP derivados); pasa por el command stack (`Ctrl+Z` revierte); `LiveRegion` anuncia los valores | 200ms |
| **`cancelled`** | `Escape`, "Cancelar" o clic fuera | Sin cambios en la figura; el foco vuelve a la figura | 150ms |

## SCR-004: ciclo de vida y edición de la figura (heredado del ciclo 04, sin cambios)

| Estado / interacción | Disparador | Comportamiento |
|----------------------|------------|----------------|
| **`pending`** | Herramienta activa + clic 1 (Entrada) | Preview en vivo de los 5 niveles; solo render; `Escape` cancela |
| **`zeroRisk`** | `Entrada == SL` | Solo SL y Entrada; se ocultan los 3 TP; etiqueta `R = 0`; `LiveRegion` avisa |
| **`selected`** | Clic sobre cualquiera de las 5 líneas | Handles + contorno; `Delete` borra; `Ctrl+Z` deshace |
| Ajustar | Arrastrar handle ● / ◆ | Recalcula `R`, dirección y TP manteniendo la proporción (RF-305) |
| Mover | Arrastrar el cuerpo | Desplaza la figura conservando la geometría relativa |
| Persistir/restaurar | Cambio de hoja, de TF o recarga | La figura vuelve íntegra desde el **documento v2 del activo** (ADR-027) |

> **Cambio de contrato en la persistencia:** ya **no** es "por activo+timeframe". Un dibujo
> pertenece al activo y aparece en todos sus TFs (RF-404).

## SCR-005: Multigráfico — **retirada**

La pantalla se retira en este ciclo (RF-409, ADR-029): no tiene estados vigentes. El histórico está
en `_docs/iterations/04-dibujo-referencia-operacion/ux/interaction-specs.md`.

## Reglas de layout de etiquetas (contrato para `/sdd-implement`, heredado)

| Regla | Valor | Origen |
|-------|-------|--------|
| Las 5 etiquetas se dibujan **siempre** | sin excepciones | RNF-301 |
| Orden | por precio, de mayor a menor | D-7 (04) |
| Separación vertical mínima | `opLabelMinGap` = 20 px | RNF-301 |
| Corrección por desbordamiento | si la última se sale por abajo, se reparte desde el final | ADR-025 |
| Línea guía | toda etiqueta desplazada la conecta con su nivel (`opLeaderWidth` = 1 px) | RNF-301 |
| Posición horizontal | a la derecha del **segundo** ancla, con `opLabelOffset` = 4 px | RF-308 (04) |
| Alcance de las líneas | de extremo a extremo del chart | D-2 (04) |

## Micro-copia (labels visibles en español)

| Elemento | Texto | Origen |
|----------|-------|--------|
| Selector de TF | `1m`, `5m`, `15m`, `1h`, `4h`, `1d` + `aria-label="Timeframe"` | RF-406 |
| Menú contextual | `18-nov-25 · 00:15` · `O`, `H`, `L`, `C` + valor | RF-408 |
| Botón del popover numérico | `Precios` (nombre accesible *"Editar precios de la operación"*) | RF-410 |
| Campos del popover | `Entrada`, `Stop Loss` | RF-410 |
| Acciones del popover | `Aplicar`, `Cancelar` | RF-410 |
| Error inline | `Introduce un número válido` · `La entrada y el SL no pueden coincidir` | RF-410 |
| Anuncio de cambio de TF | `Timeframe 15 minutos.` | RF-403 |
| Aviso de cobertura | `La cobertura disponible es menor al rango solicitado` *(solo cuando es real)* | RF-402 |
| Botón de la herramienta | `◎` + *"Operación: 2 clics (Entrada, SL)"* | D-1 (04) |
| Nombres de nivel | `SL`, `Entrada`, `TP 1.382`, `TP 1.5`, `TP 2` | RF-308 (04) |
| Aviso de riesgo nulo | `R = 0` | D-5 (04) |

## Transiciones globales

Heredadas del ciclo 03, sin cambios: 200ms ease-out; popover 150ms; sin animación con
`prefers-reduced-motion`.

Aplicación a los elementos nuevos:

- **Menú contextual y popover numérico:** entran/salen en **150ms** (misma familia que el popover
  de indicadores); con `prefers-reduced-motion` aparecen y desaparecen sin animación.
- **Cambio de TF:** el skeleton no se anima más allá del latido ya existente; los **dibujos no se
  animan** al re-proyectarse (evita un desplazamiento aparente que sugiera que la figura se movió).
- **Sombra y fondo estáticos** en ambos paneles flotantes: sin `backdrop-filter`, para sostener los
  60 FPS de RNF-403.
