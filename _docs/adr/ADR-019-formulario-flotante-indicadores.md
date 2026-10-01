# ADR-019: Formulario flotante de indicadores y supresión del panel inferior

- **Fecha:** 2026-09-29
- **Estado:** Aceptado (2026-09-29, cierre del ciclo 03)
- **Decisores:** Arquitecto, Tech Lead
- **Requisitos vinculados:** RF-201, RF-202, RF-203, RF-205

## Contexto

El MVP carga indicadores por defecto y dedica un **panel inferior fijo** en
SCR-004, robando espacio vertical al gráfico. El ciclo 03 exige: no cargar
indicadores por defecto, eliminar el panel inferior, ampliar el área del gráfico
(pantalla completa horizontal y vertical), y concentrar la gestión de indicadores
y la exportación en el **header** mediante un **formulario flotante** que se abre
y cierra liberando el espacio (RF-203). El formulario debe permitir
mostrar/ocultar, configurar y eliminar cada indicador, y persistir su estado al
cerrar (ver ADR-018).

## Decisión

Reemplazar el `IndicatorPanel` inferior por un **formulario flotante (popover)** no
modal, disparado por un botón en el **header** del gráfico; el botón de exportar
se ubica junto a él. El cierre del formulario **no** elimina indicadores: libera
el espacio y mantiene la configuración.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Formulario flotante (popover) no modal | Libera espacio; permite ver el gráfico al configurar | Requiere gestión de foco/escape | **Elegido**: RF-203, RF-202 |
| Modal con focus trap | Accesibilidad simple | Tapa el gráfico; menos fluido para ajustar | Contradice "fluido"/RF-202 |
| Panel lateral colapsable | Más densidad | Sigue ocupando área horizontal | No cumple "pantalla completa" |
| Mantener panel inferior (status quo) | Cero cambio | No cumple RF-202/203 | No satisface requisitos |

## Consecuencias

### Positivas
- El área del gráfico gana el espacio del panel (RF-202).
- Gestión de indicadores y export agrupadas en el header (RF-203, RF-205).
- Indicadores sin carga por defecto (RF-201).

### Negativas / Trade-offs
- El popover no modal exige pautas de foco (Escape cierra, foco no se pierde) para
  mantener WCAG 2.1 AA (`_docs/ux/accessibility.md`).

### Neutras
- Los indicadores existentes (RSI, ATR, MM) se conservan; solo cambia su gestión.

## Referencias

- RF-201, RF-202, RF-203, RF-205
- `_docs/iterations/01-mvp/ux/wireframes/SCR-004-grafico-principal.md`
- ADR-011 (accesibilidad)
