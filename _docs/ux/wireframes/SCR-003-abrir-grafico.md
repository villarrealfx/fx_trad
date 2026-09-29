# SCR-003: Abrir gráfico (activo + rango + timeframe)

- **Persona:** P-001
- **RF:** RF-218, RF-219
- **Journey:** J-002
- **Prioridad:** Must

## Wireframe (ASCII)

```
┌──────────────────────────────────────────────────────────────┐
│ ← fx_trad            Abrir gráfico                           │
├──────────────────────────────────────────────────────────────┤
│            ● Activo (de la biblioteca)                       │
│            [▼ EUR/USD ]  Cobertura: 2024-09-06 → 2026-08-31  │
│                                                              │
│            ● Periodo a visualizar (dentro de la cobertura)   │
│            Desde [2026-01-01]   Hasta [2026-08-31]           │
│                                                              │
│            ● Timeframe (agregado desde 1 m)                  │
│            [ ( ) 1m ( ) 5m ( )15m (●) 1h ( ) 4h ( ) 1d ]     │
│                                                              │
│            ⚠ Rango fuera de cobertura no permitido (inline)  │
│                                                              │
│            [ ➜ Abrir gráfico ]                               │
│                                                              │
│            (formulario centrado horizontalmente)             │
└──────────────────────────────────────────────────────────────┘
```

> Sin ninguna referencia a `1s` (RF-219, ADR-020).

## Estados
- **loading:** cobertura cargando → skeleton del selector.
- **empty:** biblioteca sin activos → "Descarga primero un activo" + CTA a SCR-002.
- **error:** fallo al leer cobertura → banner con reintento; valores previos preservados.
- **success:** selector operativo; "Abrir gráfico" habilita y navega a SCR-004.
- **partial:** cobertura discontinua → validación muestra el rango útil exacto.

## Componentes usados
- Select (activo, timeframe), Input (date), RadioGroup, Button (primary).

## Notas de accesibilidad
- Timeframes como radiobuttons reales con `<fieldset>/<legend>`.
- Validación inline anunciada con foco dirigido al campo en error.
