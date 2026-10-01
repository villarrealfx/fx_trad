# ADR-017: Capa de dibujos editable con patrón Command

- **Fecha:** 2026-09-29
- **Estado:** Aceptado (2026-09-29, cierre del ciclo 03)
- **Decisores:** Arquitecto, Tech Lead
- **Requisitos vinculados:** RF-209, RF-210, RF-212, RF-213, RNF-202

## Contexto

El ciclo 01 implementó un overlay de dibujos **custom** (`frontend/src/charting/OverlayCanvas.tsx`
+ `overlay-geometry.ts`) sobre `lightweight-charts` (ADR-005), pero los dibujos solo
se pueden **crear y borrar**. El ciclo 03 exige **mover y redimensionar** dibujos ya
colocados (RF-212) y, por decisión de sesión, **deshacer/rehacer** (RF-213). Se
mantiene el requisito de fluidez a 60 FPS (RNF-202) y el costo $0 (RNF-006).

## Decisión

Extender el overlay custom con un **modelo de dibujo normalizado** y geometría con
**hit-testing sobre handles** (mover/redimensionar). Las mutaciones se realizan
mediante un **patrón Command** con pilas de undo/redo, de forma que cada operación
(crear, mover, redimensionar, borrar) sea reversible. Los dibujos se serializan
para su persistencia (ver ADR-018).

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Librería de dibujo con edición nativa | Menos código | No OSS / no encaja con `lightweight-charts` | RNF-006 |
| Migrar a overlay DOM | Interacción/accesibilidad sencillas | Reescritura del overlay; pérdida de rendimiento canvas | R-202, RNF-202 |
| Canvas + hit-testing sin Command (mutación directa) | Más simple | Sin undo/redo; difícil de testear | RF-213 incluido |

## Consecuencias

### Positivas
- Mover/redimensionar y undo/redo sobre la misma base canvas (60 FPS).
- Modelo de dibujo testeable y serializable (base para RI-201).
- Encapsula la lógica nueva en `charting/drawings` sin tocar `lightweight-charts`.

### Negativas / Trade-offs
- Mayor alcance que "solo mover/redimensionar" (R-205); undo/redo entra al ciclo.
- El hit-testing y la gestión de handles requieren pruebas específicas.

### Neutras
- La accesibilidad del canvas sigue siendo asistida (atajos + texto), como en 01-mvp.

## Referencias

- ADR-005 (gráficos con `lightweight-charts` + overlay de dibujos)
- `_docs/iterations/01-mvp/ux/interaction-specs.md` (SCR-004)
- RF-209/210/212/213, RNF-202
