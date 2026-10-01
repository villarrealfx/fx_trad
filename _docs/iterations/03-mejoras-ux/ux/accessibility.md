# Accesibilidad — Ciclo 03

> Base: `_docs/iterations/01-mvp/ux/accessibility.md`.

## Nivel objetivo

WCAG 2.1 **AA** (app personal local, sin obligación legal; adoptado como buena práctica, ADR-011).

## Checklist por pantalla

| Pantalla | Contraste | Navegación teclado | ARIA | Foco visible | Alt text | Nota |
|----------|-----------|---------------------|------|--------------|----------|------|
| SCR-001 | ✅ tokens AA | ✅ tabla y CTAs | ✅ | ✅ | N/A | Badge con texto además de color |
| SCR-002 | ✅ | ✅ formulario | ✅ progress/alert | ✅ | N/A | Errores inline; tabla con **Activo** |
| SCR-003 | ✅ | ✅ radios + selects | ✅ | ✅ | N/A | Sin `1s`; validación anunciada |
| SCR-004 | ✅ | ⚠️ canvas asistido | ✅ toolbars/popover | ✅ | N/A | Popover `aria-expanded`; edición por arrastre |
| SCR-005 | ✅ | ✅ tabs + toolbar | ✅ tablist | ✅ | N/A | Cada pane hereda SCR-004 |
| SCR-006 | ✅ | ✅ modal focus trap | ✅ dialog | ✅ | ✅ preview alt | `Escape` cierra |

## Requisitos específicos

- Todo input/select con `<label>` asociado.
- Todo botón con texto visible o `aria-label`.
- Errores de validación: `role="alert"` + foco al campo en error.
- Progreso de descarga: `role="progressbar"` + `aria-valuenow`; estado por `aria-live`.
- **IndicatorForm (nuevo):** popover **no modal**; el botón del header usa `aria-expanded`;
  `Escape` cierra; el foco no se pierde; al cerrar, los indicadores persisten.
- **Edición de dibujos (nuevo):** handles con target ≥24px; cada operación (mover, redimensionar,
  undo/redo) anunciada en una región `aria-live`; colores acompañados de forma/etiqueta.
- **Undo/redo:** atajos `Ctrl+Z` / `Ctrl+Shift+Z` y botones accesibles con `aria-label`.
- **Ejes:** la escala de precios (derecha) admite la leyenda OHLC textual como alternativa accesible.
- Herramientas de dibujo activas con `aria-pressed`.
- El chart se opera por atajos alternativos: `+`/`-` (zoom), `1` (ajustar vista). La
  manipulación directa de dibujos con mouse queda como operación asistida (limitación conocida
  AA para contenido complejo, documentada).
- Contraste mínimo 4.5:1 texto / 3:1 no textual.
- Tamaño mínimo de target: desktop mouse-first (RNF-005); targets ≥24px con 8px de espaciado.

## Pruebas requeridas

- [ ] Navegación completa con Tab sin mouse (SCR-001…003, SCR-005, SCR-006).
- [ ] Navegación del header y del popover de indicadores por teclado (SCR-004).
- [ ] Lector de pantalla (NVDA/VoiceOver) en formularios, popover y modal.
- [ ] Zoom 200% sin pérdida de funcionalidad.
- [ ] Contraste con herramienta automatizada (axe-core / Lighthouse) en CI.
- [ ] `prefers-reduced-motion`: transiciones/animaciones deshabilitadas.

## Regulaciones aplicables

- Ninguna obligatoria (app personal local, sin PII). WCAG 2.1 AA como referencia voluntaria.
