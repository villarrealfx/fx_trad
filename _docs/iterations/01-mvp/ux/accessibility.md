# Accesibilidad

## Nivel objetivo
WCAG 2.1 **AA** (monousuario local, sin obligación legal, aplicado como buena práctica con costo ~0).

## Checklist por pantalla

| Pantalla | Contraste | Navegación teclado | ARIA | Foco visible | Alt text | Nota |
|----------|-----------|---------------------|------|--------------|----------|------|
| SCR-001 | ✅ tokens AA | ✅ tabla y CTAs | ✅ | ✅ | N/A (sin img informativa) | Badges con texto además de color |
| SCR-002 | ✅ | ✅ formulario completo | ✅ progress/alert | ✅ | N/A | Errores inline por campo |
| SCR-003 | ✅ | ✅ radios + selects | ✅ | ✅ | N/A | Validación rango anunciada |
| SCR-004 | ✅ (velas) | ⚠️ canvas limitado → toolbar 100% por teclado + atajos +/−/1 | ✅ toolbars, legend text | ✅ | N/A (canvas decorativo; datos en leyenda textual) | Crosshair duplica datos en texto |
| SCR-005 | ✅ | ✅ tabs + toolbar | ✅ tablist | ✅ | N/A | Leyenda combinada textual |
| SCR-006 | ✅ | ✅ modal focus trap | ✅ dialog | ✅ | ✅ preview alt | Escape cierra |

## Requisitos específicos

- Todo input/select tiene `<label>` asociado (F003).
- Todo botón tiene texto visible o `aria-label` (ARIA y 4.1.2).
- Errores de validación: `role="alert"` + foco dirigido al campo en error (3.3.1/3.3.3).
- Progreso de descarga: `role="progressbar"` con `aria-valuenow` (SCR-002) y región `aria-live`.
- Modal: focus trap (no pierde foco), foco inicial al título, restaura foco al disparar el modal al cerrar (2.4.3).
- Tabs (SCR-005) con patrón WAI-ARIA `tablist/tab/tabpanel`, flechas direccionales.
- Herramientas de dibujo activas con `aria-pressed`; leyenda OHLC del crosshair disponible como texto (el canvas no es accesible).
- El chart se puede operar completamente por atajos de teclado alternativos: `+`/`-` = zoom en cursor, `1` = ajustar toda la serie (hoyo del canvas puro: CC/pan/trazo de dibujos con mouse quedan como operación asistida, se documenta como limitación conocida AA para contenido complejo).
- Contraste mínimo 4.5:1 texto normal / 3:1 texto grande — cumplido por los tokens de `design-system.md`.
- Tamaño mínimo de target táctil: **no aplica** (desktop mouse-first, RNF-005); targets ≥ 24px con espaciado 8px entre icon-tools.

## Pruebas requeridas

- [ ] Navegación completa con Tab sin mouse (SCR-001…SCR-003, SCR-005, SCR-006).
- [ ] Lector de pantalla (NVDA en Linux/Windows) en formularios y modal.
- [ ] Zoom 200% sin pérdida de funcionalidad (desktop).
- [ ] Contraste con herramienta automatizada (axe-core / Lighthouse) en CI.
- [ ] Flujo de errores: campo lleno inválido ⇒ mensaje + foco; descarga fallida ⇒ retry.
- [ ] Preferencias `prefers-reduced-motion`: transiciones/animaciones deshabilitadas.

## Regulaciones aplicables

- Ninguna obligatoria (app personal local, sin PII). Se adopta WCAG 2.1 AA como referencia voluntaria; sin implicación ADA/Section 508/EN 301 549.