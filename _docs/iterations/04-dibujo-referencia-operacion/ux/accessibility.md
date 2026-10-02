# Accesibilidad — Ciclo 04 (Dibujo Referencia de Operación)

> Base: `_docs/iterations/03-mejoras-ux/ux/accessibility.md`.
> El nivel objetivo y el resto de compromisos **se heredan sin cambios**. Este ciclo añade
> los requisitos que nacen de una figura cuyo contenido son 5 cifras exactas.

## Nivel objetivo

WCAG 2.1 **AA** (app personal local, sin obligación legal; adoptado como buena práctica,
ADR-011).

## Checklist por pantalla

| Pantalla | Contraste | Navegación teclado | ARIA | Foco visible | Alt text | Nota |
|----------|-----------|---------------------|------|--------------|----------|------|
| SCR-001 | ✅ tokens AA | ✅ tabla y CTAs | ✅ | ✅ | N/A | Sin cambios (heredado) |
| SCR-002 | ✅ | ✅ formulario | ✅ progress/alert | ✅ | N/A | Sin cambios (heredado) |
| SCR-003 | ✅ | ✅ radios + selects | ✅ | ✅ | N/A | Sin cambios (heredado) |
| SCR-004 | ✅ **tokens de la operación medidos en los 2 fondos** | ⚠️ canvas asistido (**se mantiene la limitación**, ver abajo) | ✅ toolbars + **LiveRegion con valores** | ✅ | N/A | Popover `aria-expanded`; la operación **anuncia sus cifras** |
| SCR-005 | ✅ | ✅ tabs + toolbar | ✅ tablist | ✅ | N/A | Cada pane hereda SCR-004 |
| SCR-006 | ✅ | ✅ modal focus trap | ✅ dialog | ✅ | ✅ preview alt | Sin cambios (heredado) |

## Contrato nuevo: la operación se **escucha**

El canvas del overlay es `aria-hidden="true"`, así que las 5 etiquetas **no son accesibles
al lector de pantalla**. Para el resto de dibujos eso no importa (la información está en la
posición), pero aquí **el contenido son 5 precios exactos**: quien no ve el color no tiene
la información por otra vía.

**Requisito:** cada mutación de una operación se anuncia en `LiveRegion` (CMP-020,
`polite`) con los valores derivados:

| Evento | Anuncio |
|--------|---------|
| Crear | `Operación compra. Entrada 1.10000, SL 1.09500, TP 1.382 1.10691, TP 1.5 1.10750, TP 2 1.11000` |
| Crear (Short) | `Operación venta. Entrada 1.09500, SL 1.10000, TP 2 1.08500, …` |
| Mover/ajustar | Mismo formato con los valores **recalculados** |
| Entrada == SL | `Atención: entrada y SL coinciden; R = 0.` |
| Borrar | `Operación eliminada.` |

**Por qué no puede desincronizarse:** el texto se deriva de la **misma función pura** que
genera los niveles dibujados. No hay una segunda fuente de verdad.

## Requisitos específicos

Se heredan todos los del ciclo 03, y se añaden:

- **Herramienta "Operación":** `aria-label` y `title` = *"Operación: 2 clics (Entrada, SL)"*;
  `aria-pressed` cuando está activa. Su `aria-label` explica el número de clics, porque
  "Operación" a secas no dice que hacen falta dos.
- **Anuncio de valores en cada mutación** (ver contrato anterior), incluido el caso
  `zeroRisk`.
- **Preview:** al estar en `aria-hidden`, el preview en vivo no se anuncia en cada
  movimiento del ratón (sería ilegible). Se anuncia **al confirmar** el segundo clic.
- **Colores nunca solos:** los tres TP comparten `#26A69A` y se distinguen por el nombre de
  su etiqueta; SL, Entrada y TP tienen además texto (`SL`, `Entrada`, `TP 1.382`…). Cumple
  1.4.1 (Uso del color).
- **Etiquetas de 12px** (`font-small`): por encima del mínimo practiced, pero por debajo de
  los 14px de `font-body`. Se acepta porque el precio **también** está en el eje Y (derecha)
  a 5 decimales, así que hay una vía alternativa para leer el valor. **Limitación
  documentada.**
- **Targets:** los 2 handles mantienen el target ≥24 px heredado (CMP-018).
- **Contraste de la operación**, medido sobre los **dos** fondos reales:

| Color | Sobre chart `#0A0C10` | Sobre chip `#161B22` |
|-------|----------------------|---------------------|
| SL `#EF5350` | 5.61:1 ✅ | 4.96:1 ✅ |
| Entrada `#E6EDF3` | 16.56:1 ✅ | 14.64:1 ✅ |
| TP `#26A69A` | 6.53:1 ✅ | 5.77:1 ✅ |
| `textMuted` `#8B949E` (nombre) | 6.36:1 ✅ | 5.62:1 ✅ |

## Limitación conocida y su alcance

El ciclo 03 ya documenta que la manipulación directa de dibujos es una **"operación
asistida"**: la creación requiere ratón. **Este ciclo no cierra esa brecha**, y conviene
decir exactamente por qué importa más aquí:

- Para un `rect` o una `fib`, el ratón es un medio aceptable porque la información es
  **espacial**.
- Para la operación, el contenido son **cifras exactas**, y a zoom de 2 años
  (~1,2 px/pip) es imposible colocar el SL en `1.09500`. El usuario **tiene que hacer zoom**
  para colocar la entrada con precisión de pip.
- Tampoco hay ruta por teclado ni entrada numérica.

**Mitigación aplicada:** (1) los 5 decimales exactos siempre; (2) el precio también está en
el eje Y; (3) cada valor se anuncia en `LiveRegion`. **Pendiente:** un formulario numérico
de Entrada/SL. Está registrado en `user-journeys.md` §Brechas y en
`design-system.md` §7; **no se añade a este ciclo** porque ningún RF lo pide.

## Pruebas requeridas

Se heredan las del ciclo 03, y se añaden:

- [ ] Con la operación activa, **lector de pantalla** (NVDA/VoiceOver) anuncia los 5 valores
      al crear y al mover un handle.
- [ ] Contraste automatizado (axe-core) sobre `#0A0C10` y sobre `#161B22` con la operación
      visible, en Gráfico y en Multigráfico.
- [ ] Las 5 etiquetas **no se solapan** en el zoom de 2 años, y toda etiqueta desplazada
      muestra su línea guía.
- [ ] `aria-pressed` y `aria-label` correctos en el botón "Operación".
- [ ] Con los tres TP del mismo color, un usuario con daltonismo **distingue los niveles por
      su etiqueta** (no solo por color).
- [ ] La operación sigue siendo anunciable tras cambiar de hoja y volver (persistencia +
      `LiveRegion`).

## Regulaciones aplicables

Ninguna obligatoria (app personal local, sin PII). WCAG 2.1 AA como referencia voluntaria.
Sin cambios respecto al ciclo 03.