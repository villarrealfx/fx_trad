# SCR-004: Gráfico principal

- **Persona:** P-001
- **RF:** RF-009, RF-010, RF-011, RF-012, RF-013 (zoom/pan/velas/dibujo/compra-venta/indicadores)
- **Journey:** J-002, J-003, J-004
- **Prioridad:** Must

## Wireframe (ASCII)

```
┌────────────────────────────────────────────────────────────────────┐
│ EUR/USD · 1h · 2026-01→08             [🔍⌖] [⟲ Ajustar]  [⊕ 3max] │
│ [✏️ línea] [▭ rect] [fib] [📈 compra] [📉 venta] [🗑 borrar]      │
│ ── Indicadores: [＋ añadir]  MA20 ●  MA50 ●  RSI(14) ⚪  ATR(14) ⚪ │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │          2026-02      2026-03      2026-04      2026-05       │ │
│ │       │         │         │         │         │         │     │ │
│ │          ╭──╮      ╱╲       ╭─╮            ╭──╮              │ │
│ │       ╭──╯  ╰──╮ ╱  ╲   ╭─╯ ╰─╮      ╭──╮╱    ╲            │ │
│ │       │        │╱    ╲  │       │      │  ╰──╮              │ │
│ │      ╱│        │      ╲ │       │     │     │               │ │
│ │       B ▲compra          ▼venta      ⟲ escrol/zoom            │ │
│ │  ──────────────────────── MA20 ───────────────────────────      │ │
│ │   ··· fib ··· 0.618 ··· 0.5 ··· 0.382 ···                       │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ 🎯 05-03 14:00 UTC  O 1.08720  H 1.08910  L 1.08650  C 1.08880  │
├────────────────────────────────────────────────────────────────────┤
│ [Exportar PNG]  ·  leyenda de indicadores activos                  │
└────────────────────────────────────────────────────────────────────┘
```

## Estados
- **loading:** skeleton de pánel de velas y toolbar deshabilitado; crosshair inactivo
- **empty:** sin datos en el rango seleccionado → overlay "Sin datos en este periodo" + CTA volver a SCR-003
- **error:** fallo de carga de la serie → banner con "Reintentar"; estado global del chart intacto
- **success:** velas renderizadas a 60 FPS (KPI-2); zoom/pan/crosshair operativos
- **partial:** rango con huecos internos (gaps legítimos por feriado/weekend removidos, RF-004) → velas continuas sin filas fantasma; aviso discreto si el rango pedido recorta la cobertura disponible

## Componentes usados
- ChartPane (wrapper lightweight-charts)
- ChartToolbar (draw tools, indicators, zoom-fit)
- Button (icon, primary), Select (indicador)
- StatusBanner

## Notas de accesibilidad
- Toolbar operativa por teclado; herramientas con `aria-pressed` (tool activa).
- Zoom alterno por teclado: `+`/`-` (zoom en cursor), `1` (ajustar vista) — indica que el canvas no es la única vía.
- Crosshair con valores mostrados también como texto estático accesible (leyenda OHLC).
- Contraste de velas asegura distinción up/down además del color (sombra/grosor por convención de `lightweight-charts`).
- Objetivo rendimiento: pan/zoom no debe bloquear el hilo principal (RNF-001, KPI-2).