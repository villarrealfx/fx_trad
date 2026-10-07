# QAR-HU-UI-403 — Verificación de aceptación

> **Alcance:** HU-UI-403 — *Ver el dato exacto de una vela concreta* (`EP-UI-403`, Should)
> **Requisitos origen:** RF-408 · **Fecha:** 2026-10-07 · **Modo:** `--sdd`
> **Tareas cerradas:** `TASK-UI-408`, `TASK-UI-409` (2/2 ✅) · **Pendientes:** ninguna

## Criterios de Aceptación

- [x] **CA-1** Dada una vela, al hacer clic derecho aparece un panel con fecha, hora, apertura, máximo, mínimo y cierre — **PASS**
  - *Evidencia:* `npx vitest run src/components/CandleContextMenu/__tests__/CandleContextMenu.test.tsx src/components/ChartPane/ChartPane.test.tsx` → `✓ CandleContextMenu > abre como diálogo con la fecha, la hora y el OHLC a 5 decimales` (18-nov-25 · 00:15 y los 4 valores a 5 decimales) y `✓ ChartPane > abre el menú contextual con la vela del clic derecho (TASK-UI-409)` (la vela bajo el cursor es la correcta).
- [x] **CA-2** Con el panel abierto, `Escape` o clic fuera lo cierran y el foco vuelve al gráfico — **PASS**
  - *Evidencia:* `✓ CandleContextMenu > cierra con Escape y devuelve el foco al gráfico`, `✓ CandleContextMenu > cierra con clic fuera pero no con clic dentro`.

## Casos borde verificados

| Caso | Instrumento | Resultado |
|---|---|---|
| Reposicionamiento en los 4 bordes (no desborda) | `CandleContextMenu.test.tsx` | PASS — `left/top` dentro del viewport |
| Clic dentro del panel no lo cierra | `CandleContextMenu.test.tsx` | PASS |
| axe-core sin violaciones | `CandleContextMenu.test.tsx` | PASS — 0 violaciones |
| Accesibilidad por teclado (`Shift+F10` abre el menú) | `ChartPane.test.tsx` (TASK-TEC-402) | PASS — cierra con `Escape` y devuelve el foco |
| Cambio de TF cierra el menú | Código + suite (TASK-UI-408) | PASS |

## Pruebas Ejecutadas

- **Comando:** `npx vitest run src/components/CandleContextMenu/__tests__/CandleContextMenu.test.tsx src/components/ChartPane/ChartPane.test.tsx` · **Resultado:** 90 pasadas, 0 fallidas · **Timeout:** no alcanzado
- **Comando:** `backend/.venv/bin/python -m pytest backend -o addopts=""` · **Resultado:** 546 pasadas, 2 skip
- **Nota:** la posición visual exacta del panel sobre la vela en navegador real se cubre en la verificación manual del usuario.

## Veredicto Final: PASS

```yaml
qa_report:
  scope: HU-UI-403
  verdict: PASS
  blocker_type: null
  criteria_total: 2
  criteria_evaluated: 2
  criteria_passed: 2
  tasks_pending: []
  tests: { command: "npx vitest run CandleContextMenu/ChartPane · pytest backend", passed: 636, failed: 0 }
  blockers: []
  report: "_docs/qa/QAR-HU-UI-403-001.md"
```
