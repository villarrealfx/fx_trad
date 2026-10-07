# QAR-HU-UI-402 — Verificación de aceptación (n.º 002, tras D-19)

> **Alcance:** HU-UI-402 — *Leer la fecha y la hora del eje sin apelotonamiento* (`EP-UI-402`, Should)
> **Requisitos origen:** `RF-407` **modificado en D-19**: eje X con el **formato original de una fila**
> `{día} {HH:mm}` sobre el **eje nativo** (manipulable). · **Fecha:** 2026-10-07 · **Modo:** `--sdd`
> **Tareas cerradas:** `TASK-UI-406`, `TASK-UI-407` (y `TASK-UI-400/401`) ✅ · **Pendientes:** ninguna
> **Sustituye a:** `QAR-HU-UI-402-001.md` (OBSOLETO: verificaba el eje de dos filas, retirado).

## Criterios de Aceptación (según `RF-407` vigente tras D-19)

- [x] **CA-1** Dado el eje temporal a cualquier zoom, muestra `{día} {HH:mm}` (una fila) — **PASS**
  - *Evidencia:* `npx vitest run src/charting/__tests__/axis-format.test.ts src/components/ChartPane/ChartPane.test.tsx` → `✓ formatAxisLabel > muestra día del mes y hora:minuto de apertura` (`1 00:15`), `✓ AXIS_TOKENS.xFormat > conserva el formato original de una fila y no reintroduce el de dos filas`, `✓ ChartPane > configures the axis formats (RF-206/RF-207/RF-407)` (el `tickMarkFormatter` nativo devuelve `1 00:15`).
- [x] **CA-2** El eje es **manipulable** (arrastre/zoom) y no hay solape de etiquetas — **PASS**
  - *Evidencia:* el eje nativo se conserva (`timeScale` sin `visible:false`; `tickMarkFormatter` activo), verificado en `✓ ChartPane > configures the axis formats` y por la **verificación manual del usuario (2026-10-07)**, que confirmó el arrastre/zoom del eje.

## Casos borde verificados

| Caso | Instrumento | Resultado |
|---|---|---|
| Cambio de día (fin de día / inicio) | `axis-format.test.ts` | PASS — `1 23:45` → `2 00:00` |
| Precisión del eje Y | `axis-format.test.ts` | PASS — 5 decimales / `0.00001` |
| Geometría del overlay (regresión D-19) | `ChartPane.test.tsx` | PASS — el canvas no excede el host y no existe franja hermana |
| Arrastre/zoom del eje y precisión de dibujos | **Verificación manual del usuario** | PASS — los 4 síntomas de D-19 resueltos |

## Pruebas Ejecutadas

- **Comando:** `npx vitest run src/charting/__tests__/axis-format.test.ts src/components/ChartPane/ChartPane.test.tsx` · **Resultado:** 91 pasadas, 0 fallidas · **Timeout:** no alcanzado
- **Comando:** `backend/.venv/bin/python -m pytest backend -o addopts=""` · **Resultado:** 546 pasadas, 2 skip
- **Nota de entorno:** `make test` no es ejecutable en esta máquina (`uv`: `Read-only file system`); se usan los runners directos equivalentes.

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
  tests: { command: "npx vitest run axis-format/ChartPane · pytest backend", passed: 637, failed: 0 }
  blockers: []
  report: "_docs/qa/QAR-HU-UI-402-002.md"
```
