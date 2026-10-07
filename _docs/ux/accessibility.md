# Accesibilidad — Ciclo 05 (Mejoras UX del Gráfico y Cierre de Deuda)

> Base: `_docs/iterations/04-dibujo-referencia-operacion/ux/accessibility.md`.
> El nivel objetivo y los compromisos heredados se mantienen. Este ciclo **cierra** la brecha de
> entrada numérica que el ciclo 04 dejó documentada (RF-410) y añade tres componentes interactivos
> nuevos: selector de timeframe, menú contextual de vela y popover numérico.

## Nivel objetivo

WCAG 2.1 **AA** (app personal local, sin obligación legal; adoptado como buena práctica, ADR-011).

## Checklist por pantalla

| Pantalla | Contraste | Navegación teclado | ARIA | Foco visible | Alt text | Nota |
|----------|-----------|---------------------|------|--------------|----------|------|
| SCR-001 | ✅ tokens AA | ✅ tabla y CTAs | ✅ | ✅ | N/A | Sin cambios (heredado) |
| SCR-002 | ✅ | ✅ formulario | ✅ progress/alert | ✅ | N/A | Sin cambios (heredado) |
| SCR-003 | ✅ | ✅ radios + selects | ✅ | ✅ | N/A | Sin cambios (heredado) |
| SCR-004 | ✅ **incl. `color-draw-line` corregido a 5.25:1** | ✅ **mejora**: el precio exacto ya se fija por teclado (RF-410); crear la figura sigue requiriendo ratón | ✅ selector TF (`radiogroup`), menú (`dialog`), LiveRegion con valores | ✅ | N/A | Popover `aria-expanded`; `×3` paneles flotantes con foco gestionado |
| ~~SCR-005~~ | — | — | — | — | — | **Retirada** (RF-409, ADR-029) |
| SCR-006 | ✅ | ✅ modal focus trap | ✅ dialog | ✅ | ✅ preview alt | **Mantenida** (RF-411/D-18): cierra `RF-015` y está cubierta por tests |

## Contrato nuevo: el timeframe se anuncia y se recorre con el teclado

`CMP-023 TimeframeSelector` (RF-406):

- `role="radiogroup"` con `aria-label="Timeframe"`; cada opción es un `radio` con `aria-checked`.
- Se recorre con **flechas ←/→** y se salta al primero/último con `Home`/`End`.
- Al cambiar, el `LiveRegion` anuncia el TF nuevo y el estado de carga del gráfico
  (*"Timeframe 15 minutos. Cargando serie…"*), porque el cambio altera el contenido del canvas.
- Estado `disabled` mientras carga: se anuncia como no disponible, no se oculta.

## Contrato nuevo: el menú contextual de vela es operable y anunciable

`CMP-024 CandleContextMenu` (RF-408):

- `role="dialog"` con `aria-label="Datos de la vela"`; el contenido es **texto**, no canvas.
- Al abrir: el foco entra en el panel; al cerrar (`Escape`, clic fuera, cambio de TF) **vuelve al
  gráfico**.
- El dato se ofrece además por la leyenda inferior `🎯`, de modo que quien no use el ratón no
  pierde la información (el canvas sigue siendo `aria-hidden`).
- Si el panel se reposiciona, no cambia el orden del contenido.

## Contrato nuevo: el precio exacto se fija por teclado

`CMP-025 OperationNumericFields` (RF-410) **cierra** la brecha del ciclo 04:

- Dos `input` con **label visible** (`Entrada`, `Stop Loss`) — nunca solo placeholder.
- `inputMode` decimal; el valor se interpreta con la precisión del activo (5 decimales).
- Error **inline** con `role="alert"` asociado al campo; `Aplicar` deshabilitado si el valor no es
  válido. Ningún `alert()` del navegador.
- `Tab` pasa de Entrada a SL; `Enter` aplica; `Escape` cancela y **devuelve el foco a la figura**.
- La mutación se anuncia en `LiveRegion` con el mismo formato que las del canvas, así que el
  resultado es escuchable sin verlo.

## Contrato heredado: la operación se **escucha**

El canvas del overlay es `aria-hidden="true"`, así que las etiquetas **no** son accesibles al
lector de pantalla; cada mutación se anuncia en `LiveRegion` (CMP-020, `polite`) con los valores
derivados:

| Evento | Anuncio |
|--------|---------|
| Crear | `Operación compra. Entrada 1.10000, SL 1.09500, TP 1.382 1.10691, TP 1.5 1.10750, TP 2 1.11000` |
| Mover/ajustar | Mismo formato con los valores **recalculados** |
| **Editar por teclado (nuevo)** | Mismo formato, tras `Enter` en `CMP-025` |
| Entrada == SL | `Atención: entrada y SL coinciden; R = 0.` |
| Borrar | `Operación eliminada.` |

El texto se deriva de la **misma función pura** que genera los niveles dibujados: no hay una
segunda fuente de verdad.

## Contraste verificado (tokens del ciclo)

Medido en código con `frontend/src/styles/contrast.ts` sobre los fondos reales:

| Color | Sobre chart `#0A0C10` | Sobre chip/panel `#161B22` |
|-------|----------------------|----------------------------|
| **`color-draw-line` `#7D8590` (corregido)** | **5.25:1 ✅ AA** (antes 3.16:1 ⚠️) | 4.64:1 ✅ AA |
| SL `#EF5350` | 5.61:1 ✅ | 4.96:1 ✅ |
| Entrada `#E6EDF3` | 16.56:1 ✅ | 14.64:1 ✅ |
| TP `#26A69A` | 6.53:1 ✅ | 5.77:1 ✅ |
| `textMuted` `#8B949E` (nombre) | 6.36:1 ✅ | 5.62:1 ✅ |
| `color-focus` `#58A6FF` (anillo) | 7.75:1 ✅ | 6.85:1 ✅ |

La corrección de `color-draw-line` (RNF-405) **elimina la única excepción de contraste** que el
ciclo 04 dejó registrada.

## Limitación conocida y su alcance

El ciclo 03 documentó que la manipulación directa de dibujos es una **"operación asistida"**: crear
la figura exige dos clics de ratón.

- **Lo que este ciclo cierra:** fijar **Entrada y SL con exactitud** (RF-410) ya no exige ratón ni
  zoom; hay ruta por teclado con 5 decimales y es reversible.
- **Lo que sigue abierto:** la **creación** inicial (dos anclas) y el ajuste por arrastre siguen
  siendo de ratón; el estado `zeroRisk` y el borrado ya tienen equivalente por teclado
  (`Delete`, `Ctrl+Z`).
- **Mitigación adicional del ciclo 05:** el menú contextual da el dato exacto de cualquier vela sin
  depender de la puntería del cursor.

## Pruebas requeridas

Se heredan las del ciclo 04 (con las referencias a Multigráfico retiradas) y se añaden:

- [ ] **Solo teclado (`Tab` sin ratón):** recorrer `CMP-023`, cambiar de TF con flechas, abrir y
      cerrar `CMP-024` y `CMP-025` con `Escape`, y comprobar que el foco vuelve al origen.
- [ ] **Lector de pantalla (NVDA/VoiceOver):** anuncia el TF al cambiarlo, anuncia los valores al
      crear/mover/editar la operación y lee el OHLC del menú contextual.
- [ ] **Contraste automatizado (axe-core)** sobre `#0A0C10` y `#161B22` con la operación visible,
      el menú abierto y el popover abierto.
- [ ] **`color-draw-line` `#7D8590`:** el test de contraste de tokens pasa con ≥4.5:1.
- [ ] **Zoom 200 %:** el eje X (una fila, D-19) no se solapa y el menú contextual sigue dentro del
      viewport.
- [ ] **Errores del popover numérico** con `role="alert"` asociado al campo y `Aplicar`
      deshabilitado.
- [ ] **`aria-checked`** correcto en el TF activo y `aria-pressed` en la herramienta Operación.

## Regulaciones aplicables

Ninguna obligatoria (app personal local, sin PII). WCAG 2.1 AA como referencia voluntaria.
Sin cambios respecto al ciclo 04.
