# SCR-002: Descargar datos de Dukascopy

- **Persona:** P-001
- **RF:** RF-001, RF-002, RF-006 (+ RI-002 feedback del historial)
- **Journey:** J-001
- **Prioridad:** Must

## Wireframe (ASCII)

```
┌──────────────────────────────────────────────────────────────┐
│ ← fx_trad            Descargar datos históricos              │
├──────────────────────────────────────────────────────────────┤
│  ● Activo                       ● Tipo                       │
│  [▼ EUR/USD               ]     [▼ Forex                ]    │
│  ● Fecha inicio                ● Fecha fin                   │
│  [2026-01-01              ]     [2026-08-31             ]    │
│                                                              │
│  Periodicidad base: 1 segundo (UTC) — fija, no editable      │
│                                                              │
│  [ Iniciar descarga ]                                        │
│                                                              │
│  ── Descarga en curso ─────────────────────────────────────  │
│  EUR/USD 2026-01-01 → 2026-08-31  ▓▓▓▓▓░░░░░ 62%            │
│  ── Historial ─────────────────────────────────────────────  │
│  Fecha       Rango                  Estado   Filas           │
│  26-08-2026  2026-01-01→2026-08-31  éxito    87 421          │
│  22-08-2026  2024-09-06→2025-12-31  éxito    1 204 300       │
│  18-08-2026  2026-09-01→2026-09-15  fallo    0               │
└──────────────────────────────────────────────────────────────┘
```

## Estados
- **loading (progreso):** barra de progreso con % y detalle activo/rango; botón "Iniciar" deshabilitado; el resto de la app sigue navegable (tarea asíncrona)
- **empty:** sin historial → bloque "Historial" oculto, se muestra solo el formulario
- **error:** descarga falla → fila/sentry en Historial con estado `fallo` + banner con botón "Reintentar"; campos del form conservan valores
- **success:** descarga completa `éxito` → banner verde de confirmación, fila añadida al historial, contador de filas
- **partial:** descarga incompleta (límite Dukascopy / corte) → estado `parcial` con detalle del rango cubierto; al reabrir, la UI sugiere el rango faltante para la incremental (RF-006)

## Componentes usados
- Button (primary)
- Input (date), Select (activo, tipo)
- StatusBanner, Table
- ProgressBar

## Notas de accesibilidad
- Labels visibles asociados a cada campo (nunca placeholder como label).
- Progreso declarado con `role="progressbar"` + `aria-valuenow`.
- Errores inline por campo y anuncio global con `role="alert"`.
- Cambio de estado de descarga anunciado por aria-live.