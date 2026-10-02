# SCR-005: Multigráfico sincronizado

- **Persona:** P-001
- **RF:** RF-310 (la operación está disponible en cada pane) + los RF heredados de SCR-004
- **Journey:** J-010, y extensión de J-005
- **Prioridad:** Should
- **Cambio en el ciclo 04:** **ninguna pantalla nueva**; cada pane hereda la herramienta y
  el contrato visual de SCR-004 sin trabajo adicional (mismo componente `ChartPane`).

## Wireframe (ASCII)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ EUR/USD · 1h  [◆ Indicadores] [⤓ Exportar]                                │
│ [✏️][▭][Φ][◎][▲][▼][🗑][↶][↷]      ← la misma paleta en CADA pane           │
├─────────────────────────────────────┬──────────────────────────────────────┤
│ ┌ pane 1 · 1h ────────────────────┐ │ ┌ pane 2 · 4h ────────────────────┐  │
│ │                        ┌──────┐│ │ │                        ┌──────┐│  │
│ │                        │TP 2  ││ │ │                        │TP 2  ││  │
│ │              ┌─────────┴──────┘│ │ │              ┌─────────┴──────┘│  │
│ │              │ ┌──────────────┐│ │ │              │ ┌──────────────┐│  │
│ │              │ │TP 1.5        ││ │ │              │ │TP 1.5        ││  │
│ │              │ └──────┬───────┘│ │ │              │ └──────┬───────┘│  │
│ │              │ ┌──────┴───────┐│ │ │              │ ┌──────┴───────┐│  │
│ │              │ │TP 1.382      ││ │ │              │ │TP 1.382      ││  │
│ │              │ └──────┬───────┘│ │ │              │ └──────┬───────┘│  │
│ │              │        ┌┴───────┐│ │ │              │        ┌┴───────┐│  │
│ │              │ │Entrada 1.10000││ │ │              │ │Entrada 1.10000││  │
│ │              │ └──────────────┘│ │ │              │ └──────────────┘│  │
│ │              │        ┌────────┐│ │ │              │        ┌────────┐│  │
│ │              │ │SL     1.09500││ │ │              │ │SL     1.09500││  │
│ │              │ └──────────────┘│ │ │              │ └──────────────┘│  │
│ │  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │ │  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │  │
│ │  1 00:00     00:15    00:30   │ │  1 00:00     00:15    00:30     │  │
│ └──────────────────────────────┘ │ └──────────────────────────────┘  │
├─────────────────────────────────────┴──────────────────────────────────────┤
│ [ + Añadir gráfico ]                                                       │
└────────────────────────────────────────────────────────────────────────────┘
```

- Cada pane es un `ChartPane` con su propia barra de herramientas: la herramienta
  `◎` está en todas (RF-310, D-7 de `plan.md`).
- Las etiquetas de un pane se posicionan con **su propio** mapeo de precio→píxel, así que
  la separación mínima (20 px) se cumple pane a pane, no de forma global.
- La figura es una por pane; la configuración persiste por activo+timeframe, así que cada
  pane conserva la suya al cambiar de hoja (RF-311).

## Estados

Idénticos a SCR-004 por pane (loading, empty, error, success, partial, `pending`,
`zeroRisk`, `selected`), más los propios del multigráfico heredados:

- **loading:** panes en skeleton; "añadir" deshabilitado hasta el primer pane.
- **error:** retry **individual** por pane; los demás siguen operativos.
- **partial:** pane con cobertura reducida → operativo + aviso de cobertura.

## Componentes usados

Tab, ChartHeader, ChartToolbar, DrawTool (**+ `operación`**), ChartPane (variante `sync`),
OverlayCanvas (**+ `OperationDrawing`**, **+ `OperationLabels`**), DrawingHandle, LiveRegion.

## Notas de accesibilidad

- Igual que SCR-004: `aria-pressed` en la herramienta, `LiveRegion` anuncia los valores de
  cada mutación, colores acompañados de etiqueta.
- El pane con la figura tiene un nombre accesible propio en el `tablist`, para que el
  lector de pantalla distinga de qué pane se trata el anuncio.