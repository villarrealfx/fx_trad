# QAR-HU-UI-401 — Verificación de aceptación (n.º 002, tras D-19)

> **Alcance:** HU-UI-401 — *Cambiar de escala sin salir del gráfico* (`EP-UI-401`, Must)
> **Requisitos origen:** RF-403, RF-405, RF-406, RNF-403 · **Fecha:** 2026-10-07 · **Modo:** `--sdd`
> **Tareas cerradas:** `TASK-UI-402`, `TASK-UI-403`, `TASK-UI-404`, `TASK-UI-405` ✅ · **Pendientes:** ninguna
> **Sustituye a:** `QAR-HU-UI-401-001.md` (OBSOLETO: su CA-1 se verificó con el overlay estirado por la franja del eje, D-19).

## Criterios de Aceptación

- [x] **CA-1** Dado GBPUSD en 1h, al elegir 15m la serie se recarga en 15m manteniendo activo y rango, y los dibujos conservan su posición — **PASS**
  - *Evidencia:* `npx vitest run src/components/TimeframeSelector src/components/ChartHeader src/components/ChartPane/ChartPane.test.tsx src/__tests__/app.test.tsx` → `✓ App > cambia de timeframe sin salir del gráfico y lo anuncia (TASK-UI-403, RF-403)`, `✓ App > la ida y vuelta de TF conserva dibujos e indicadores (TASK-UI-405)`, `✓ ChartPane > recalcula los indicadores con las velas del TF nuevo (TASK-UI-405, RF-405)`. La **posición exacta de los dibujos** la confirmó la **verificación manual del usuario (2026-10-07)** tras el revert D-19 (antes estaban desplazados por el canvas estirado).
- [x] **CA-2** En la cabecera, los seis TF son seleccionables junto a Indicadores y el activo está marcado — **PASS**
  - *Evidencia:* `✓ TimeframeSelector (CMP-023, RF-406) > expone los seis timeframes del contrato en un radiogroup etiquetado`, `✓ … marca el timeframe activo con aria-checked y solo él es tabulable`.
- [x] **CA-3** Con una operación activa, al cambiar de escala no hay frames caídos (RNF-403) — **PASS**
  - *Evidencia:* `✓ ChartPane > cambia de escala con la operación activa dentro del frame budget (TASK-UI-405)` (0 frames caídos), `✓ ChartPane > sustains the frame budget while editing (dragging) a drawing (RNF-202)`, `✓ … while dragging an operation (RNF-302)`.

## Casos borde verificados

| Caso | Instrumento | Resultado |
|---|---|---|
| Precisión al crear dibujos | **Verificación manual del usuario** | PASS — el trazo empieza donde se hace clic |
| Edición y borrado (líneas, rect, fib, operación) | **Verificación manual del usuario** | PASS |
| Estabilidad de las figuras al hacer zoom | **Verificación manual del usuario** | PASS |
| Reversión si falla el TF destino | `app.test.tsx` | PASS |
| Selector `disabled` / flechas / `Home`/`End` | `TimeframeSelector.test.tsx` | PASS |

## Pruebas Ejecutadas

- **Comando:** `npx vitest run src/components/TimeframeSelector src/components/ChartHeader src/components/ChartPane/ChartPane.test.tsx src/__tests__/app.test.tsx` · **Resultado:** 116 pasadas, 0 fallidas · **Timeout:** no alcanzado
- **Comando:** `backend/.venv/bin/python -m pytest backend -o addopts=""` · **Resultado:** 546 pasadas, 2 skip
- **Nota:** los cuatro síntomas de D-19 (eje, precisión, edición/borrado, zoom) fueron confirmados por el usuario en navegador el 2026-10-07.

## Veredicto Final: PASS

```yaml
qa_report:
  scope: HU-UI-401
  verdict: PASS
  blocker_type: null
  criteria_total: 3
  criteria_evaluated: 3
  criteria_passed: 3
  tasks_pending: []
  tests: { command: "npx vitest run TimeframeSelector/ChartHeader/ChartPane/app · pytest backend", passed: 662, failed: 0 }
  blockers: []
  report: "_docs/qa/QAR-HU-UI-401-002.md"
```
