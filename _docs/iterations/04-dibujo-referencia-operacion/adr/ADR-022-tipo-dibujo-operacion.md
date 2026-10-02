# ADR-022: Tipo de dibujo propio `operation` con niveles y etiquetas derivados

- **Fecha:** 2026-10-01
- **Estado:** Aceptado (2026-10-01, ciclo 04)
- **Decisores:** Arquitecto, Tech Lead
- **Requisitos vinculados:** RF-301, RF-302, RF-303, RF-304, RF-305, RF-306, RF-307, RF-308, RF-311, RNF-301, RNF-302
- **ADR relacionados:** ADR-017 (capa de dibujos), ADR-018 (persistencia), ADR-024 (tokens), ADR-025 (layout de etiquetas)

## Contexto

El insumo describe una herramienta ausente: representar una **operación de trading** con
un precio de entrada, un stop loss y varios objetivos, etiquetados. La plataforma ya tiene
un sistema de dibujos editable (`ADR-017`) con `kind: 'line' | 'rect' | 'fib' | 'marker'`
y el Fibonacci es el más cercano en aspecto: una figura con dos anclas y **varias líneas
horizontales con etiquetas** (razones de fibonacci, color mate y agrupación).

El ciclo 04 fija en D-3 el modelo: dos anclas reales (Entrada y SL), dirección inferida del
orden de los precios, riesgo `R = |Entrada − SL|` y tres objetivos visibles a
`1.382 R`, `1.5 R` y `2 R`, más SL y Entrada — cinco niveles en total. El resultado de la
operación **no se calcula ni se persiste**: se lee visualmente contra esos niveles.

La pregunta es si la operación es un caso particular del Fibonacci —que ya dibuja
múltiples niveles desde dos puntos— o un tipo propio. El riesgo principal (R-305) es
arrastrar al nuevo tipo las propiedades del `fib` que **no** aplican: el color mate y la
agrupación de etiquetas por razones de fibonacci.

## Decisión

Introducir un **tipo de dibujo propio**, `kind: 'operation'`, que **no extiende** el
modelo del Fibonacci ni su tabla `FIB_LEVELS`.

La forma persistida es mínima — `{ id, kind:'operation', from: PriceTimePoint, to: PriceTimePoint }`,
donde `from` es la **Entrada** y `to` el **Stop Loss**—, y todo el resto se **deriva** en
cada proyección:

| Derivado | Regla |
|----------|-------|
| `direction` | `from.price > to.price` → `buy`; `from.price < to.price` → `sell` |
| `risk` (R) | `abs(from.price − to.price)` |
| `entry` | `from.price` |
| `sl` | `to.price` |
| `tp1.382` | `entry ± 1.382 · R` |
| `tp1.5` | `entry ± 1.5 · R` |
| `tp2` | `entry ± 2 · R` |

El signo sigue a la dirección: los TP se sitúan **a favor** del movimiento (por encima de la
entrada si `buy`, por debajo si `sell`), de modo que ambos niveles de riesgo quedan entre la
entrada y el objetivo.

La geometría vive en un **módulo puro nuevo**, `frontend/src/charting/operation-geometry.ts`,
con funciones sin DOM ni canvas: `operationDirection`, `operationRisk`, `operationLevels`
y `operationLevelColors`. `overlay-geometry.projectShape` las usa para emitir las cinco
líneas y sus etiquetas, y `OverlayCanvas` las pinta. La decisión de dirección del ciclo es
automática (D-5); solo el **color** depende de la dirección (ADR-024).

`operation` entra en `DRAWING_KINDS` y en la unión `ResizableShape`, por lo que hereda
gratuitamente handles, mover/redimensionar, `Shift` H/V, hit-testing, command stack de
undo/redo y persistencia (RF-307, RF-311). Es exactamente el requisito 7 del insumo
—reutilizar la funcionalidad existente en lugar de duplicarla—.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| **Tipo propio `operation`** (elegido) | Modelo mínimo (2 anclas); sin arrastrar propiedades del `fib`; testable sin canvas | Un `kind` más en las uniones y en la paleta | **Elegido**: D-3 exige que el 1:1 no sea visible, lo que no cabe en `FIB_LEVELS` |
| Extender `fib` con flags (`visibleLevels`, `reference: 'r-multiple'`) | Un solo tipo de figura multi-línea | `fib` queda con dos Reglas de render excluyentes; las etiquetas de ratio quedarían mezcladas con las de precio; acopla dos conceptos | Reintroduce R-305 y ensucia `projectShape` |
| Componer 5 kinds existentes (`rect` + 4 `line`) | Sin código nuevo | No es una sola figura: 5 objetos, 5 comandos de undo, sin hit-test conjunto, imposible mostrar/ocultar SL y TPs como un todo | No cumple RF-304 (no es una figura) |
| Reutilizar `FIB_LEVELS` (ratios 0, 0.382, 0.5, 1, 1.618…) | Geometría ya resuelta | Las razones de Fibonacci **no** son múltiplos de R; exigiría reinterpretar el array | D-3 descarta explícitamente el fibonacci |

## Consecuencias

### Positivas
- La operación es una sola figura seleccionable y movible, no cinco objetos sueltos (RF-304).
- Derivar los niveles en un módulo puro permite testear dirección, R y niveles sin DOM ni
  canvas (RF-303), y testear el layout de etiquetas por separado (ADR-025).
- `fib` y el resto de herramientas quedan **intactos**, tal como exige el requisito 8 del
  insumo.
- La persistencia no crece: dos puntos por figura (ADR-023).

### Negativas / Trade-offs
- Un `kind` más que mantener: `DRAWING_KINDS`, la unión `OverlayShape`, `ResizableShape`,
  `ChartToolType`, `TOOL_DESCRIPTORS`, la paleta y las ramas de creación y edición.
- Se pierde la reutilización directa de `hitTestFragment` de `fib`: hay que extenderlo
  para que una operación impacte si **cualquiera** de sus cinco líneas entra en el radio.
- El radio de selección se duplica conceptualmente; conviene mantenerlo alineado con el de
  `fib` para que la interacción se sienta homogénea (R-303).

### Neutras
- Sin cambios en backend, contratos de API, Parquet/DuckDB ni despliegue.

## Referencias

- `_docs/plan.md` — D-3, D-5
- `_docs/requirements.md` — RF-301…RF-308, RF-311, RNF-301, RNF-302
- `frontend/src/charting/drawings.ts` (`DRAWING_KINDS`, `OverlayShape`)
- `frontend/src/charting/overlay-geometry.ts` (`projectShape`, `FIB_LEVELS`)
- `frontend/src/charting/drawing-edit.ts` (`ResizableShape`)
- R-305 — ADR-017