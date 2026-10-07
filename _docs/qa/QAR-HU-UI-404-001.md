# QAR-HU-UI-404 — Verificación de aceptación

> **Alcance:** HU-UI-404 — *Fijar Entrada y SL con precisión de pip* (`EP-UI-404`, Should)
> **Requisitos origen:** RF-410 · **Fecha:** 2026-10-07 · **Modo:** `--sdd`
> **Tareas cerradas:** `TASK-UI-410`, `TASK-UI-411`, `TASK-UI-412` (3/3 ✅) · **Pendientes:** ninguna

## Criterios de Aceptación

- [x] **CA-1** Dada una operación seleccionada, al editar su Entrada o SL por teclado el precio se aplica con 5 decimales y la figura se recalcula — **PASS**
  - *Evidencia:* `✓ OperationNumericFields (CMP-025, RF-410) > aplica con Enter los precios redondeados a la precisión del activo`, `✓ … aplica con el botón Aplicar cuando el par es válido`, `✓ … expone un diálogo de precios con label visible en ambos campos`. Integración: `✓ ChartPane > precios numéricos de la operación (TASK-UI-411) > …` (mutación por el command stack y recálculo de dirección/`R`/TP).
- [x] **CA-2** Con el popover abierto, al pulsar `Ctrl+Z` la edición se revierte — **PASS**
  - *Evidencia:* `✓ ChartPane > precios numéricos de la operación (TASK-UI-411) > … Ctrl+Z restaura la figura exactamente` (tests de aceptación del popover, TASK-UI-412).
- [x] **CA-3** Dado un valor inválido, el error aparece inline y `Aplicar` está deshabilitado — **PASS**
  - *Evidencia:* `✓ OperationNumericFields > muestra el error inline asociado al campo cuando el valor no es numérico`, `✓ … deshabilita Aplicar mientras haya un valor no numérico`, `✓ … marca riesgo nulo y deshabilita Aplicar cuando Entrada y SL coinciden`.

## Casos borde verificados

| Caso | Instrumento | Resultado |
|---|---|---|
| `Enter`/`Escape`/`Tab` y orden Entrada→SL | `OperationNumericFields.test.tsx` + `ChartPane.test.tsx` | PASS |
| `Entrada == SL` (R = 0) | `OperationNumericFields.test.tsx` | PASS — `Aplicar` deshabilitado |
| Trampa de foco (Tab y Shift+Tab) | `OperationNumericFields.test.tsx` | PASS |
| Serie/figura recalculada y anuncio con los 5 valores | `ChartPane.test.tsx` | PASS |
| Accesibilidad (axe con el popover abierto) | `ChartPane.test.tsx` (TASK-TEC-402) | PASS — 0 violaciones |

## Pruebas Ejecutadas

- **Comando:** `npx vitest run src/components/OperationNumericFields` · **Resultado:** 14 pasadas, 0 fallidas
- **Comando:** `npx vitest run src/components/ChartPane/ChartPane.test.tsx` · **Resultado:** 85 pasadas, 0 fallidas
- **Comando:** `backend/.venv/bin/python -m pytest backend -o addopts=""` · **Resultado:** 546 pasadas, 2 skip

## Veredicto Final: PASS

```yaml
qa_report:
  scope: HU-UI-404
  verdict: PASS
  blocker_type: null
  criteria_total: 3
  criteria_evaluated: 3
  criteria_passed: 3
  tasks_pending: []
  tests: { command: "npx vitest run OperationNumericFields/ChartPane · pytest backend", passed: 645, failed: 0 }
  blockers: []
  report: "_docs/qa/QAR-HU-UI-404-001.md"
```
