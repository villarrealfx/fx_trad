# SCR-004: Gráfico principal

- **Persona:** P-001
- **RF:** RF-201…RF-213 (indicadores, panel flotante, persistencia, export, ejes, marcas, colores, Shift, edición)
- **Journey:** J-002, J-003, J-004, J-006, J-007
- **Prioridad:** Must

## Wireframe (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ EUR/USD · 1h · 2026-01→08     [◆ Indicadores] [⤓ Exportar] [⟲ Ajustar]   │
│ [✏️ línea][▭ rect][fib][📈 compra][📉 venta][🗑 borrar][↶ undo][↷ redo]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                          ┤ 1.08910       │
│            ╭──╮                                          ┤ 1.08880       │
│         ╭──╯  ╰──╮   ╭─╮         ╭──╮                    ┤ 1.08850       │
│      ╭──╯        ╰─╮╱   ╲   ╭──╮╱    ╲   ▭ #D6C7AE      ┤ 1.08820       │
│     │   ◆ handle   │     │  │  ╰──╮       fib #DDB2AC   ┤ 1.08790       │
│    ▲ B(bajo mín.)           ▼ (sobre máx.)              ┤ 1.08760       │
│                                                          ┤ 1.08730       │
│         └─┬────────┬────────┬────────┬────────┬────────┬────────┬──    │
│     1 00:00    00:15    00:30    00:45    24:00    24:45   2 00:00     │
│ 🎯 05-03 14:00 UTC  O 1.08720  H 1.08910  L 1.08650  C 1.08880        │
└──────────────────────────────────────────────────────────────────────────┘
   ┌──────────────── Formulario flotante [✕] ────────────────┐
   │ ＋ Añadir indicador ▼  │ MA20 ● mostrar ⚙ eliminar       │
   │                        │ RSI(14) ○ ocultar ⚙ eliminar    │
   └──────────────────────────────────────────────────────────┘
```

- **Eje Y (precios):** lado **derecho**, 5 decimales (`1.95444`) — RF-207.
- **Eje X (tiempo):** `{día} {HH:mm}` (marcas cada 15 m; cambio de día resaltado) — RF-206.
- **Indicadores:** ninguno por defecto; se agregan desde el header (RF-201/203).
- **Marcas compra/venta:** fuera del rango de la vela, a 10 pips (`0.0001`/`0.01`) — RF-208.
- **Dibujos:** editables (mover/redimensionar), con handles; undo/redo — RF-212/213.

## Estados
- **loading:** skeleton de velas; toolbar deshabilitada.
- **empty:** sin datos en el rango → overlay "Sin datos en este periodo" + volver a SCR-003.
- **error:** fallo de serie → banner + "Reintentar"; estado del chart intacto.
- **success:** velas renderizadas; ejes, indicadores, dibujos y pan/zoom a 60 FPS.
- **partial:** gaps legítimos (feriado/weekend) removidos; aviso discreto si el rango recorta cobertura.

## Interacciones críticas
- Zoom/pan por `lightweight-charts` (ADR-005); edición por overlay custom (ADR-017).
- Herramienta activa con `aria-pressed`; edición por arrastre de handle (target ≥24px).
- Undo/redo: `Ctrl+Z` / `Ctrl+Shift+Z` (o botones ↶/↷).
- Marcadores: se crean fuera de la vela (ver offsets) y son editables/borrables.
- Indicadores: formulario flotante no modal; `Escape` cierra; los indicadores persisten.
- Config (activo, timeframe, indicadores, dibujos) persistida por activo+timeframe (ADR-018).

## Componentes usados
- ChartHeader, IndicatorForm, ChartPane, OverlayCanvas, ChartToolbar, DrawTool, Button, StatusBanner.

## Notas de accesibilidad
- Toolbar 100% por teclado; herramientas con `aria-pressed`.
- Zoom por teclado `+`/`-`; `1` ajusta la vista.
- Leyenda OHLC como texto (el canvas no es accesible); estado de edición anunciado.
- Popover no modal: `aria-expanded` en el botón; foco no se pierde; `Escape` cierra.
- Los colores de dibujo se acompañan de forma/estilo (no solo color).
