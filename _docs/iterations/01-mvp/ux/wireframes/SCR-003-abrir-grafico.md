# SCR-003: Abrir gráfico (activo + rango + timeframe)

- **Persona:** P-001
- **RF:** RF-008, RF-009
- **Journey:** J-002
- **Prioridad:** Must

## Wireframe (ASCII)

```
┌──────────────────────────────────────────────────────────────┐
│ ← fx_trad            Abrir gráfico                           │
├──────────────────────────────────────────────────────────────┤
│  ● Activo (de la biblioteca)                                 │
│  [▼ EUR/USD ]   Cobertura: 2024-09-06 → 2026-08-31          │
│                                                              │
│  ● Periodo a visualizar    (dentro de la cobertura)          │
│  Desde [2026-01-01      ]    Hasta [2026-08-31          ]    │
│                                                              │
│  ● Timeframe (agregado desde 1s)                             │
│  [ ( ) 1m   ( ) 5m   ( ) 15m   (●) 1h   ( ) 4h   ( ) 1d ]   │
│                                                              │
│  ⚠ Rango fuera de cobertura no permitido (validación inline) │
│                                                              │
│  [ ➜ Abrir gráfico ]                                         │
└──────────────────────────────────────────────────────────────┘
```

## Estados
- **loading:** lista de activos cargando → skeleton del selector
- **empty:** biblioteca sin activos → mensaje "Descarga primero un activo" + CTA a SCR-002 (bloquea el gráfico)
- **error:** fallo al leer cobertura → banner con reintento; valores previos preservados
- **success:** selector operativo; "Abrir gráfico" habilita y navega a SCR-004
- **partial:** activo con cobertura discontinua (gaps de feriados/weekend, RF-004) → el selector valida y muestra rango útil exacto; aviso de huecos internos si existen

## Componentes usados
- Select (activo, timeframe), Input (date)
- Button (primary)
- RadioGroup

## Notas de accesibilidad
- Grupo de timeframes como radiobuttons reales con `<fieldset>/<legend>`.
- Validación inline anunciada y con foco dirigido al campo en error.
- Rango de fechas con mensaje de error por campo (inicio>fin).