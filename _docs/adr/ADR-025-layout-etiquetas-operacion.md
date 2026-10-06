# ADR-025: Etiquetas de nivel siempre visibles, con separación mínima y línea guía

- **Fecha:** 2026-10-01
- **Estado:** Aceptado (2026-10-01, ciclo 04)
- **Decisores:** Arquitecto, Tech Lead
- **Requisitos vinculados:** RF-308, RF-309, RNF-301
- **ADR relacionados:** ADR-022 (tipo `operation`), ADR-024 (tokens de color)

## Contexto

La operación muestra cinco etiquetas a la derecha de cada línea: SL, Entrada, TP 1.382,
TP 1.5 y TP 2 (D-4: etiqueta visible con el nombre del nivel y su precio a 5 decimales).
`RNF-301` es categórico: las **cinco etiquetas deben verse siempre, sin solaparse**.

El problema es que el espacio vertical disponible depende del zoom, y el caso peor del
proyecto es el que motivó la decisión D-7: con un rango de 2 años y vista completa, la
distancia entre dos niveles consecutivos puede caer a ~14 px, mientras que una línea de
texto con su fondo necesita más de 20 px. Si se dibuja cada etiqueta en la `y` real de su
línea, **las etiquetas se solapan y las de los niveles intermedios se vuelven ilegibles**
—que es justo lo contrario de lo que busca una herramienta de análisis.

Las alternativas obvias son insuficientes: subir el módulo de precio para dar más espacio
(rompe la lectura contra la línea y deforma el gráfico), o dejar que las etiquetas se
crucen (incumple `RNF-301`).

La decisión D-5 ya ответa a por qué las etiquetas son cinco y no seis: el 1:1 permanece
oculto porque no aporta información. Si se dibujara, el conflicto de espacio sería peor.

## Decisión

Las etiquetas se colocan a la derecha, en **capa separada de las líneas**, y se reparten
con un algoritmo propio de **separación mínima**:

1. Cada nivel empieza en la `y` proyectada de su línea.
2. Se recorren de arriba abajo (en `y` creciente) y se empuja cada etiqueta hacia abajo lo
   necesario para mantener una separación mínima con la anterior.
3. Si la última etiqueta se sale por abajo, el reparto se corrige hacia arriba desde el
   final; así los cinco niveles se mantienen dentro del área visible.
4. Toda etiqueta cuya posición **haya cambiado respecto a su línea** dibuja una **línea
   guía** fina que la conecta con su nivel, de modo que la asociación
   etiqueta ↔ nivel nunca es ambigua.

La implementación vive en `layoutOperationLabels`, dentro de
`charting/operation-geometry.ts` (ADR-022): **función pura** que recibe los niveles
proyectados, el mapeo `y ↔ precio` y la separación mínima en píxeles, y devuelve para cada
nivel su posición final y si necesita línea guía. No toca el DOM ni el canvas, así que el
caso del zoom extremo se puede comprobar con un test unitario en lugar de a ojo.

Las etiquetas llevan fondo para mantener la legibilidad sobre las líneas, y su texto es
`nombre + precio a 5 decimales`. La precisión de 5 decimales no se codifica a mano: sale de
`AXIS_TOKENS.priceDecimals` a través de `PRICE_FORMAT` (`axis-format.ts:25`), que es el
mismo valor que usa el eje Y, de modo que etiqueta y eje no pueden divergir. El color se
toma de `COLOR_TEXT` (`components/ChartPane/theme.ts`, reexport de los tokens). **No se
introduce ningún valor tipográfico ni cromático nuevo.**

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| **Separación mínima + línea guía** (elegido) | Las 5 etiquetas siempre visibles y legibles (`RNF-301`); la asociación con su nivel nunca se pierde | Desplaza la etiqueta respecto a la línea; requiere línea guía | **Elegido** |
| Dibujar en la `y` real sin ajuste | Simple; sin línea guía | A ~1,2 px/pip las etiquetas se solapan y las centrales son ilegibles | Incumple `RNF-301` |
| Ocultar etiquetas que no caben | Degradación simple | Se pierde información exactamente cuando más falta hace | `RNF-301` exige las cinco **siempre** |
| Colocar las etiquetas fuera del gráfico, en un panel lateral | Sin colisión por construcción | Obliga a cambiar la lectura visual y duplica la vista; `RX-301` | Peor alcance; no pedido en el insumo |
| Agrupar las etiquetas en bloques (TP juntos) | Menos separaciones | Mezcla niveles que el usuario quiere distinguir por separado | No aporta sobre el algoritmo de separación |
| Mostrar solo nombre o solo precio | Más compacto | Se pierde información de ambas | `RF-308` exige nombre **y** precio |

## Consecuencias

### Positivas
- `RNF-301` se cumple por construcción, no por suerte del zoom.
- La función pura hace testeable el caso límite: un test con niveles a ~14 px verifica
  que no hay solape y que toda etiqueta desplazada lleva su guía.
- Funciona igual en Gráfico y Multigráfico: cada `ChartPane` proyecta con su propio
  mapeo de precios (RF-310).
- Cero dependencias (cumple `RX-301`); son unas 40 líneas de código y sus tests.

### Negativas / Trade-offs
- En rangos estrechos las etiquetas quedan claramente separadas de sus líneas; la línea
  guía es lo que sostiene la lectura. Si esa guía se percibe intrusiva, habría que
  reconsiderarla, y sería un cambio local dentro de una función pura.
- Hay que elegir un valor de separación mínima; se toma como referencia el alto de una
  línea de etiqueta (≈20 px), por encima de los ~14 px que separan dos niveles en el zoom
  extremo de D-7.
- La corrección desde el final complica el algoritmo frente a un reparto simple; está
  justificado porque sin ella las etiquetas inferiores se saldrían del área visible.

### Neutras
- Sin cambios en backend, persistencia ni despliegue.
- No afecta a las etiquetas de precio del eje: `axis-format.ts` y el eje Y no cambian.

## Referencias

- `_docs/iterations/04-dibujo-referencia-operacion/plan.md` — D-4, D-5, D-7 (decisiones del ciclo 04)
- `_docs/requirements.md` — RF-308, RF-309, RNF-301
- `frontend/src/charting/operation-geometry.ts` (nuevo) — `layoutOperationLabels`
- `frontend/src/charting/overlay-geometry.ts` — `projectShape`, mapeo de precio a `y`
- `frontend/src/charting/OverlayCanvas.tsx` — render de líneas y etiquetas
- R-302 — ADR-022