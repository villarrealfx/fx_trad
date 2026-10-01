# ADR-023: Ampliación aditiva del esquema de documentos en v1, sin bumpar versión

- **Fecha:** 2026-10-01
- **Estado:** Aceptado (2026-10-01, ciclo 04)
- **Decisores:** Arquitecto, Tech Lead, Usuario (decisión P-301)
- **Requisitos vinculados:** RF-311, RNF-204, KPI-305, R-301
- **ADR relacionados:** ADR-018 (persistencia versionada, política de descarte)

## Contexto

El ciclo 04 añade un `kind` nuevo al modelo de dibujos (`ADR-022`). La decisión de versión
del documento es la pregunta abierta **P-301** del handoff de sesión, y es crítica porque
`RNF-304` y `KPI-305` exigen **no perder ningún dibujo ya persistido**.

El mecanismo real es el siguiente, verificado en el código:

- La persistencia en producción la resuelve `frontend/src/state/chart-config.ts`, **no**
  `drawings.ts`. Las funciones `serializeDrawings`/`deserializeDrawings` de `drawings.ts`
  solo se usan en sus propios tests.
- El documento es `{version, indicators, drawings}`, con `CHART_CONFIG_VERSION = 1`, y la
  **versión forma parte de la clave** de almacenamiento:
  `fxtrad.chart.v1.{symbol}.{timeframe}` (`chart-config.ts:28-30`).
- `deserializeChartConfig` devuelve `null` si `document.version !== CHART_CONFIG_VERSION`
  (`:80`). **No existe función de migración**: al subir la versión, la entrada anterior
  queda huérfana en `localStorage` e inaccesible.
- La política vigente (`ADR-018`) es de **descarte**, y está fijada por test:
  *"descarta documentos de una versión anterior (política ADR-018)"*
  (`chart-config.test.ts:166`).
- El filtro de seguridad es `isOverlayShape` (`drawings.ts:98`): una forma de `kind`
  desconocido se descarta, el resto sobrevive.

La observación decisiva es que **la estructura del documento no cambia** al añadir el `kind`:
sigue siendo `{version, indicators, drawings}`. Solo crece la unión de valores admitidos
dentro de `drawings`. Es decir, un documento v1 escrito antes sigue siendo un documento v1
válido.

## Alternativas consideradas

Se evaluaron tres, planteadas al usuario con su impacto medido:

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| **Aditivo en v1, sin bump** (elegido) | Cero migración; `RNF-304` se cumple sin escribir código nuevo; los documentos v1 existentes siguen válidos; la clave no cambia | El esquema semántico crece sin que el número de versión lo refleje | **Elegido** (P-301, opción a) |
| v2 con migración real v1→v2 | Deja el esquema explícito; abre la puerta a cambios estructurales futuros | Hay que leer la clave `v1` al cargar y reescribir en `v2`; función de migración + sus tests; hay que decidir qué ocurre si el usuario alterna entre un build viejo y uno nuevo | Trabajo añadido sin cambio estructural que justifique el bump |
| v2 con descarte (política actual de `ADR-018`) | Es lo más simple: una constante | **Al desplegar el ciclo 4 el usuario pierde todos sus dibujos**, incluidos línea, rectángulo y fibonacci | Contradice `RNF-304` y `KPI-305` |

## Decisión

Mantener `CHART_CONFIG_VERSION = 1` y **no** cambiar la clave de `localStorage`. La
introducción de `kind: 'operation'` es una ampliación **aditiva**: `DRAWING_KINDS` y
`isOverlayShape` aceptan el nuevo valor, y nada más del documento se toca.

Consecuencias directas:

- Un documento v1 preexistente se sigue leyendo **íntegro**: todas las figuras se validan,
  las antiguas siguen válidas y la nueva se acepta si está presente.
- No hay función de migración que mantener ni testear; la política de descarte de
  `ADR-018` queda **latente** y se reservaría para un cambio realmente estructural.
- Se acepta **degradación elegante hacia atrás**: si un build antiguo (sin la operación)
  lee un documento nuevo, `isOverlayShape` descarta **solo** las operaciones y conserva
  línea, rectángulo, fibonacci y markers. No corrompe el documento ni el resto del estado.

Si en el futuro un cambio sí altera la forma del documento, se bumpará `CHART_CONFIG_VERSION`
y habrá que añadir migración real, leyendo la clave de la versión anterior. Queda anotado
como deuda conocida, no como trabajo de este ciclo.

## Consecuencias

### Positivas
- `RNF-304` y `KPI-305` se satisfacen sin código de migración.
- Sin cambios de clave: nada que reescribir ni que pueda quedar inconsistente.
- La prueba de que el esquema es extensible se hace en el propio sitio, con un round-trip
  mixto (line/rect/fib/marker + operation).

### Negativas / Trade-offs
- El número de versión deja de señalar por sí solo qué tipos de figura soporta un
  documento. Se mitiga con la degradación elegante y con `DRAWING_KINDS` como catálogo
  explícito del cliente.
- La clave no participa en la detección de capacidades; si en el futuro una figura exige
  campos nuevos que no quepan en el modelo actual, el problema se replanteará (o el
  documento pasa a v2 con migración real).

### Neutras
- `drawings.ts` y `state/chart-config.ts` conservan su contrato público.
- Sin cambios en backend, contratos de API ni despliegue.

## Referencias

- `_docs/session-handoff.md` — P-301
- `_docs/requirements.md` — RF-311, RNF-204, KPI-305
- `frontend/src/state/chart-config.ts` — `CHART_CONFIG_VERSION`, `chartConfigKey`,
  `deserializeChartConfig`
- `frontend/src/charting/drawings.ts` — `isOverlayShape`, `DRAWING_KINDS`
- `frontend/src/state/__tests__/chart-config.test.ts:166` — política de descarte vigente
- ADR-018, ADR-022