# SCR-005: Multigráfico — **PANTALLA RETIRADA**

- **Estado:** ❌ **Retirada en el ciclo 05** por RF-409 y ADR-029.
- **Fecha de retirada:** 2026-10-06
- **Decisión:** `_docs/adr/ADR-029-retirada-multigrafico.md` (D-3 de `_docs/session-handoff.md`)
- **Requisito modificado:** `RF-310` (ciclo 04) pasa de «la Operación está disponible en Gráfico
  **y** en Multigráfico» a «la Operación está disponible en **Gráfico**».

## Qué se retira

| Elemento | Acción |
|----------|--------|
| Ruta `/multichart` y `SCR-005` del tipo `ScreenId` | Se eliminan de `frontend/src/app/routes.ts` |
| Entrada «Multigráfico» de la navegación | Se elimina de `AppShell` (vía `ROUTES`) |
| `components/MultiChart/` (`.tsx`, `.css`, `__tests__/`) | Se elimina la carpeta |
| `charting/chart-sync.ts` y su test | Se eliminan: `MultiChart` era su **único** consumidor de producción |
| Props `sync` / `syncId` de `ChartPane` | Se eliminan con su efecto asociado y sus 2 tests |
| `CMP-011 Tab` | **Pierde su uso en producción**; se conserva como componente del kit (con tests) |

## Por qué se retira

La pantalla no aportaba una experiencia cómoda y dificultaba el análisis (`cycle_05.md` §2.d). El
diseño alternativo (consolidar los dibujos en un documento por activo, ADR-027) hace innecesario
comparar escalas en paneles sincronizados: el mismo dibujo está en todos los timeframes del activo
con un solo gráfico.

**Nota de riesgo (PA-2):** parte del malestar podía venir del bug de selección (RF-401). Si al
arreglarlo cambiara el juicio, la retirada debe reconsiderarse **antes** de ejecutar la tarea.

## Histórico

El boceto completo de la pantalla, sus estados y sus notas de accesibilidad están archivados en
`_docs/iterations/04-dibujo-referencia-operacion/ux/wireframes/SCR-005-multigrafico.md` y no se
mantienen aquí: una pantalla retirada no debe seguir describiéndose como vigente (S-12).

## Sustituta

**Ninguna.** El análisis multi-activo, si vuelve a hacer falta, será un requisito nuevo
(`RF-W-404`).
