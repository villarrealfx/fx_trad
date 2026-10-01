# ADR-024: Tres tokens de rol para la operación, reutilizando valores del design system

- **Fecha:** 2026-10-01
- **Estado:** Aceptado (2026-10-01, ciclo 04)
- **Decisores:** Arquitecto, Tech Lead
- **Requisitos vinculados:** RF-309, RNF-204, RNF-305
- **ADR relacionados:** ADR-022 (tipo `operation`), ADR-011 (accesibilidad)

## Contexto

La operación necesita distinguir visualmente tres cosas: el **stop loss** (mal), el
**punto de entrada** (neutro) y los **objetivos** (bien). `RNF-204` establece que los
tokens de diseño son la fuente única de color, y el proyecto ya tiene un mecanismo que lo
garantiza: los tokens existen **a la vez** en `frontend/src/styles/tokens.ts` (para el
código) y en `frontend/src/styles/tokens.css` (para el DOM), con un **test de anti-drift**
que falla si divergen. Ese patrón lo introdujo el ciclo 03 (`ADR-018`, RNF-204), así que
no hay que inventar nada: hay que seguirlo.

`RNF-305` añade el criterio cuantitativo de contraste, y `ADR-011` (axe-core) cubre la
accesibilidad. Aquí hay una fricción real que hay que resolver de forma explícita: la
función existente `colorForShape(shape)` (`drawings.ts:40`) devuelve **un solo color por
forma**, y la operación necesita **tres colores en la misma figura**.

## Decisión

Añadir **tres tokens de rol** al design system, en `tokens.ts` **y** `tokens.css`, con
valores **reutilizados** del design system existente —ningún color nuevo ni literal en el
canvas—:

| Token | Valor | Rol |
|-------|-------|-----|
| `drawOpSl` | `#EF5350` | Stop loss |
| `drawOpEntry` | `#E6EDF3` | Entrada |
| `drawOpTp` | `#26A69A` | Objetivos |

`EF5350` y `26A69A` son los rojos y verdes que el design system ya emplea para el sesgo
alcista/bajista, y `E6EDF3` es su blanco de texto principal: la operación se ve familiar sin
introducir una paleta nueva.

El **color por nivel** lo resuelve `operationLevelColors` en `charting/operation-geometry`
(ADR-022), no `colorForShape`. `colorForShape` **mantiene su firma** `(shape: OverlayShape) =>
string` y sigue siendo **total**: su `switch` (`drawings.ts:41`) no tiene `default`, así que
TypeScript exigirá una rama para el `kind` nuevo — se añade `case 'operation'` devolviendo
`drawOpEntry`. Ese color funciona como **acento único** de la figura (contorno de selección,
título en la paleta), no como color de sus líneas. Así una única figura puede pintar cinco
líneas con tres colores sin romper el contrato que el resto de la aplicación y sus tests ya
consumen, y sin dejar un `switch` no exhaustivo bajo `strict`.

### Contraste verificado (medido, no estimado)

Sobre el fondo del gráfico `#0A0C10`, calculado según WCAG 2.1:

| Token | Contraste | Veredicto |
|-------|-----------|-----------|
| `drawOpSl` `#EF5350` | **5.61 : 1** | Supera 4.5:1 |
| `drawOpEntry` `#E6EDF3` | **16.56 : 1** | Supera 4.5:1 |
| `drawOpTp` `#26A69A` | **6.53 : 1** | Supera 4.5:1 |

Los tres superan el mínimo de **4.5:1**, de modo que los valores valen **tanto para las
líneas como para el texto** de las etiquetas, y para el requisito 3:1 de objetos
gráficos. Esto cierra la pregunta abierta **P-304** del handoff de sesión, que estaba
marcada como pendiente de medición.

Observación colateral, **fuera de alcance**: `drawLine` (`#4A6572`) se queda en 3.16:1,
por debajo de 4.5:1. Es un valor preexistente del ciclo 03, ajeno a este ciclo; se anota
como candidata a revisión en un ciclo posterior.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| **3 tokens de rol** (elegido) | Semántica explícita (sl/entry/tp); reutiliza la paleta; verificable con el anti-drift existente | 3 tokens que mantener | **Elegido**: `RNF-204` con el mecanismo ya probado en el ciclo 03 |
| Un token por color físico (`red`/`green`/`white`) | Sin semántica de dominio | Se confunde con otros usos de rojo/verde; `RNF-305` no distingue intención | La semántica es lo que aporta valor al componente |
| Literales `#EF5350` en `OverlayCanvas` | Cero trabajo de tokens | Duplica la fuente de color; el test de anti-drift no lo detecta | Contradice `RNF-204`/`RNF-305` |
| Un solo color para los tres niveles | Máxima simplicidad | El usuario no distingue SL de TP de un vistazo | `RF-309` es explícito en separarlos |
| 5 tokens (uno por nivel, incluido cada TP) | Máximo control | Sobre dimensionado: los tres TP comparten rol y valor | Un token donde el color es idéntico es ruido |

## Consecuencias

### Positivas
- La operación es legible de un vistazo y cumple `RNF-305` con números medidos.
- El test de anti-drift existente cubre los tokens nuevos sin escribir un test nuevo.
- `colorForShape` no cambia de contrato, así que no se rompen los consumidores actuales.
- Sin colores nuevos en el design system: la paleta sigue siendo coherente.

### Negativas / Trade-offs
- Tres tokens más que sincronizar entre `tokens.ts` y `tokens.css` (riesgo R-304,
  mitigado por el anti-drift; ambos ficheros en la misma tarea).
- La lógica de "qué color va con qué nivel" vive en `operation-geometry`, no en el token:
  si algún día un rol cambia de color, basta cambiar el token.
- `colorForShape` devuelve el color de entrada para una operación con tres colores: es un
  color de acento, no el color de la figura. Queda documentado aquí para que nadie lo lea
  como un bug.

### Neutras
- Sin dependencias nuevas.
- Sin cambios en backend ni en despliegue.

## Referencias

- `_docs/session-handoff.md` — P-304 (resuelto por medición)
- `_docs/requirements.md` — RF-309, RNF-204, RNF-305
- `frontend/src/charting/drawings.ts:40` — `colorForShape`
- `frontend/src/charting/operation-geometry.ts` (nuevo) — `operationLevelColors`
- `frontend/src/styles/tokens.ts`, `frontend/src/styles/tokens.css`
- ADR-011, ADR-022