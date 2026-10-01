# SCR-005: Multigráfico sincronizado

- **Persona:** P-001
- **RF:** Hereda RF-201…213 de SCR-004 por pane (indicadores a petición, ejes, edición, persistencia)
- **Journey:** J-005
- **Prioridad:** Should

## Wireframe (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [1h] [4h] [1d]  +                        [◆ Indicadores] [⤓ Exportar]    │
├──────────────────────────────────────────────────────────────────────────┤
│ EUR/USD · 1h                                             ┤ 1.08880        │
│      ╭──╮      ╱╲                                        ┤ 1.08820        │
│   ╭──╯  ╰──╮ ╱  ╲   ▭ #D6C7AE                             ┤ 1.08760        │
│   │   ◆    │╱    ╲                                        ┤ 1.08700        │
│   └────────┴──────┴── [1 00:00 · 00:15 · 00:30 · 24:00]   ┤                │
├──────────────────────────────────────────────────────────────────────────┤
│ EUR/USD · 4h                                             ┤ 1.08910        │
│        ╭────╮                                             ┤ 1.08830        │
│   ╭────╯    ╰────╮     fib #DDB2AC                         ┤ 1.08750        │
│   └──────────────┴──── [1 00:00 · 04:00 · 08:00 · 12:00]  ┤                │
├──────────────────────────────────────────────────────────────────────────┤
│ EUR/USD · 1d                                             ┤ 1.09100        │
│         ▲▼ marcadores                                     ┤ 1.08800        │
│   └──────────────────── [1 · 2 · 3 · 4 · 5 · 6 · 7]       ┤                │
└──────────────────────────────────────────────────────────────────────────┘
```

Límite: máximo **3 panes**; el control "añadir" se deshabilita a los 3 con tooltip.

## Estados
- **loading:** panes en skeleton; "añadir" deshabilitado hasta el primer pane.
- **empty:** sin activo base → redirige a SCR-003.
- **error:** un pane falla → retry individual; los demás operan.
- **success:** panes sincronizados (crosshair/scroll); mismos límites temporales UTC.
- **partial:** pane con cobertura reducida → operativo + aviso de cobertura.

## Componentes usados
- ChartHeader, ChartPane, OverlayCanvas, Tab, IndicatorForm.

## Notas de accesibilidad
- Tabs con patrón WAI-ARIA `tablist/tab/tabpanel` y flechas direccionales.
- Cada pane replica las reglas de SCR-004 (toolbar por teclado, leyenda textual).
