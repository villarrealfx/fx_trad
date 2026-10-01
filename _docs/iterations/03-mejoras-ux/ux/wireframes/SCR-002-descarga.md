# SCR-002: Descarga de datos

- **Persona:** P-001
- **RF:** RF-214, RF-215, RF-216, RF-217 (+ RI-002)
- **Journey:** J-001
- **Prioridad:** Must

## Wireframe (ASCII)

```
┌──────────────────────────────────────────────────────────────┐
│ ← fx_trad        Descargar datos históricos                  │
├──────────────────────────────────────────────────────────────┤
│            ● Activo            ● Tipo                        │
│            [▼ EUR/USD  ]       [▼ Forex   ]                  │
│            ● Fecha inicio      ● Fecha fin                   │
│            [2026-01-01 ]       [2026-08-31]                  │
│                                                              │
│            Base temporal: 1 minuto (UTC) — fija              │
│                                                              │
│            [ Iniciar descarga ]                              │
│                                                              │
│   ── Historial ──────────────────────────────────────────    │
│   Fecha       Activo   Rango                 Estado   Filas  │
│   26-08-2026  EURUSD   2026-01-01→08-31      éxito    87 421 │
│   22-08-2026  GBPJPY   2024-09-06→2025-12-31 éxito    1 204  │
│   18-08-2026  AUDUSD   2026-09-01→09-15      fallo    0      │
│                                                              │
│   (formulario y tabla centrados horizontalmente)             │
└──────────────────────────────────────────────────────────────┘
```

## Estados
- **loading:** descarga encolada → form deshabilitado, ProgressBar activa; el resto navegable.
- **empty:** sin historial → bloque Historial oculto, solo formulario.
- **error:** descarga falla / campo inválido → error inline por campo + fila `fallo` + banner "Reintentar".
- **success:** descarga completa → banner éxito + fila en historial con activo y filas.
- **partial:** descarga incompleta → estado `parcial` con rango cubierto y sugerencia de rango faltante.

## Componentes usados
- Button (primary), Input (date), Select (activo, tipo), Table, ProgressBar, StatusBanner.

## Notas de accesibilidad
- Labels visibles asociados a cada campo.
- `role="progressbar"` con `aria-valuenow`; estado anunciado por `aria-live`.
- Errores inline por campo; globales con `role="alert"`.
