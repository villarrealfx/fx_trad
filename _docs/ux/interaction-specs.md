# Especificaciones de Interacción — Ciclo 04 (Dibujo Referencia de Operación)

> Estados obligatorios por pantalla: loading, empty, error, success, partial.
> Transiciones globales: 200ms, ease-out; respetar `prefers-reduced-motion`.
> Base: `_docs/iterations/03-mejoras-ux/ux/interaction-specs.md`.
> SCR-001, SCR-002, SCR-003 y SCR-006 **se heredan sin cambios**: este ciclo no las toca.

## SCR-004: Gráfico principal — estados de pantalla (heredados, sin cambios)

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Abrir gráfico | Skeleton de velas; toolbar deshabilitada | Hasta carga |
| empty | Sin datos en rango | Overlay "Sin datos en este periodo" + volver a SCR-003 | persistente |
| error | Fallo de serie | Banner + "Reintentar"; estado del chart y la selección intactos | persistente |
| success | Datos OK | Velas + ejes (X `{día} {HH:mm}`, Y 5 dec. derecha); operación con 5 niveles; 60 FPS | — |
| partial | Gaps legítimos removidos | Velas continuas; aviso de cobertura recortada | — |

> La operación **no introduce estados de carga ni de error propios**: no hay red implicada
> en dibujarla. Todo su ciclo de vida es local al chart.

## SCR-004: ciclo de vida de la herramienta (nuevo en ciclo 04)

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| **inactivo** | Montaje | La herramienta aparece en la paleta; no actívada | — |
| **`pending`** *(1er clic)* | Herramienta activa + clic 1 (Entrada) | **Preview en vivo**: los 5 niveles con color y etiquetas siguen al ratón. Solo render: no seleccionable, no persistido. `Escape` cancela; clic 2 confirma | Hasta el 2º clic |
| **created** | Clic 2 (SL) | Figura fija; `direction` derivada; 5 etiquetas; persistida por activo+timeframe; `LiveRegion` anuncia los valores | 200ms |
| **`zeroRisk`** | `Entrada == SL` | Solo se dibujan SL y Entrada (coincidentes); **se ocultan los 3 TP**; etiqueta indica `R = 0`; `LiveRegion` avisa. No requiere marca persistida | — |
| **preview-cancel** | `Escape` en `pending` | Descarta el trazo en curso; vuelve a `inactivo` | 200ms |

## SCR-004: interacciones de la figura (nuevo en ciclo 04)

| Interacción | Disparador | Comportamiento |
|-------------|------------|----------------|
| Seleccionar | Clic sobre **cualquiera** de las 5 líneas | Selecciona la figura completa (radio por línea `opHitRadius` = 6 px, alineado con `fib`) |
| Ajustar Entrada | Arrastrar handle ● | Recalcula `R`, dirección y los 3 TP manteniendo la proporción (RF-305) |
| Ajustar SL | Arrastrar handle ◆ | Igual; si iguala a la Entrada → `zeroRisk` |
| Restringir eje | `Shift` + arrastre | Heredado del ciclo 03: restringe a H o a V |
| Mover | Arrastrar el cuerpo | Desplaza la figura; conserva la geometría relativa |
| Deshacer / Rehacer | `Ctrl+Z` / `Ctrl+Shift+Z` o botones ↶/↷ | Revierte/reaplica; pasa por el command stack |
| Eliminar | `Delete`/`Supr` con la figura seleccionada | Borra la figura completa y su persistencia |
| Cambiar herramienta | Clic en otra herramienta | `pending` → se cancela; la figura previa se conserva |
| Persistir/restaurar | Cambio de hoja / recarga | La operación vuelve íntegra con sus 5 niveles derivados (ADR-023) |

## SCR-005: Multigráfico (heredado, sin cambios de estados)

Idénticos a SCR-004 por pane (loading, empty, error, success, partial, `pending`,
`zeroRisk`, `selected`), más los propios del multigráfico ya heredados del ciclo 03:

- **loading:** panes en skeleton; "añadir" deshabilitado hasta el primer pane.
- **error:** retry **individual** por pane; los demás siguen operativos.
- **partial:** pane con cobertura reducida → operativo + aviso de cobertura.

La herramienta "Operación" está disponible en la paleta de **cada** pane (RF-310) y cada
uno calcula sus etiquetas con **su propio** mapeo precio→píxel, de modo que la separación
mínima (20 px) se cumple pane a pane.

## Reglas de layout de etiquetas (contrato para `/sdd-implement`)

| Regla | Valor | Origen |
|-------|-------|--------|
| Las 5 etiquetas se dibujan **siempre** | sin excepciones | RNF-301 |
| Orden | por precio, de mayor a menor | D-7 |
| Separación vertical mínima | `opLabelMinGap` = 20 px | RNF-301 |
| Corrección por desbordamiento | si la última se sale por abajo, se reparte desde el final | ADR-025 |
| Línea guía | toda etiqueta desplazada la conecta con su nivel (`opLeaderWidth` = 1 px) | RNF-301 |
| Posición horizontal | a la derecha del **segundo** ancla, con `opLabelOffset` = 4 px | RF-308 |
| Alcance de las líneas | de extremo a extremo del chart | D-2 (para que el precio pueda cruzarlas en cualquier punto, RF-312) |

## Micro-copia (labels visibles en español)

| Elemento | Texto | Origen |
|----------|-------|--------|
| Botón de la herramienta | `◎` + nombre accesible *"Operación: 2 clics (Entrada, SL)"* | D-1 |
| Nombres de nivel | `SL`, `Entrada`, `TP 1.382`, `TP 1.5`, `TP 2` | RF-308, plan.md §1.3 |
| Etiqueta de precio | 5 decimales, `tabular-nums` | RF-308, AXIS_TOKENS |
| Aviso de riesgo nulo | `R = 0` | D-5 |
| Anuncio en `LiveRegion` | `Operación compra. Entrada 1.10000, SL 1.09500, TP 1.382 1.10691, …` | accesibilidad |

## Transiciones globales

Heredadas del ciclo 03, sin cambios:

- Duración estándar 200ms · Easing ease-out.
- Popover: entrada/salida 150ms; sin animación si `prefers-reduced-motion`.
- El preview en vivo **no** se anima (se redibuja por frame); con `prefers-reduced-motion`
  tampoco hay easing, porque no hay interpolación: solo repositionamiento.
- El redibujado del preview usa el mismo batching del overlay (`frame-batch`, ADR-017), para
  no comprometer los 60 FPS de RNF-302 al mover el ratón con la herramienta activa.