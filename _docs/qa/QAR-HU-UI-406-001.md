# QAR-HU-UI-406 — Verificación de aceptación

> **Alcance:** HU-UI-406 — *Una sola superficie de gráfico* (`EP-UI-406`, Should/Could)
> **Requisitos origen:** RF-409, RF-411 · **Fecha:** 2026-10-07 · **Modo:** `--sdd`
> **Tareas cerradas:** `TASK-UI-415`, `TASK-UI-416`, `TASK-UI-417` (3/3 ✅) · **Pendientes:** ninguna

## Criterios de Aceptación

- [x] **CA-1** Dada la navegación, no existe «Multigráfico» ni la ruta `/multichart`, y la Operación sigue disponible en `Gráfico` — **PASS**
  - *Evidencia:* `npx vitest run src/app/__tests__/routes.test.ts src/__tests__/app.test.tsx` → `✓ ROUTES sin Multigráfico (TASK-UI-416, RF-409) > no expone la ruta ni la pantalla retiradas`, `✓ … cae en Gráfico para la ruta retirada`, `✓ App > navigates between screens through the app shell` (sin enlace «Multigráfico»).
  - *Evidencia adicional (grep):* `grep -rn "/multichart\|SCR-005\|chart-sync\|MultiChart" src/` → 3 coincidencias, **todas dentro de la aserción negativa** de `routes.test.ts` (líneas 121, 122 y 126); **0 referencias en código de producción**.
- [x] **CA-2** Dado `Exportar` (`SCR-006`), al evaluarlo con el criterio acordado el cierre registra la decisión, su evidencia y, si procede, el requisito modificado — **PASS**
  - *Evidencia (documental, `INFO`):* `_docs/adr/ADR-029-retirada-multigrafico.md` → «Evaluación de PA-3 (`Exportar`, SCR-006) — 2026-10-07»: criterio de viabilidad (requisito vigente, cobertura de tests, no duplicar superficie), tabla de evidencia y **Resultado: se mantiene `Exportar` (`SCR-006`) sin cambios de requisito**. `RF-411` queda 🟢 en `traceability.md` y `PA-3` resuelta. **No hay requisito modificado** (la decisión fue mantener).

## Casos borde verificados

| Caso | Instrumento | Resultado |
|---|---|---|
| Ruta retirada `/multichart` | `routes.test.ts` | PASS — cae en `/chart` |
| Pantalla `SCR-005` fuera de `ScreenId` | `routes.test.ts` | PASS |
| Referencias residuales en producción | `grep` sobre `src/` | PASS — 0 en producción |
| Uso de `Exportar` (evidencia de no-retirada) | `ExportModal.test.tsx`, `export/png.test.ts`, `app.test.tsx`, `a11y.test.tsx`, `smoke-base-1m.test.tsx` | PASS — cubierto por 5 ficheros de test |
| Decisión registrada y ligada a requisito | Revisión de `ADR-029` + `traceability.md` | PASS (`INFO` manual) |

## Pruebas Ejecutadas

- **Comando:** `npx vitest run src/app/__tests__/routes.test.ts src/__tests__/app.test.tsx` · **Resultado:** 28 pasadas, 0 fallidas · **Timeout:** no alcanzado
- **Comando:** `grep -rn "/multichart\|SCR-005\|chart-sync\|MultiChart" src/` · **Resultado:** 3 coincidencias, todas en `routes.test.ts` (aserción negativa del test)
- **Comando:** `backend/.venv/bin/python -m pytest backend -o addopts=""` · **Resultado:** 546 pasadas, 2 skip

## Veredicto Final: PASS

```yaml
qa_report:
  scope: HU-UI-406
  verdict: PASS
  blocker_type: null
  criteria_total: 2
  criteria_evaluated: 2
  criteria_passed: 2
  tasks_pending: []
  tests: { command: "npx vitest run routes/app · grep · pytest backend", passed: 574, failed: 0 }
  blockers: []
  report: "_docs/qa/QAR-HU-UI-406-001.md"
```
