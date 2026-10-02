# SCR-004: Gráfico principal

- **Persona:** P-001
- **RF:** RF-301, RF-302, RF-303, RF-304, RF-305, RF-306, RF-307, RF-308, RF-309, RF-310,
  RF-311, RF-312 (+ RF-209 extendido por los colores semánticos)
- **Journey:** J-008, J-009, J-010 (extiende J-003, J-005)
- **Prioridad:** Must
- **Cambio en el ciclo 04:** nueva herramienta "Operación" y su figura de 5 niveles.
  El resto de la pantalla **no cambia** (heredado del ciclo 03).

## Wireframe (ASCII)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ EUR/USD · 1h  [◆ Indicadores] [⤓ Exportar] [⟲ Ajustar]                    │
│ [✏️][▭][Φ][◎][▲][▼][🗑][↶][↷]      ← "Operación" tras Fibonacci          │
├────────────────────────────────────────────────────────────────────────────┤
│  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│                                          ╎┌──────────────────────┐        │
│                                          ╎│ TP 2      1.11000   │        │
│                                          ╎└───────────┬──────────┘        │
│                                          ╎      ┌─────┘                  │
│                                          ╎┌─────┴──────────────────┐      │
│                                          ╎│ TP 1.5    1.10750     │      │
│                                          ╎└───────────┬──────────┘      │
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│                                          ╎┌───────────┴────────────────┐  │
│                                          ╎│ TP 1.382   1.10691        │  │
│                                          ╎└───────────┬────────────────┘  │
│                                          ╎      ┌─────┘                   │
│ ● Entrada ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┌┴──────────────────────┐ │
│          ╎                              │ Entrada  1.10000          │ │
│   ◆ handle SL                          └────────────────────────────┘ │
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│                                          ╎                             │
│                                          ╎┌───────────────────────────┐ │
│                                          ╎│ SL        1.09500        │ │
│                                          ╎└───────────────────────────┘ │
│         └───┬──────┬──────┬──────┬──────┬──────┬──────┬──────────┬──     │
│     1 00:00  00:15  00:30  00:45  24:00  24:45  2 00:00                │
│ 🎯 05-03 14:00 UTC  O 1.10000  H 1.10300  L 1.09850  C 1.10120          │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Las 5 líneas van de extremo a extremo** (decisión D-2): son niveles de precio, y para
  leer el desenlace (RF-312) tienen que cruzar toda la vista.
- **Etiquetas** a la derecha del 2º ancla, con separación mínima y **línea guía** (`╎┬┴┌┘`)
  en las desplazadas. En el caso peor (zoom de 2 años) los niveles caen a ~14 px y sin
  guía no se sabría qué etiqueta va con qué línea.
- **Orden de las etiquetas:** por precio de mayor a menor (TP 2, TP 1.5, TP 1.382, Entrada, SL).
- **Colores:** SL `#EF5350`, Entrada `#E6EDF3`, TP `#26A69A` (los tres TP comparten verde).
- **Handles:** ● Entrada y ◆ SL, target ≥24 px, `Shift` restringe H/V.

## Estados

- **loading:** *(heredado)* skeleton de velas; toolbar deshabilitada.
- **empty:** *(heredado)* sin datos en el rango → overlay "Sin datos en este periodo".
- **error:** *(heredado)* fallo de serie → banner + "Reintentar"; la figura y la selección
  se conservan intactas.
- **success:** *(heredado)* velas + ejes (X `{día} {HH:mm}`, Y 5 decimales a la derecha);
  operación con 5 niveles y etiquetas legibles; 60 FPS.
- **partial:** *(heredado)* gaps legítimos removidos; aviso de cobertura recortada.
- **`pending` (nuevo):** tras el 1er clic, preview en vivo de los 5 niveles siguiendo al
  ratón; solo-render (no seleccionable, no persistido). `Escape` anula.
- **`zeroRisk` (nuevo):** si `Entrada == SL` (R = 0), solo se dibujan SL y Entrada, se
  ocultan los 3 TP y la etiqueta indica `R = 0`. Sin marca persistida.
- **`selected` (nuevo):** figura seleccionada → handles visibles + contorno; `Delete` borra
  la figura completa; `Ctrl+Z` deshace.

## Interacciones críticas

- **Crear:** elegir `◎` → clic 1 (Entrada) → preview → clic 2 (SL). `Escape` cancela.
- **Dirección:** automática; los TP quedan siempre al lado correcto respecto a la Entrada.
- **Seleccionar:** clic sobre **cualquiera** de las 5 líneas selecciona la figura entera
  (radio por línea de 6 px, alineado con `fib`).
- **Editar:** arrastrar `●` o `◆` recalcula `R`, dirección y los 3 TP manteniendo la
  proporción. Arrastrar el cuerpo mueve la figura.
- **Deshacer/rehacer:** `Ctrl+Z` / `Ctrl+Shift+Z`, igual que el resto de dibujos.
- **Persistencia:** automática por activo+timeframe; sin campos nuevos (ADR-023).

## Componentes usados

ChartHeader, ChartToolbar, DrawTool (**+ variante `operación`**), ChartPane,
OverlayCanvas (**+ `OperationDrawing`**, **+ `OperationLabels`**), DrawingHandle,
EditableDrawing, LiveRegion, Button.

## Notas de accesibilidad

- La herramienta se anuncia como **"Operación: 2 clics (Entrada, SL)"** en `aria-label` y
  `title`; `aria-pressed` cuando está activa.
- El canvas es `aria-hidden`, así que las 5 etiquetas no las lee el lector de pantalla:
  **cada mutación se anuncia en `LiveRegion`** con los valores, p. ej.
  *"Operación compra. Entrada 1.10000, SL 1.09500, TP 1.382 1.10691, TP 1.5 1.10750, TP 2 1.11000"*.
- El estado `zeroRisk` se anuncia: *"Atención: entrada y SL coinciden; R = 0."*
- Los colores van **siempre** acompañados de etiqueta de texto: la información no depende
  solo del color (los tres TP comparten verde y se distinguen por su nombre).
- La creación exacta requiere ratón (limitación conocida, ver Brechas en `user-journeys.md`).