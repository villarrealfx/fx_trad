# SCR-005: Multigráfico sincronizado

- **Persona:** P-001
- **RF:** RF-014
- **Journey:** J-005
- **Prioridad:** Must (hasta 3 gráficos)

## Wireframe (ASCII)

```
┌────────────────────────────────────────────────────────────────────┐
│ EUR/USD · sincronizado · [−] [−] [＋ añadir tiempo]              │
├────────────────────────────────────────────────────────────────────┤
│ ┌───────────────[Tab 1d]────────┬───────────────[Tab 1h]────────┐ │
│ │            ╭──╮  ╱╲         │ │       ╭──╮   ╱╲             │ │
│ │          ╭─╯  ╰─╮╱  ╲      │ │     ╭─╯  ╰─╮ ╱  ╲           │ │
│ │          │       ╲    ╲     │ │     │      │╱    ╲          │ │
│ │   crosshair sincronizado ────┼──────┼────────────────┬────  │ │
│ └──────────────────────────────┴──────────────────────────────┘ │
│ ────────────────────── [Tab 5m] ──────────────────────────────── │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │      ╱╲      ╭─╮   ╱╲        ╭──╮      ╱ ╲                  │ │
│ │     ╱  ╲    ╭─╯ ╰─╮╱  ╲   ╭──╯  ╰──╮ ╱   ╲                 │ │
│ │   (misma ventana temporal, mêmes datos fuente 1s)            │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ 🎯 05-03 14:00 UTC · 1d: C 1.08880 · 1h: C 1.08885 · 5m: C 1.08882 │
└────────────────────────────────────────────────────────────────────┘
```

## Estados
- **loading:** panes en skeleton; añadir deshabilitado hasta que el primero cargue
- **empty:** sin activo base → redirige a SCR-003 (no hay multigráfico sin datos)
- **error:** un pane falla → ese pane muestra retry individual; los demás siguen operando (aislamiento interno)
- **success:** hasta 3 panes sincronizados (crosshair/scroll comparten ventana temporal)
- **partial:** pane con cobertura menor (activo recién descargado con rango corto en un TF) → pane operativo con aviso de cobertura

## Componentes usados
- ChartPane (sync), Tab, Button (icon)
- Select (timeframe por pane)

## Notas de accesibilidad
- Tabs con rol `tablist/tab/tabpanel` y flechas direccionales.
- Requisito clave: mismo eje temporal en los 3 panes (UTC, RNF-004) para que la sincronización sea exacta.
- Leyenda combinada bajo los panes da lectura textual de la posición del crosshair.