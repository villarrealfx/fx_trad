# SCR-004: Gráfico principal

- **Persona:** P-001
- **RF:** RF-401, RF-402, RF-403, RF-404, RF-405, RF-406, RF-407, RF-408, RF-410
  (+ RF-301…312 heredados del ciclo 04)
- **Journey:** J-011, J-012, J-013 (+ J-002 y J-009 extendidos; J-008, J-010 vigentes)
- **Prioridad:** Must
- **Cambio en el ciclo 05:** el gráfico deja de resetear la selección y de ser una jaula por
  timeframe. Se añaden el **selector de TF**, el **eje X en dos filas**, el **menú contextual de
  vela** y el **popover numérico** de Entrada/SL. La paleta de dibujo y la figura Operación **no
  cambian** (heredadas del ciclo 04).

## Wireframe (ASCII) — estado normal

```
┌────────────────────────────────────────────────────────────────────────────┐
│ EUR/USD   [1m][5m][◉15m][1h][4h][1d]   [◆ Indicadores] [⤓ Exportar] [⟲]    │
│ [✏️][▭][Φ][◎][▲][▼][🗑][↶][↷]      ← paleta heredada; "Operación" tras Φ    │
├────────────────────────────────────────────────────────────────────────────┤
│                                          ╎┌──────────────────────┐        │
│                                          ╎│ TP 2      1.11000   │        │
│                                          ╎└───────────┬──────────┘        │
│                                          ╎┌─────┴──────────────────┐      │
│                                          ╎│ TP 1.5    1.10750     │      │
│                                          ╎└───────────┬──────────┘      │
│                                          ╎┌───────────┴────────────────┐  │
│                                          ╎│ TP 1.382   1.10691        │  │
│                                          ╎└───────────┬────────────────┘  │
│ ● Entrada ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┌┴──────────────────────┐ │
│   ◆ handle SL                            │ Entrada  1.10000          │ │
│                                          └────────────────────────────┘ │
│                                          ╎┌───────────────────────────┐ │
│                                          ╎│ SL        1.09500        │ │
│                                          ╎└───────────────────────────┘ │
│         └───┬──────┬──────┬──────┬──────┬──────┬──────┬──────────┬──     │
│          18-nov-25   18-nov-25   18-nov-25   18-nov-25   18-nov-25  ← fila fecha
│           00:00        00:15       00:30       00:45       01:00    ← fila hora
│ 🎯 18-nov-25 00:15 UTC  O 1.10000  H 1.10300  L 1.09850  C 1.10120      │
└────────────────────────────────────────────────────────────────────────────┘
```

## Wireframe (ASCII) — menú contextual de vela (CMP-024)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ EUR/USD   [1m][5m][◉15m][1h][4h][1d]   [◆ Indicadores] [⤓ Exportar] [⟲]    │
├────────────────────────────────────────────────────────────────────────────┤
│                        ┌──────────────────────────────┐                    │
│                        │ 18-nov-25 · 00:15            │  ← foco atrapado   │
│   ┈┈┈┈┈┈┈┈ Entrada ┈┈┈ │ O 1.10000    H 1.10300       │                    │
│   ┈┈┈┈┈┈┈┈ SL ┈┈┈┈┈┈┈ │ L 1.09850    C 1.10120       │                    │
│                        └──────────────────────────────┘                    │
│         └───┬──────┬──────┬──────┬──────┬──────┬──────┬──────────┬──       │
│          18-nov-25   18-nov-25   18-nov-25   18-nov-25   18-nov-25         │
│           00:00        00:15       00:30       00:45       01:00           │
│ 🎯 18-nov-25 00:15 UTC  O 1.10000  H 1.10300  L 1.09850  C 1.10120         │
└────────────────────────────────────────────────────────────────────────────┘
```

## Wireframe (ASCII) — popover numérico de Entrada/SL (CMP-025)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ EUR/USD   [1m][5m][◉15m][1h][4h][1d]   [◆ Indicadores] [⤓ Exportar] [⟲]    │
├────────────────────────────────────────────────────────────────────────────┤
│                     ┌───────────────────────────────┐                      │
│   ● Entrada ┈┈┈┈┈┈┈┈│ Precios de la operación       │  ← anclado a la      │
│                     │ Entrada [1.10000        ]     │    figura seleccionada│
│   ◆ SL ┈┈┈┈┈┈┈┈┈┈┈┈│ Stop Loss [1.09500      ]     │                      │
│                     │ [ Aplicar ]  [ Cancelar ]     │                      │
│                     └───────────────────────────────┘                      │
│         └───┬──────┬──────┬──────┬──────┬──────┬──────┬──────────┬──       │
│          18-nov-25   18-nov-25   18-nov-25   18-nov-25   18-nov-25         │
│           00:00        00:15       00:30       00:45       01:00           │
│ 🎯 18-nov-25 00:15 UTC  O 1.10000  H 1.10300  L 1.09850  C 1.10120         │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Selector de TF (`CMP-023`)** en `ChartHeader`, a la izquierda de Indicadores: `radiogroup`
  con un único TF activo, valores de `TIMEFRAMES` (`1m, 5m, 15m, 1h, 4h, 1d`).
- **Eje X (`RF-407`, D-19)**: una fila con `{día} {HH:mm}` (`AXIS_TOKENS.xFormat`, p. ej. `1
  00:15`) sobre el **eje nativo**, que conserva el arrastre/zoom. La franja se mantiene en 28 px y
  el canvas no cede alto. *(Se descartó el eje de dos filas: rompía la manipulación del eje y la
  precisión/edición de los dibujos.)*
- **Menú contextual (`CMP-024`)**: clic derecho sobre una vela. **No sustituye** la leyenda
  inferior `🎯`: la leyenda sigue la posición del cursor, el menú **fija** una vela.
- **Popover numérico (`CMP-025`)**: con una figura seleccionada, botón «Precios» (o doble clic
  sobre la etiqueta de un nivel). Dos campos con la precisión del activo (5 decimales).
- **Los dibujos no se mueven al cambiar de TF**: su ancla es `(tiempo, precio)` (ADR-027).

## Estados

- **loading:** *(heredado)* skeleton de velas; toolbar y selector de TF deshabilitados.
- **empty:** *(heredado)* sin datos en el rango → overlay "Sin datos en este periodo".
- **error:** *(heredado)* fallo de serie → banner + "Reintentar"; la figura y la selección se
  conservan intactas.
- **success:** *(heredado)* velas + ejes. **Cambia en el ciclo 05:** el eje X se dibuja en dos
  filas y el TF activo aparece marcado en el selector.
- **partial:** *(modificado, RF-402)* el aviso «La cobertura disponible es menor al rango
  solicitado» aparece **solo** si faltan velas dentro del rango pedido; si el desfase es el
  redondeo al bucket del TF o un hueco de mercado fuera del rango, **no hay aviso**.
- **`switching-tf` (nuevo):** cambio de TF en curso → skeleton de velas conservando los dibujos
  en pantalla; el selector marca el TF destino y queda deshabilitado hasta terminar.
- **`pending` / `zeroRisk` / `selected`:** *(heredados del ciclo 04, sin cambios)* preview en
  vivo, riesgo nulo y figura seleccionada con handles y contorno.
- **`context-open` (nuevo):** menú de vela abierto → foco dentro del panel; `Escape` o clic fuera
  lo cierran y devuelven el foco al gráfico.
- **`editing-prices` (nuevo):** popover numérico abierto → primer campo enfocado; valores
  inválidos marcan el campo en rojo **inline** (nunca en alert) y bloquean «Aplicar».

## Interacciones críticas

- **Cambiar de TF:** clic en `CMP-023` → serie nueva + indicadores recalculados + selección
  persistida. Los dibujos permanecen; `Escape` no aplica (no es destructivo).
- **Retomar la sesión:** al entrar en `/chart` sin query, se hidrata la selección persistida
  (ADR-028); un query explícito gana siempre.
- **Menú de vela:** clic derecho sobre una vela; flechas ↑/↓ no aplican (una sola vela);
  `Escape`/clic fuera cierran.
- **Precios numéricos:** `Enter` aplica, `Escape` cancela, `Tab` pasa de Entrada a SL; la
  mutación pasa por el command stack (`Ctrl+Z` la revierte) y se anuncia en `LiveRegion`.
- **Crear/seleccionar/editar la operación:** sin cambios respecto al ciclo 04.
- **Persistencia:** automática en el **documento v2 del activo**; sin campos nuevos por TF
  (ADR-027, ADR-028).

## Componentes usados

ChartHeader (**+ CMP-023 TimeframeSelector**), ChartToolbar, DrawTool (`operación`), ChartPane
(variante `single`; **se retira `sync`**), OverlayCanvas (`OperationDrawing`, `OperationLabels`),
DrawingHandle, EditableDrawing, LiveRegion, Button, Input (**+ CMP-025**),
**CMP-024 CandleContextMenu**.

## Notas de accesibilidad

- Las heredadas del ciclo 04 se mantienen: `aria-pressed` en la herramienta, valores anunciados en
  `LiveRegion`, color nunca como único portador de información.
- **Selector de TF:** `role="radiogroup"` con `aria-label="Timeframe"`; cada opción es un
  `radio` con `aria-checked`; se recorre con flechas ←/→ y `Home`/`End`.
- **Menú contextual:** `role="dialog"` con `aria-label="Datos de la vela"`; foco al abrir, foco
  devuelto al gráfico al cerrar, `Escape` cierra.
- **Popover numérico:** dos `input` con `label` visible (no solo placeholder) y `inputMode`
  decimal; error inline con `role="alert"` asociado al campo; el foco vuelve a la figura al
  cerrar.
- **Eje en dos filas:** al ser canvas (`aria-hidden`), la fecha y la hora siguen disponibles por
  la leyenda inferior y por el menú contextual de vela.
- **Targets:** el selector de TF mide **≥44×32 px** y las opciones del menú mantienen un alto de
  fila ≥24 px. El criterio aplicable al nivel **AA** es WCAG 2.5.8 (≥24×24); 2.5.5 (44×44) es
  **AAA** y no aplica (corrección en TASK-UI-402); los handles mantienen ≥24 px (heredado).
