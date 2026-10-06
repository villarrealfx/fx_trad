# Handoff de Sesión

> Estado con el **ciclo 05 en ejecución** (16/26 tareas) — 2026-10-06
> **Ruta crítica completa (7/7).** Punto de continuación exacto: **`/sdd-cycle TASK-405`**

## Dónde estamos

**Ciclo 05 (`mejoras-ux-grafico`) con la ruta crítica cerrada.** La planificación está cerrada
—`plan.md`, `requirements.md` (19 requisitos `4xx`), `glossary.md`, `architecture.md` con
ADR-027/028/029/030, 9 contratos en `_docs/ux/` y el backlog con 10 épicas, 9 historias y 26 tareas
(76 pts)— y el tablero avanza por las tareas fuera de ruta crítica.

| Métrica | Valor |
|---------|-------|
| Tareas cerradas | **16/26** (62 %) |
| Cerradas | `TASK-401`, `TASK-402`, `TASK-UI-402`, `TASK-UI-403`, `TASK-UI-404`\*, `TASK-UI-405`, `TASK-404`, `TASK-UI-410`, `TASK-UI-411`, `TASK-UI-412`, `TASK-UI-413`, `TASK-UI-414`, `TASK-UI-415`, `TASK-UI-416`, `TASK-TEC-401`, `TASK-TEC-403` |
| Ruta crítica | **7/7 · 26 pts — completa** |
| Épicas cerradas | `EP-UI-401`, `EP-UI-404`, `EP-UI-405` y la retirada de `EP-UI-406` |
| Historias aceptadas | 0/9 (exigen QA `PASS` y `/sdd-track accept`) |
| Commits locales sin empujar | **1** (el cierre de `TASK-TEC-403`); los 7 anteriores ya están en `origin/master` |
| Gates | `quality_gate --level gate` = **PASS** · backend **546/546 + 2 skip** · frontend **549/549** en 58 archivos |

\* `TASK-UI-404` se cerró **sin código** (RF-405 ya estaba cubierto, DP-7); sus 2 pts pasaron a
`TASK-UI-405`.

## Punto exacto de continuación

**`TASK-405`** — *Tests de precedencia y de ida y vuelta* (`EP-402`, **Must**, 2 pts, `test`,
deps `TASK-404` ✅). Fuera de ruta crítica: FASE 5 la elige antes que `TASK-403` por el criterio
determinista (ambas `Must`; menor estimación: 2 < 3).

Después:
- `TASK-403` (tests de migración y de contrato v2, Must, 3) — la otra `Must` ya lista.
- `TASK-UI-400` (tokens del eje, Should, 2) y su cadena `TASK-UI-401`/`TASK-UI-406`/`TASK-UI-407`.
- `TASK-UI-408` → `TASK-UI-409` → **`TASK-TEC-402`** (accesibilidad, Must; hoy bloqueada por
  `TASK-UI-409`).
- `TASK-UI-417` (evaluación de `Exportar`, Could, 2).

## Decisiones de sesión (D-X)

- **D-1:** los dibujos son del **activo** (compartidos entre timeframes).
- **D-2:** documento **v2 por activo** con migración aditiva al leer.
- **D-3:** se retira Multigráfico (ruta, pantalla, `chart-sync` y props `sync`).
- **D-4:** `Exportar` se evalúa dentro del ciclo, con decisión documentada.
- **D-5:** RNF heredados (60 FPS, 0 regresiones); el cambio de TF se mide **sin umbral bloqueante**.
- **D-6:** el TF `30 m` se retira del glosario.
- **D-7:** un solo ciclo con MoSCoW (76 pts).
- **D-8:** la deuda de la auditoría `CR-002` queda **fuera** del ciclo (`TECH-305…307`).
- **D-9:** los dos bugs se diagnostican antes de tocar.
- **D-10:** el puntero **`fxtrad.chart.last`** hace recuperable la última selección con su activo
  (**ADR-030**).
- **D-11:** se trabaja **en `master`**, sin ramas por tarea.
- **D-12:** el contrato UX citaba WCAG 2.5.5 (AAA, 44×44); el nivel declarado es **AA** y el
  criterio aplicable es **2.5.8** (≥24×24). Corregido en `components.md` y en SCR-004.
- **D-13:** `TASK-UI-404` se cierra **sin código** al comprobar que RF-405 ya se cumple (DP-7).
- **D-14 *(esta corrida)*:** `PA-2` resuelta — se **confirma la retirada** de Multigráfico: la
  decisión D-3/ADR-029 no dependía de `RF-401`.
- **D-15 *(esta corrida)*:** la medición de RNF-404 es **client-side** (jsdom, `fetch` mockeado) y
  su comparación estricta no es fiable ahí; queda pendiente en navegador real, sin bloquear (D-5).

## Preguntas abiertas (PA-X)

- **PA-1 *(resuelta)***: el aviso de cobertura era un **falso positivo de borde** (desfase de
  bucket + cierre de fin de semana). Corregido y probado en `TASK-UI-413`/`TASK-UI-414`.
- **PA-2 *(resuelta)***: se confirma la retirada de Multigráfico (D-14).
- **PA-3:** criterio de viabilidad de `Exportar` (`TASK-UI-417`).
- **PA-4**: ¿quién verifica los 12 frentes del insumo (KPI-401) y con qué guion manual?

## Estado técnico

| Aspecto | Valor |
|---------|-------|
| Persistencia | **v2 por activo** (`fxtrad.chart.v2.{symbol}`) + migración desde v1 + puntero `fxtrad.chart.last` |
| Migración | `state/migrate-chart-config.ts` puro: unión deduplicada por `id`, solo lee, nunca borra v1 |
| Selección | `parseChartQuery(params, fallback?)`; precedencia URL > persistido > defecto; `replaceRoute` sin historial |
| Cambio de escala | `CMP-023` en `ChartHeader` + estados `switching-tf`/`tf-ready`/`tf-error` con **reversión** y anuncio |
| Cobertura | `charting/coverage.ts` (`hasCoverageGap`): avisa solo por huecos reales (bucket/weekend excluidos) |
| Precios numéricos | `CMP-025` integrado: botón «Precios» anclado, `Aplicar`/`Enter` por el command stack, anuncio en `LiveRegion` |
| Multigráfico | **retirado** (ADR-029): sin ruta, sin `MultiChart`, sin `chart-sync`, sin props `sync` |
| Fuera de alcance | `TECH-305` (waivers), `TECH-306` (límites de tamaño), `TECH-307` (logging) — auditoría `CR-002` |
| Backend | intacto (546 tests + 2 skip) — el ciclo es 100 % frontend |
| Frontend | **549 tests** en 58 archivos · typecheck, eslint y prettier en verde |
| Calidad | `_docs/quality-profile.toml` · gate **PASS** (0 incumplidos, 25 waivers) |
| Versionado | `_docs/git-profile.toml` · rama `master` · árbol limpio · **1 commit local** sin `push` |

## Qué haría yo ahora

1. **`/sdd-cycle TASK-405`** (arriba).
2. Al cerrar `TASK-403`, quedarán las cadenas de UI (`TASK-UI-400` → eje/menú) y `TASK-TEC-402`.
3. `git push origin master` cuando quieras publicar el commit de `TASK-TEC-403`.

## Avisos

- **Ninguna tarea está bloqueada**; `TASK-TEC-402` **espera** a `TASK-UI-409` (menú contextual).
- `RF-411` (`TASK-UI-417`, `Exportar`) es la única `Could` del ciclo: primer candidato a recorte
  (`DP-3`).
- Deuda menor declarada, **sin tarea**: verificación de RNF-404 en navegador real y el doble clic
  sobre la etiqueta de nivel de `CMP-025` (canvas, no verificable en jsdom).
- `_docs/ux/` de `SCR-005` está marcado como **retirado**; los de `SCR-006` siguen vigentes hasta la
  evaluación de `TASK-UI-417`.
