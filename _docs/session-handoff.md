# Handoff de Sesión

> Estado con el **ciclo 05 CERRADO** (26/26 tareas · 76/76 pts) tras **D-19** — 2026-10-07
> **Ruta crítica completa (7/7).** Punto de continuación exacto: **re-verificación manual** de los 4 síntomas del eje y **re-QA** de `HU-UI-401`/`HU-UI-402`

## Dónde estamos

**Ciclo 05 (`mejoras-ux-grafico`) con la ruta crítica cerrada.** La planificación está cerrada
—`plan.md`, `requirements.md` (19 requisitos `4xx`), `glossary.md`, `architecture.md` con
ADR-027/028/029/030, 9 contratos en `_docs/ux/` y el backlog con 10 épicas, 9 historias y 26 tareas
(76 pts)— y el tablero avanza por las tareas fuera de ruta crítica.

| Métrica | Valor |
|---------|-------|
| Tareas cerradas | **26/26** (100 %) |
| Cerradas | `TASK-401`, `TASK-402`, `TASK-403`, `TASK-UI-400`, `TASK-UI-401`, `TASK-UI-402`, `TASK-UI-403`, `TASK-UI-404`\*, `TASK-UI-405`, `TASK-UI-406`, `TASK-UI-407`, `TASK-UI-408`, `TASK-UI-409`, `TASK-UI-417`, `TASK-404`, `TASK-405`, `TASK-UI-410`, `TASK-UI-411`, `TASK-UI-412`, `TASK-UI-413`, `TASK-UI-414`, `TASK-UI-415`, `TASK-UI-416`, `TASK-TEC-401`, `TASK-TEC-402`, `TASK-TEC-403` |
| Ruta crítica | **7/7 · 26 pts — completa** |
| Épicas cerradas | `EP-UI-401`, `EP-UI-404`, `EP-UI-405` y la retirada de `EP-UI-406` |
| Historias aceptadas | 0/9 (exigen QA `PASS` y `/sdd-track accept`) |
| Commits locales sin empujar | **0** — `origin/master` al día tras el push manual |
| Gates | `quality_gate --level gate` = **PASS** · backend **546/546 + 2 skip** · frontend **577/577** en 59 archivos |

\* `TASK-UI-404` se cerró **sin código** (RF-405 ya estaba cubierto, DP-7); sus 2 pts pasaron a
`TASK-UI-405`.

## Punto exacto de continuación

**Bloqueante antes de cerrar: re-verificación manual de D-19.** Comprobar en navegador: (a) manipular
el eje (arrastre/zoom), (b) precisión al crear dibujos, (c) edición y borrado de dibujos/líneas/
operación, (d) estabilidad al hacer zoom.

Después:
- **Re-QA** de `HU-UI-402` y `HU-UI-401` (sus `PASS` quedaron obsoletos con D-19) y
  `/sdd-track accept HU-XXX` con los nuevos informes.
- **Revisión de cierre:** `/sdd-next status` y, si se quiere informe completo, `/sdd-audit --sdd`.
- **Publicar:** `git push origin master` (manual) con los commits locales.
- Deuda fuera del ciclo (`D-8`): `TECH-305`, `TECH-306`, `TECH-307` siguen abiertas en §8 del backlog.

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
- **D-16 *(esta corrida)*:** `TASK-UI-406` se ejecuta **antes** que `TASK-UI-401`: el DoD de los tests
  de formato exige el formateador de dos filas, que vive en el render. No se cambian los `Deps` del
  backlog (decisión de secuencia de sesión).
- **D-17 *(esta corrida)*:** `CMP-024` gana un **disparador de teclado** (`Shift+F10` / tecla
  `ContextMenu`) sobre la vela de la leyenda, porque el DoD de `TASK-TEC-402` exige un recorrido solo
  con teclado (WCAG 2.1.1). Es el único cambio de producción de una tarea `test` del ciclo.
- **D-18 *(esta corrida)*:** `Exportar` (`SCR-006`) se **mantiene**: cierra el requisito vigente
  `RF-015`, está cubierta por tests y no duplica la superficie de gráfico. Criterio y evidencia en
  `ADR-029` → «Evaluación de PA-3».
- **D-19 *(esta corrida, verificación manual)***: el **eje X de dos filas se descarta** y se vuelve al
  **formato original de una fila** `{día} {HH:mm}` sobre el **eje nativo**. Motivo: ocultar el eje
  nativo impedía manipular el eje, y la franja dentro de `.chart-pane__graph` **estiraba el canvas del
  overlay** (buffer = host, caja CSS = grafo + 40 px), rompiendo la precisión al crear, la edición y
  el borrado, y la posición al hacer zoom. Reabiertas `TASK-UI-400/401/406/407`; `RF-407` modificado.

## Preguntas abiertas (PA-X)

- **PA-1 *(resuelta, con reapertura)***: el aviso era un **falso positivo**. La primera corrección
  (`TASK-UI-413`) no cubría el cierre real del viernes (20:00/21:00 UTC) ni la apertura del domingo
  (21:00); con `data/EURUSD.1h.parquet` avisaba en **103/103** `Lun→Vie`, 103/103 viernes y 79/79
  domingos. **Reabiertas** `TASK-UI-413`/`414` y corregidas con la ventana semanal
  `[viernes 19:00, lunes 00:00)` UTC; bordes de viernes/domingo probados. Límite: festivos en día
  laborable (6/594 días del histórico).
- **PA-2 *(resuelta)***: se confirma la retirada de Multigráfico (D-14); evaluación con el código
  retirado en `ADR-029` → «Evaluación de PA-2» (era multi-TF, no multi-activo).
- **PA-3 *(resuelta, D-18)***: `Exportar` (`SCR-006`) se **mantiene**; el criterio de viabilidad y la
  evidencia quedan en `ADR-029` → «Evaluación de PA-3».
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
| Eje X | **formato original de una fila** `{día} {HH:mm}` sobre el **eje nativo** (arrastre/zoom conservados); sin franja propia (D-19) |
| Eje X (tokens) | `AXIS_TOKENS.xFormat` = `'{día} {HH:mm}'` y `drawLine` `#7D8590` (TASK-UI-400); `formatAxisDate`/`formatAxisTime` se conservan para la cabecera de `CMP-024` |
| Menú contextual | `CMP-024`: clic derecho **y** `Shift+F10`/`ContextMenu` (WCAG 2.1.1, D-17); `role="dialog"`, OHLC a 5 decimales, reposiciona y devuelve el foco (TASK-UI-408/409/TEC-402) |
| Multigráfico | **retirado** (ADR-029): sin ruta, sin `MultiChart`, sin `chart-sync`, sin props `sync` |
| Fuera de alcance | `TECH-305` (waivers), `TECH-306` (límites de tamaño), `TECH-307` (logging) — auditoría `CR-002` |
| Backend | intacto (546 tests + 2 skip) — el ciclo es 100 % frontend |
| Frontend | **564 tests** en 58 archivos · typecheck, eslint y prettier en verde |
| Calidad | `_docs/quality-profile.toml` · gate **PASS** (0 incumplidos, 25 waivers) |
| Versionado | `_docs/git-profile.toml` · rama `master` · árbol limpio · **0 commits locales** sin `push` |

## Qué haría yo ahora

1. **`/sdd-qa HU-401`**, `HU-402`, `HU-UI-403`, `HU-UI-406` (todas con tareas cerradas).
2. Registrar la aceptación con `/sdd-track accept HU-XXX` cuando el veredicto sea `PASS`.
3. Publicar con `git push origin master` (manual) cuando quieras.
3. Sin commits pendientes de publicar (`origin/master` al día).

## Avisos

- **Ninguna tarea está bloqueada**; `TASK-TEC-402` **espera** a `TASK-UI-409` (menú contextual).
- `RF-411` (`TASK-UI-417`, `Exportar`) es la única `Could` del ciclo: primer candidato a recorte
  (`DP-3`).
- Deuda menor declarada, **sin tarea**: verificación de RNF-404 en navegador real y el doble clic
  sobre la etiqueta de nivel de `CMP-025` (canvas, no verificable en jsdom).
- `_docs/ux/` de `SCR-005` está marcado como **retirado**; los de `SCR-006` siguen vigentes hasta la
  evaluación de `TASK-UI-417`.
