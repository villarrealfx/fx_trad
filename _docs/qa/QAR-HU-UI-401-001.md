# QAR-HU-UI-401 — Verificación de aceptación

> ⚠️ **OBSOLETO (D-19, 2026-10-07):** su CA-1 (los dibujos conservan su posición al cambiar de TF) se
> verificó con el overlay **estirado** por la franja del eje (defecto reproducido). Tras el revert
> (D-19) **requiere un QAR nuevo**. No usar para `accept`.

> **Alcance:** HU-UI-401 — *Cambiar de escala sin salir del gráfico* (`EP-UI-401`, Must)
> **Requisitos origen:** RF-403, RF-405, RF-406 · **Fecha:** 2026-10-07 · **Modo:** `--sdd`
> **Tareas cerradas:** `TASK-UI-402`, `TASK-UI-403`, `TASK-UI-404`, `TASK-UI-405` (4/4 ✅) · **Pendientes:** ninguna

## Criterios de Aceptación

- [x] **CA-1** Dado GBPUSD en 1h, al elegir 15m en el selector la serie se recarga en 15m manteniendo activo y rango — **PASS**
  - *Evidencia:* `npx vitest run src/components/TimeframeSelector/__tests__/TimeframeSelector.test.tsx src/components/ChartHeader/__tests__/ChartHeader.test.tsx src/__tests__/app.test.tsx src/components/ChartPane/ChartPane.test.tsx` → `✓ App > cambia de timeframe sin salir del gráfico y lo anuncia (TASK-UI-403, RF-403)`, `✓ ChartHeader · selector de timeframe > aloja el selector y notifica el timeframe elegido`, `✓ App > la ida y vuelta de TF conserva dibujos e indicadores (TASK-UI-405)`.
- [x] **CA-2** En la cabecera, los seis TF son seleccionables junto a Indicadores y el activo está marcado — **PASS**
  - *Evidencia:* `✓ TimeframeSelector (CMP-023, RF-406) > expone los seis timeframes del contrato en un radiogroup etiquetado`, `✓ … marca el timeframe activo con aria-checked y solo él es tabulable`, `✓ ChartHeader · selector de timeframe > mueve el TF activo cuando cambia el timeframe (TASK-UI-405, RF-406)`.
- [x] **CA-3** Con una operación activa, al cambiar de TF se mantienen 60 FPS sin frames caídos (RNF-403) — **PASS**
  - *Evidencia:* `✓ ChartPane > cambia de escala con la operación activa dentro del frame budget (TASK-UI-405)` (0 frames caídos, `FrameRateMeter` con planificador manual); `✓ ChartPane > sustains the frame budget while dragging an operation (RNF-302)`. Medición registrada: `coverage/tf-switch-measurement.json` (TASK-TEC-401).

## Casos borde verificados

| Caso | Instrumento | Resultado |
|---|---|---|
| Camino de error del TF destino (reversión) | `app.test.tsx` | PASS — vuelve al TF anterior sin anunciar |
| TF ya activo (no re-navega) | `TimeframeSelector.test.tsx` | PASS |
| Navegación con flechas / `Home` / `End` / extremos | `TimeframeSelector.test.tsx` | PASS — sin dar la vuelta |
| Selector `disabled` (gráfico no listo) | `TimeframeSelector.test.tsx` + `ChartHeader.test.tsx` | PASS — bloquea clic y teclado |
| Indicadores recalculados / serie corta | `ChartPane.test.tsx` | PASS — sin `NaN` |

## Pruebas Ejecutadas

- **Comando:** `npx vitest run src/components/TimeframeSelector/__tests__/TimeframeSelector.test.tsx src/components/ChartHeader/__tests__/ChartHeader.test.tsx src/__tests__/app.test.tsx src/components/ChartPane/ChartPane.test.tsx` · **Resultado:** 116 pasadas, 0 fallidas · **Timeout:** no alcanzado
- **Comando:** `backend/.venv/bin/python -m pytest backend -o addopts=""` · **Resultado:** 546 pasadas, 2 skip
- **Nota de entorno:** `make test` no ejecutable (`uv` sin caché escribible); runners directos equivalentes.

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
  tests: { command: "npx vitest run TimeframeSelector/ChartHeader/app/ChartPane · pytest backend", passed: 662, failed: 0 }
  blockers: []
  report: "_docs/qa/QAR-HU-UI-401-001.md"
```
