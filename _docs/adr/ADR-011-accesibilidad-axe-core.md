# ADR-011: Accesibilidad automatizada con axe-core

- **Fecha:** 2026-09-24
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RNF-005, RNF-006, RNF-007

## Contexto

La SPA debe cumplir WCAG 2.1 **AA** (`_docs/ux/accessibility.md`) con costo $0
(RNF-006). Los artefactos UX exigen verificar la accesibilidad con una
herramienta automatizada (`axe-core`/Lighthouse) e integrarla en CI. La suite
de frontend corre con **Vitest + jsdom**; se necesita una librería que inspeccione
roles, nombres accesibles y estructura sin depender de un navegador real.

## Decisión

Usar **`axe-core`** (MIT, $0) como *devDependency* para escanear el DOM
renderizado en los tests de Vitest:

- Escaneo de **estructura y ARIA** (roles, nombres accesibles, landmarks, labels)
  sobre los componentes renderizados (`axe.run(container)`).
- El **contraste** de color se verifica en `src/styles/contrast.ts` + el test de
  tokens (WCAG AA), porque `axe` no evalúa `color-contrast` en jsdom.
- Lighthouse y la ejecución **en CI** se cablean en TASK-039 (GitHub Actions,
  ADR-008); aquí queda el runner de tests listo para CI.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| `jest-axe` | API cómoda | Acoplado a Jest, no a Vitest | El proyecto usa Vitest |
| Lighthouse CLI | Métricas completas | Requiere navegador (Chrome) en CI; pesado para unit tests | Se difiere a CI (TASK-039) |
| Verificación manual | Cero dependencias | No automatizable ni repetible | No satisface el DoD |

## Consecuencias

### Positivas
- Detección temprana de regresiones de ARIA/roles en cada `npm test`.
- Sin costo y sin infraestructura (RNF-006, RNF-007).

### Negativas / Trade-offs
- En jsdom no cubre contraste ni layout real (se mitiga con el test de tokens y
  con Lighthouse en CI).

## Referencias

- `_docs/ux/accessibility.md` (Pruebas requeridas)
- `_docs/adr/ADR-008-observabilidad-y-cicd.md` (CI)
- TASK-UI-004, `_docs/traceability.md` (RNF-005)
