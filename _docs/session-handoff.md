# Handoff de Sesión

> Estado con el **ciclo 05 en ejecución** (7/26 tareas) — 2026-10-06
> Punto de continuación exacto: **`/sdd-cycle TASK-UI-410`**

## Dónde estamos

**Ciclo 05 (`mejoras-ux-grafico`) en ejecución.** La planificación está cerrada —`plan.md`,
`requirements.md` (19 requisitos `4xx`), `glossary.md`, `architecture.md` con ADR-027/028/029/030,
9 contratos en `_docs/ux/` y el backlog con 10 épicas, 9 historias y 26 tareas (76 pts)— y el
tablero avanza por la ruta crítica.

| Métrica | Valor |
|---------|-------|
| Tareas cerradas | **7/26** (27 %) |
| Cerradas | `TASK-401`, `TASK-402`, `TASK-UI-402`, `TASK-UI-403`, `TASK-UI-404`\*, `TASK-UI-405`, `TASK-404` |
| Ruta crítica | **5/7 · 24 pts** (`TASK-401` → `TASK-402` → `TASK-UI-403` → `TASK-UI-404` → `TASK-UI-405` ✅) |
| Épicas cerradas | **`EP-UI-401`** (cambio de escala) · `EP-402` (salvo `TASK-405`) · `EP-401` (salvo `TASK-403`) |
| Historias aceptadas | 0/9 (exigen QA `PASS` y `/sdd-track accept`) |
| Commits locales sin empujar | **3** (`29866b4`, `50ceb62`, `6a31718`) |
| Gates | `quality_gate --level gate` = **PASS** · **502/502** tests frontend |

\* `TASK-UI-404` se cerró **sin código**: RF-405 ya estaba cubierto por `TASK-401`/`TASK-UI-403`
(ver **DP-7** en `backlog.md` §10); sus 2 pts pasaron a `TASK-UI-405`.

## Punto exacto de continuación

**`TASK-UI-410`** — *`CMP-025 OperationNumericFields`* (`EP-UI-404`, Should, 5 pts, `frontend`).

**Por qué esta y no el nodo 6:** la FASE 5 toma el primer nodo no ✅ de la ruta crítica, que es
`TASK-TEC-401`, pero sus `Deps` (`TASK-UI-412`, `TASK-UI-414`, `TASK-UI-416`) siguen en 📥. La
primera de ellas, `TASK-UI-412`, exige `TASK-UI-411`, que exige `TASK-UI-410`: esa es la primera
tarea **lista** de la cadena.

Lo que pide el contrato UX (`ux/components.md` §CMP-025, `ux/wireframes/SCR-004`):

1. Popover **anclado a la figura seleccionada** (botón «Precios» o doble clic en la etiqueta de un
   nivel), con dos campos: `Entrada` y `Stop Loss`.
2. `label` **visible** (nunca solo placeholder), `inputMode` decimal y la precisión del activo
   (5 decimales).
3. Validación **inline** con `role="alert"` asociado al campo; `Aplicar` deshabilitado si el valor
   no es numérico o si `Entrada == SL` (`R = 0`).
4. `Tab` pasa de Entrada a SL, `Enter` aplica, `Escape` cancela y **devuelve el foco a la figura**.
5. La mutación pasa por el **command stack** (`Ctrl+Z` la revierte) y se anuncia en `LiveRegion`
   con el mismo formato que las mutaciones del canvas.

Después: `TASK-UI-411` (command stack + `LiveRegion`) → `TASK-UI-412` (tests) → y entonces el nodo 6
(`TASK-TEC-401`) tendrá sus dependencias de UI resueltas; le seguirán `TASK-UI-414` y `TASK-UI-416`
con sus cadenas.

## Decisiones de sesión (D-X)

- **D-1:** los dibujos son del **activo** (compartidos entre timeframes).
- **D-2:** documento **v2 por activo** con migración aditiva al leer.
- **D-3:** se retira Multigráfico (ruta, pantalla, `chart-sync` y props `sync`).
- **D-4:** `Exportar` se evalúa dentro del ciclo, con decisión documentada.
- **D-5:** RNF heredados (60 FPS, 0 regresiones); el cambio de TF se mide sin umbral bloqueante.
- **D-6:** el TF `30 m` se retira del glosario.
- **D-7:** un solo ciclo con MoSCoW (76 pts).
- **D-8:** la deuda de la auditoría `CR-002` queda **fuera** del ciclo (`TECH-305…307`).
- **D-9:** los dos bugs se diagnostican antes de tocar.
- **D-10:** el puntero **`fxtrad.chart.last`** hace recuperable la última selección con su activo
  (**ADR-030**).
- **D-11:** se trabaja **en `master`**, sin ramas por tarea.
- **D-12:** el contrato UX citaba WCAG 2.5.5 (AAA, 44×44); el nivel declarado es **AA** y el
  criterio aplicable es **2.5.8** (≥24×24). Corregido en `components.md` y en SCR-004.
- **D-13 *(ejecución)*:** `TASK-UI-404` se cierra **sin código** al comprobar que RF-405 ya se
  cumple (DP-7); no se escribe código para justificar puntos.

## Preguntas abiertas (PA-X)

- **PA-1:** ¿el aviso de cobertura (`RF-402`) es realmente un falso positivo? Se resuelve en
  `TASK-UI-413`.
- **PA-2:** ¿desaparece el dolor de Multigráfico al arreglar `RF-401`? Comprobar **antes** de
  `TASK-UI-415`.
- **PA-3:** criterio de viabilidad de `Exportar` (`TASK-UI-417`).
- **PA-4 *(resuelta)*:** citas `plan.md` de ADR-022/ADR-025 cualificadas.
- **PA-5:** ¿quién verifica los 12 frentes del insumo (KPI-401) y con qué guion manual?

## Estado técnico

| Aspecto | Valor |
|---------|-------|
| Persistencia | **v2 por activo** (`fxtrad.chart.v2.{symbol}`) + migración desde v1 + puntero `fxtrad.chart.last` |
| Migración | `state/migrate-chart-config.ts` puro: unión deduplicada por `id`, solo lee, nunca borra v1 |
| Selección | `parseChartQuery(params, fallback?)` con precedencia URL > persistido > defecto; `replaceRoute` enriquece sin historial |
| Cambio de escala | `CMP-023` en `ChartHeader` + estados `switching-tf`/`tf-ready`/`tf-error` con **reversión** al TF anterior y anuncio en `LiveRegion` |
| Indicadores | una lista por activo, recalculada por `ChartPane` sobre las velas del TF visible (probado en `TASK-UI-405`) |
| Pendiente de UI | `CMP-024` (menú contextual de vela, `TASK-UI-408`), `CMP-025` (precios numéricos, `TASK-UI-410`), eje en dos filas (`TASK-UI-406`) y la retirada de Multigráfico (`TASK-UI-415`) |
| Backend | intacto (546 tests + 2 skip) — el ciclo es 100 % frontend |
| Frontend | **502 tests** en 57 archivos · typecheck, eslint y prettier en verde |
| Calidad | `_docs/quality-profile.toml` · gate **PASS** (0 incumplidos, 25 waivers) |
| Versionado | `_docs/git-profile.toml` · rama `master` · árbol limpio · **3 commits locales** sin `push` |

## Qué haría yo ahora

1. **`/sdd-cycle TASK-UI-410`** (arriba, «Punto exacto de continuación»).
2. Al cerrar la cadena `TASK-UI-410 → 411 → 412`, el nodo 6 (`TASK-TEC-401`) quedará a un paso;
   sus otras dos dependencias son `TASK-UI-414` (tests de cobertura) y `TASK-UI-416` (limpieza de
   la retirada de Multigráfico).
3. `git push origin master` cuando quieras publicar los 3 commits.

## Avisos

- **`TASK-403` y `TASK-405` siguen en 📥 y fuera de la ruta crítica**: son los tests de aceptación
  de `EP-401` y `EP-402` (v1 mixto con 5 tipos en 3 TF con 0 pérdidas/0 duplicados y rechazo de un
  v3; precedencia de la selección). La FASE 5 los tomará cuando no haya nodo de ruta crítica listo,
  pero **deben estar verdes antes de dar por cerradas esas épicas**.
- La deuda `TECH-305…307` (auditoría `CR-002`, en CHANGES_REQUESTED) sigue **fuera** del ciclo 05.
- `_docs/ux/` de `SCR-005` está marcado como retirado; los de `SCR-006` siguen vigentes hasta la
  evaluación de `TASK-UI-417`.
