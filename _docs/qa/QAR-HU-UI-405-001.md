# QAR-HU-UI-405 — Verificación de aceptación

> **Alcance:** HU-UI-405 — *Confiar en el aviso de cobertura* (`EP-UI-405`, Must)
> **Requisitos origen:** RF-402 · **Fecha:** 2026-10-07 · **Modo:** `--sdd`
> **Tareas cerradas:** `TASK-UI-413`, `TASK-UI-414` (2/2 ✅) · **Pendientes:** ninguna

## Criterios de Aceptación

- [x] **CA-1** Dado un rango cuyo borde cae fuera de la cobertura por el redondeo al bucket del TF, **no** hay aviso — **PASS**
  - *Evidencia:* `npx vitest run src/charting/__tests__/coverage.test.ts src/components/ChartPane/ChartPane.test.tsx` → `✓ hasCoverageGap (RF-402) > no avisa por el desfase de bucket del borde inicial`, `✓ … no avisa por el desfase de bucket del borde final`, `✓ ChartPane > does not warn when a range edge is only a bucket offset (RF-402)`, `✓ cobertura de borde (TASK-UI-414) > no avisa en un rango de solo viernes (cierre temprano)`, `✓ … no avisa en un rango de solo domingo (apertura tardía)`, `✓ … no avisa en una semana completa Lun→Vie`.
- [x] **CA-2** Dado un rango con velas realmente ausentes dentro, el aviso aparece — **PASS**
  - *Evidencia:* `✓ hasCoverageGap > avisa por un hueco interno de un bucket entre semana`, `✓ … avisa cuando falta el bucket del borde inicial`, `✓ … sigue avisando por un hueco real en la mañana del viernes`.

## Casos borde verificados

| Caso | Instrumento | Resultado |
|---|---|---|
| Cierre de fin de semana al inicio/medio/final del rango | `ChartPane.test.tsx` (TASK-UI-414) | PASS — sin aviso |
| Cierre real del viernes (20:00/21:00 UTC) y apertura del domingo (21:00) | `coverage.test.ts` | PASS — sin aviso (ventana semanal `[vie 19:00, lun 00:00)`) |
| Hueco real dentro del rango | `coverage.test.ts` | PASS — con aviso |
| Bucket del timeframe pedido | `coverage.test.ts` | PASS |
| Límite conocido: festivos en día laborable | Registrado en `traceability.md` RF-402 (6/594 días del histórico) | INFO — comportamiento aceptado y documentado |

## Pruebas Ejecutadas

- **Comando:** `npx vitest run src/charting/__tests__/coverage.test.ts src/components/ChartPane/ChartPane.test.tsx` · **Resultado:** 102 pasadas, 0 fallidas · **Timeout:** no alcanzado
- **Comando:** `backend/.venv/bin/python -m pytest backend -o addopts=""` · **Resultado:** 546 pasadas, 2 skip
- **Reproducción original:** con `data/EURUSD.1h.parquet` el aviso previo saltaba en 188/594 días; tras la corrección, los bordes de viernes/domingo no lo disparan (evidencia en el historial de `status.md`, reapertura de `TASK-UI-413`/`414`).

## Veredicto Final: PASS

```yaml
qa_report:
  scope: HU-UI-405
  verdict: PASS
  blocker_type: null
  criteria_total: 2
  criteria_evaluated: 2
  criteria_passed: 2
  tasks_pending: []
  tests: { command: "npx vitest run coverage/ChartPane · pytest backend", passed: 648, failed: 0 }
  blockers: []
  report: "_docs/qa/QAR-HU-UI-405-001.md"
```
