# QAR-HU-UI-402 — Verificación de aceptación

> ⚠️ **OBSOLETO (D-19, 2026-10-07):** este `PASS` verificó el **eje X de dos filas**, que se retiró
> tras la verificación manual (rompía la manipulación del eje y la geometría del overlay). `RF-407`
> se modificó a una fila; **requiere un QAR nuevo** tras el revert. No usar para `accept`.

> **Alcance:** HU-UI-402 — *Leer la fecha y la hora del eje sin apelotonamiento* (`EP-UI-402`, Should)
> **Requisitos origen:** RF-407 · **Fecha:** 2026-10-07 · **Modo:** `--sdd`
> **Tareas cerradas:** `TASK-UI-406`, `TASK-UI-407` (2/2 ✅) · **Pendientes:** ninguna

## Criterios de Aceptación

- [x] **CA-1** Dado el eje temporal a cualquier zoom, la fecha va arriba y `hh:mm` abajo — **PASS**
  - *Evidencia:* `npx vitest run src/charting/__tests__/axis-format.test.ts src/components/ChartPane/ChartTimeAxis.test.tsx` → `✓ ChartTimeAxis > renderiza la fecha en la fila superior y la hora en la inferior`, `✓ formatAxisDate > rinde la fecha dd-mmm-aa en UTC`, `✓ formatAxisTime > rinde hh:mm en UTC`, `✓ formato en dos filas desde los tokens > los patrones del eje son los del design system`.
- [x] **CA-2** Dado el zoom de 2 años, las etiquetas no se solapan — **PASS**
  - *Evidencia:* `✓ selectAxisRows (RF-407, umbral de separación) > no solapa la fila de fecha a zoom de 2 años` (verifica que la separación entre etiquetas contiguas ≥ umbral) y `✓ … respeta el umbral de las dos filas con ticks de 15m a zoom mínimo`.

## Casos borde verificados

| Caso | Instrumento | Resultado |
|---|---|---|
| Zoom mínimo con ticks de 15m | `axis-format.test.ts` | PASS — sin solape en ambas filas |
| Franja sin marcas | `ChartTimeAxis.test.tsx` | PASS — no rompe |
| Marcas fuera de la franja (izq./der.) | `axis-format.test.ts` | PASS — se descartan |
| Cambio de día UTC | `axis-format.test.ts` | PASS — abre etiqueta de fecha |
| Layout: el canvas cede el alto sin scroll | `ChartTimeAxis.test.tsx` (lee `ChartPane.css`) | PASS — franja `flex: 0 0 40px` en columna |

## Pruebas Ejecutadas

- **Comando:** `npx vitest run src/charting/__tests__/axis-format.test.ts src/components/ChartPane/ChartTimeAxis.test.tsx` · **Resultado:** 15 pasadas, 0 fallidas · **Timeout:** no alcanzado
- **Comando:** `backend/.venv/bin/python -m pytest backend -o addopts=""` · **Resultado:** 546 pasadas, 2 skip
- **Nota:** la fidelidad visual de la franja de 40 px en navegador real se cubre en la verificación manual del usuario (no hay render de canvas en jsdom).

## Veredicto Final: PASS

```yaml
qa_report:
  scope: HU-UI-402
  verdict: PASS
  blocker_type: null
  criteria_total: 2
  criteria_evaluated: 2
  criteria_passed: 2
  tasks_pending: []
  tests: { command: "npx vitest run axis-format/ChartTimeAxis · pytest backend", passed: 561, failed: 0 }
  blockers: []
  report: "_docs/qa/QAR-HU-UI-402-001.md"
```
