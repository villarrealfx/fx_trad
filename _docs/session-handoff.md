# Handoff de Sesión

> Estado con el **ciclo 05 en ejecución** (4/26 tareas) — 2026-10-06
> Punto de continuación exacto: **`/sdd-cycle TASK-UI-403`**

## Dónde estamos

**Ciclo 05 (`mejoras-ux-grafico`) en ejecución.** La planificación está cerrada —`plan.md`,
`requirements.md` (19 requisitos `4xx`), `glossary.md`, `architecture.md` con ADR-027/028/029/030,
9 contratos en `_docs/ux/` y el backlog con 10 épicas, 9 historias y 26 tareas (76 pts)— y el
tablero está inicializado.

| Métrica | Valor |
|---------|-------|
| Tareas cerradas | **4/26** (15 %) |
| Cerradas | `TASK-401`, `TASK-402`, `TASK-UI-402`, `TASK-404` |
| Ruta crítica | **2/7 · 24 pts** (`TASK-401`, `TASK-402` ✅) |
| Historias aceptadas | 0/9 (exigen QA `PASS` y `/sdd-track accept`) |
| Commits locales sin empujar | **4** (`ef5181e`, `595d1de`, `5d1f721`, `70d98cb`) |
| Gates | `quality_gate --level gate` = **PASS** · 490/490 tests frontend |

## Punto exacto de continuación

**`TASK-UI-403`** — *Integración del selector + estados `switching-tf`/`tf-ready`/`tf-error`*
(`EP-UI-401`, **Must**, 5 pts, capa `frontend`, nodo **3 de 7** de la ruta crítica).
Sus tres dependencias están ✅: `TASK-UI-402`, `TASK-402`, `TASK-404`.

Lo que queda por hacer en esa tarea (del contrato UX, no improvisar):

1. Montar `CMP-023 TimeframeSelector` en `ChartHeader`, **a la izquierda** del botón de Indicadores.
2. Implementar los estados `switching-tf` → `tf-ready` → `tf-error` de `ux/interaction-specs.md`:
   skeleton durante la carga, **los dibujos permanecen** en pantalla y **no se animan** al
   reproyectarse, un fallo del TF destino mantiene el anterior y **no** actualiza la selección.
3. Persistir la selección al cambiar de TF (URL + `selection` del documento v2 + puntero
   `fxtrad.chart.last`, todos ya disponibles) y anunciar el TF en `LiveRegion`.
4. Tests: 1h→15m→1h conserva dibujos y selección, indicadores recalculados, `aria-checked`,
   frame budget con la operación activa y el camino de error.

Después, la ruta crítica sigue por `TASK-UI-404` → `TASK-UI-405` → `TASK-TEC-401` → `TASK-TEC-403`.
Fuera de ruta crítica quedan `TASK-403`, `TASK-405` y las tareas de `TASK-UI-400`…`TASK-UI-417`.

## Decisiones de sesión (D-X)

Las del brainstorm siguen vigentes; se añaden las tomadas al ejecutar.

- **D-1:** los dibujos son del **activo** (compartidos entre timeframes).
- **D-2:** documento **v2 por activo** con migración aditiva al leer.
- **D-3:** se retira Multigráfico (ruta, pantalla, `chart-sync` y props `sync`).
- **D-4:** `Exportar` se evalúa dentro del ciclo, con decisión documentada.
- **D-5:** RNF heredados (60 FPS, 0 regresiones); el cambio de TF se mide sin umbral bloqueante.
- **D-6:** el TF `30 m` se retira del glosario.
- **D-7:** un solo ciclo con MoSCoW (76 pts).
- **D-8:** la deuda de la auditoría `CR-002` queda **fuera** del ciclo (`TECH-305…307`).
- **D-9:** los dos bugs se diagnostican antes de tocar (el aviso de cobertura puede no ser falso
  positivo).
- **D-10 *(ejecución)*:** el puntero **`fxtrad.chart.last`** es la pieza que hace recuperable la
  última selección **con su activo**; el `selection` por activo no bastaba. Formalizado en
  **ADR-030** y descartadas las alternativas (solo activo, última URL, inferir de las claves).
- **D-11 *(ejecución)*:** se trabaja **en `master`**, sin ramas por tarea: el ciclo no propuso
  `feature/*` y `TASK-401→403` forman una cadena de esquema.
- **D-12 *(ejecución)*:** el contrato UX citaba WCAG **2.5.5** (44×44, que es **AAA**); el nivel
  declarado es **AA**, cuyo criterio es **2.5.8** (≥24×24). Corregido en `components.md` y en el
  wireframe de SCR-004; el selector mide ≥44×32 px.

## Preguntas abiertas (PA-X)

- **PA-1:** ¿el aviso de cobertura (`RF-402`) es realmente un falso positivo? Se resuelve en
  `TASK-UI-413`.
- **PA-2:** ¿desaparece el dolor de Multigráfico al arreglar `RF-401`? Comprobar **antes** de
  `TASK-UI-415`.
- **PA-3:** criterio de viabilidad de `Exportar` (`TASK-UI-417`).
- **PA-4 *(resuelta)*:** las citas `plan.md` de ADR-022/ADR-025 se cualificaron al plan archivado
  del ciclo 04 y `architecture.md` §11 documenta la regla.
- **PA-5:** ¿quién verifica los 12 frentes del insumo (KPI-401) y con qué guion manual?

## Estado técnico

| Aspecto | Valor |
|---------|-------|
| Persistencia | **v2 por activo** (`fxtrad.chart.v2.{symbol}`) + migración desde v1 + puntero `fxtrad.chart.last` |
| Migración | `state/migrate-chart-config.ts` puro: unión deduplicada por `id`, solo lee, nunca borra v1 |
| Selección | `parseChartQuery(params, fallback?)` con precedencia URL > persistido > defecto; `replaceRoute` enriquece sin historial |
| Selector de TF | `components/TimeframeSelector` (CMP-023) listo, **aún sin montar** en `ChartHeader` |
| Backend | intacto (546 tests + 2 skip) — el ciclo es 100 % frontend |
| Frontend | 490 tests en 57 archivos · typecheck, eslint y prettier en verde |
| Calidad | `_docs/quality-profile.toml` · gate **PASS** (0 incumplidos, 25 waivers) |
| Versionado | `_docs/git-profile.toml` · rama `master` · árbol limpio · **4 commits locales** sin `push` |

## Qué haría yo ahora

1. **`/sdd-cycle TASK-UI-403`** (arriba, «Punto exacto de continuación»).
2. Tras cerrarla, `TASK-UI-404` (indicadores por TF) y `TASK-UI-405` (tests de la épica) completan
   `EP-UI-401`, que es el corazón del ciclo.
3. `git push origin master` cuando quieras publicar los 4 commits.

## Avisos

- **`TASK-403` y `TASK-405` están fuera de la ruta crítica** y siguen en 📥: son los tests de
  aceptación de `EP-401` y `EP-402` (v1 mixto con 5 tipos en 3 TF, 0 pérdidas/0 duplicados, v3
  rechazado; y la precedencia de la selección). La FASE 5 los tomará cuando no haya nodo de ruta
  crítica listo, así que **no se pierden**: verifícalos antes de dar por cerradas sus épicas.
- La deuda `TECH-305…307` (auditoría `CR-002`, en CHANGES_REQUESTED) sigue **fuera** del ciclo 05.
- `_docs/ux/` de `SCR-005` ya está marcado como retirado; los artefactos de `SCR-006` siguen
  vigentes hasta la evaluación de `TASK-UI-417`.
