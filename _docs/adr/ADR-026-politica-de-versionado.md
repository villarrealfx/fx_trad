# ADR-026: Política de control de versiones (perfil `git-profile.toml`)

- **Fecha:** 2026-10-06
- **Estado:** Aceptado
- **Decisores:** Arquitecto · usuario (stakeholder)
- **Requisitos vinculados:** RNF-006 (costo $0, GitHub OSS), RNF-007 (iteración de 2 semanas), ADR-008 (CI/CD)

## Contexto

Los ciclos 01–04 se versionaron con un modelo de facto —trabajo sobre `master` y una rama
`feature/TASK-XXX-<slug>` por tarea cuando el trabajo lo pedía, más `fix/<slug>` para
correcciones— pero **la política nunca se declaró en un artefacto**: vivía solo en la prosa de
`AGENTS.md` y en la práctica del repositorio. La auditoría `CR-001` lo registró como
`WARNING-002`: sin `_docs/git-profile.toml`, el gate 5 de `/sdd-cycle` (commit de la tarea) y la
comprobación de versiones de `/sdd-next` no son verificables, y `AGENTS.md` afirma «se trabaja
en `main`» mientras el repositorio real está en **`master`** con `origin/master` al día.

`/sdd-stack` debe declarar la política en `_docs/git-profile.toml`; este ADR la justifica.

## Decisión

Se adopta el **modelo híbrido con mainline en `master`**, declarado en `_docs/git-profile.toml`:

1. **Rama por defecto `master`** (no `main`), que es la realidad del repositorio y del remoto
   `origin` (`git@github.com:villarrealfx/fx_trad.git`). El perfil es la fuente de verdad
   cuando contradice la prosa: se documenta la divergencia en lugar de renombrar historia
   publicada.
2. **Rama de tarea solo cuando el plan de la FASE 2 lo propone** (estimación L/XL o cambio de
   esquema/migración): `feature/TASK-XXX-<slug>`; correcciones puntuales, `fix/<slug>`.
   El resto se trabaja sobre `master`.
3. **Un commit atómico por tarea cerrada**, con código + tests + artefactos de estado
   (`status.md`, `backlog.md`, `traceability.md`) en el mismo commit y mensaje trazable
   `<type>(TASK-XXX): <resumen>` con trailers `Req:` / `Board:` / `QA:`. `accept` y `reopen`
   commitean su propio acto; los informes de `sdd-qa`/`sdd-audit` no commitean.
4. **Push manual, nunca automático**; al cerrar un ciclo se reportan los commits locales con el
   comando exacto (`git push origin master`). Tag `vX.Y.Z` al liberar.
5. **Prohibiciones** declaradas en el perfil: commitear con un gate en rojo o con cambios ajenos,
   `--force`, amend de commits publicados y commitear secretos.
6. **Sin hooks instalados**; el pipeline real es `.github/workflows/ci.yml` (ADR-008) y su
   réplica local `make ci`. El perfil deja un `pre-commit` como recomendación, no como requisito.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Declarar `main` y renombrar la rama y el remoto | Alinea con la prosa de `AGENTS.md` | Reescribe una rama publicada; rompe clones y enlaces del historial de CI | Coste real sin beneficio técnico; el perfil puede declarar la verdad |
| GitFlow completo (`develop`, `release/*`, `hotfix/*`) | Proceso explícito para releases paralelos | Sobrecarga para un proyecto de un solo mantenedor con iteraciones de 2 semanas (RNF-007) | El híbrido ya funciona y no añade ramas que nadie usa |
| Trunk-based estricto (todo en `main`, sin ramas de tarea) | Máxima simplicidad | Pierde el aislamiento en los cambios de esquema/migración, donde una rama sí aporta | El híbrido mantiene la rama para el caso que la justifica |
| Sin perfil, seguir con la política implícita | Cero trabajo | El gate 5 y `/sdd-next` no pueden verificar nada (CR-001 `WARNING-002`) | Es la deuda que este ADR cierra |

## Consecuencias

### Positivas
- El gate 5 de `/sdd-cycle` y la comprobación «Versiones» de `/sdd-next` pasan a ser verificables.
- Cierra `WARNING-002` de `CR-001` sin tocar el historial ni el remoto.
- La divergencia `master`/«main» queda documentada y deja de ser una trampa para el siguiente ciclo.

### Negativas / Trade-offs
- `AGENTS.md` (convención compartida) sigue diciendo `main`: hay que recordar que manda el perfil.
- El renombrado de rama queda como decisión pendiente y consciente, no resuelta.

### Neutras
- No se añaden dependencias ni procesos: GitHub OSS se mantiene en $0 (RNF-006).
- No hay hooks: la única barrera real sigue siendo CI (ADR-008).

## Referencias

- `_docs/git-profile.toml` — política declarada (fuente de verdad operativa)
- `_docs/reviews/CR-001-proyecto.md` — WARNING-002 (perfil ausente), evidencia `ed7b64c`
- `_docs/architecture.md` §11 — índice de ADRs · `AGENTS.md` (convención SDD)
- `.github/workflows/ci.yml`, `Makefile` (`make ci`) — pipeline y su réplica local
