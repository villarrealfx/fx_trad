# ADR-029: Retirada de Multigráfico y de su andamiaje de sincronización

- **Fecha:** 2026-10-06
- **Estado:** Aceptado
- **Decisores:** Arquitecto · usuario (stakeholder)
- **Requisitos vinculados:** RF-409 · **modifica RF-310** (ciclo 04)

## Contexto

La pantalla `Multigráfico` (SCR-005) se entregó en los ciclos 03–04: ruta `/multichart`
(`app/routes.ts:28`), componente `components/MultiChart/` con N paneles `ChartPane`, y un
controlador de sincronización (`charting/chart-sync.ts`) que alinea el rango temporal entre
paneles. El ciclo 04 la usó para verificar la herramienta Operación pane a pane (TASK-UI-321) y
`RF-310` declaró la herramienta disponible «en Gráfico **y** en Multigráfico».

El usuario decide **retirarla**: no aporta una experiencia cómoda y dificulta el análisis
(`cycle_05.md` §2.d). El análisis previo a esta decisión añade un dato que condiciona el alcance:
**`chart-sync` y las props `sync`/`syncId` de `ChartPane` tienen como único consumidor de
producción a `MultiChart`** (`MultiChart.tsx:117`); el resto de usos son tests. Retirar la pantalla
sin retirar el andamiaje dejaría código sin consumidor (`Q-STR-02`).

Riesgo asociado (R-402/PA-2): parte del malestar puede venir del bug de selección (RF-401) y no de
la pantalla en sí. La decisión se toma con el usuario; si al arreglar RF-401 cambiara el juicio, se
reconsidera antes de ejecutar la tarea.

## Decisión

**Se retira Multigráfico y todo su andamiaje** en una sola tarea:

1. **Navegación y rutas:** se elimina `/multichart` de `ROUTES` y `SCR-005` del tipo `ScreenId`
   (`app/routes.ts`), y la rama `route.screen === 'SCR-005'` de `App.tsx:130`.
2. **Pantalla:** se borra `components/MultiChart/` completo (`.tsx`, `.css` y `__tests__/`).
3. **Sincronización:** se borra `charting/chart-sync.ts` y su test, y se quitan de `ChartPane` las
   props `sync`/`syncId`, el import de `ChartSyncController` y el efecto de publicación/suscripción
   asociado, junto con los dos tests que las ejercitaban.
4. **Requisito:** `RF-310` del ciclo 04 queda **modificado** a «la herramienta Operación está
   disponible en `Gráfico`» (registrado en `traceability.md` §6 y en `requirements.md`).
5. **UX:** los artefactos de `_docs/ux/` que documentan `SCR-005` (wireframe, `interaction-specs.md`,
   `accessibility.md`, `components.md`) quedan obsoletos y **deben actualizarse o marcarse como
   retirados** en la fase `/sdd-ux` o en la tarea correspondiente; no se dejan colgando (S-12).
6. **Sin sustituta:** no se construye una pantalla que la reemplace. El análisis multi-activo, si
   vuelve a hacer falta, será una decisión nueva con su requisito.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| **Conservar Multigráfico** y arreglar su usabilidad | No se pierde funcionalidad entregada | El usuario la considera contraproducente para analizar; mantenerla obliga a sincronizar dos superficies de gráfico en cada cambio | Decisión explícita del usuario (D-3) |
| **Ocultarla de la navegación** conservando el código | Retirada reversible | Deja ruta, pantalla, sincronización y tests sin uso: deuda y confusión, y el bundle sigue pagándola | La retirada a medias es el peor de los dos mundos |
| Retirar la pantalla y **conservar `chart-sync`** como punto de extensión | No se toca `ChartPane` | Código sin consumidor; `Q-STR-02` lo marcaría en la próxima auditoría | Se descartó por coherencia (decisión del usuario) |
| Sustituirla por un layout de paneles en `Gráfico` | Reutiliza el trabajo | Capacidad nueva sin requisito; multiplica el alcance del ciclo (RNF-007) | Fuera de alcance (RF-W-404) |

## Consecuencias

### Positivas
- Una sola superficie de gráfico que mantener: menos código, menos tests y menos bundle (RF-409).
- Desaparece el andamiaje de sincronización sin consumidor: no queda código muerto (Q-STR-02).
- Menos rutas que documentar y verificar; `RF-310` queda coherente con lo que existe.

### Negativas / Trade-offs
- **Se pierde** la comparación de varios activos en una pantalla; volver a tenerla exigirá un
  requisito y un diseño nuevos (`RF-W-404`).
- `RF-310` (ciclo 04) se modifica: un requisito ya cerrado cambia de alcance, lo que exige
  registrarlo en `traceability.md` y en `requirements.md` para no romper la trazabilidad.
- Los artefactos de `_docs/ux/` de SCR-005 quedan obsoletos hasta que se actualicen.

### Neutras
- El backend no participa; ninguna API cambia.
- Sin dependencias nuevas (RX-401): se retira código, no se añade.

## Evaluación de PA-2 (2026-10-06, tras ejecutar la retirada)

`PA-2` preguntaba si el dolor de Multigráfico lo causaba el bug de selección (`RF-401`) y, por
tanto, si al arreglarlo procedía reconsiderar la retirada. Evaluación **posterior** con el código
retirado recuperado de git (`2c244c7^`):

| Alegación | Evidencia | Conclusión |
|---|---|---|
| Era una comparación de activos | `MultiChart` recibía **un solo** `symbol` y cada panel solo cambiaba de `timeframe` | Nunca fue multi-activo: no sostenía su nombre |
| El andamiaje era prescindible | `chart-sync` (`ChartSyncController`) tenía como **único** consumidor de producción a `MultiChart` | Coste de mantenimiento duplicado, ajeno a `RF-401` |
| El bug de selección era la causa | `RF-401` reseteaba a `EURUSD 1h` al volver a `Gráfico` y **agrava** la percepción | Factor **contribuyente**, no causa |
| El caso de uso sigue haciendo falta | `CMP-023` cambia de TF en el sitio y el documento v2 por activo mantiene dibujos e indicadores al cambiar de escala | El flujo «ver el mismo activo en otro TF» es ahora un clic |
| La retirada era reversible con poco coste | Decisión del usuario (D-3) y retirada en bloque (`TASK-UI-415`/`416`) | Sin telemetría (app local) el contrafactual no es medible |

**Resultado:** la retirada se mantiene. `RF-401` no era la causa del dolor; arreglarlo **redujo** la
necesidad de la pantalla. Si vuelve a hacer falta comparación multi-activo, exige requisito y diseño
nuevos (`RF-W-404`). Confianza en la decisión: alta; en que `RF-401` fuera la causa: baja.

## Evaluación de PA-3 (`Exportar`, SCR-006) — 2026-10-07

`PA-3` pedía el **criterio de viabilidad** de `Exportar` (`TASK-UI-417`, `RF-411`). La app es local y
**no hay telemetría de uso**, así que el criterio se define por requisito, cobertura y superficie:

> `SCR-006` se **mantiene** si (a) cierra un requisito vigente, (b) está cubierta por pruebas y
> (c) no duplica la superficie de gráfico. Se retira si falla (a) o (c).

| Alegación | Evidencia | Conclusión |
|---|---|---|
| Cierra un requisito vigente | `RF-015` (ciclo 01, **Must**): «exportar una captura en imagen (gráfico + dibujos)» | Retirarla dejaría `RF-015` sin superficie → cumple (a) |
| Está cubierta por pruebas | `components/ExportModal/__tests__/ExportModal.test.tsx`, `export/__tests__/png.test.ts`, `__tests__/app.test.tsx` (descarga PNG), `__tests__/a11y.test.tsx`, `__tests__/smoke-base-1m.test.tsx` | Cumple (b) |
| No duplica superficie de gráfico | Es un **modal** (`CMP-014`) sobre `Gráfico`, no otra pantalla de gráfico | Cumple (c) |
| Es accesible | `_docs/ux/accessibility.md`: SCR-006 ✅ focus trap · ✅ `dialog` · ✅ preview con alt | Sin deuda de accesibilidad |
| Retirarla tendría coste | Borrar `ExportModal` + `export/png` y ~5 ficheros de test, sin salida de imagen alternativa | Coste alto sin requisito que lo pida |

**Resultado:** se **mantiene** `Exportar` (`SCR-006`) sin cambios de requisito. `PA-3` queda
resuelta. Si en el futuro se decide retirarla, exige modificar `RF-015`, abrir requisito nuevo y una
tarea de retirada como la de `EP-UI-406` (`TASK-UI-415`/`416`). Confianza: alta.

## Referencias

- `_docs/requirements.md` RF-409, RF-W-404 · `_docs/plan.md` §7 R-402
- `_docs/iterations/04-dibujo-referencia-operacion/requirements.md` RF-310 · `traceability.md` (TASK-UI-321)
- `frontend/src/app/routes.ts` · `frontend/src/App.tsx` · `frontend/src/components/MultiChart/` · `frontend/src/charting/chart-sync.ts`
- `_docs/session-handoff.md` D-3 · PA-2
- **PA-3 / `Exportar`:** `_docs/requirements.md` RF-015, RF-411 · `_docs/ux/accessibility.md` · `frontend/src/components/ExportModal/` · `frontend/src/export/`
