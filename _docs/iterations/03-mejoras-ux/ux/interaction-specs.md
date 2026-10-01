# Especificaciones de Interacción — Ciclo 03

> Estados obligatorios por pantalla: loading, empty, error, success, partial.
> Transiciones globales: 200ms, ease-out; respetar `prefers-reduced-motion`.
> Base: `_docs/iterations/01-mvp/ux/interaction-specs.md` (evolucionado).

## SCR-001: Biblioteca de activos

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Montaje / refetch de `GET /assets` | Skeleton de filas; appbar estable | Hasta respuesta |
| empty | Sin activos | Ilustración + CTA "Descargar mi primer activo" → SCR-002 | persistente |
| error | Fallo de `GET /assets` | StatusBanner error + "Reintentar" | persistente |
| success | Datos OK | Tabla con cobertura y estado por activo | — |
| partial | Fila con descarga en curso/fallida | Badge `parcial` en fila; resto operativo | vivo |

## SCR-002: Descarga de datos

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | "Iniciar descarga" | Form deshabilitado; ProgressBar; tarea asíncrona; usuario navega | Hasta estado final |
| empty | Sin historial | Bloque Historial oculto | — |
| error | Descarga falla / campo inválido | Error inline + fila `fallo` + banner "Reintentar" | persistente |
| success | Descarga completa | Banner éxito + fila con **activo** y filas | auto-dismiss 5s |
| partial | Descarga cortada/limitada | Estado `parcial` + rango cubierto + sugerencia faltante | persistente |

## SCR-003: Abrir gráfico

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Montaje (cobertura) | Skeleton del selector | Hasta respuesta |
| empty | Biblioteca sin activos | Mensaje + CTA a SCR-002; Abrir deshabilitado | persistente |
| error | Fallo al leer cobertura | Banner + reintentar; valores previos preservados | persistente |
| success | Cobertura OK + rango válido | Habilita → navega a SCR-004 | 200ms |
| partial | Cobertura discontinua | Aviso del rango útil exacto | — |

> El selector de timeframe **no** ofrece `1s` (RF-219, ADR-020).

## SCR-004: Gráfico principal

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Abrir gráfico | Skeleton de velas; toolbar deshabilitada | Hasta carga |
| empty | Sin datos en rango | Overlay "Sin datos en este periodo" + volver a SCR-003 | persistente |
| error | Fallo de serie | Banner + "Reintentar"; estado del chart intacto | persistente |
| success | Datos OK | Velas + ejes (X `{día} {HH:mm}`, Y 5 dec. derecha); 60 FPS | — |
| partial | Gaps legítimos removidos | Velas continuas; aviso de cobertura recortada | — |

### Interacciones nuevas del ciclo 03

| Interacción | Disparador | Comportamiento |
|-------------|------------|----------------|
| Abrir indicadores | Botón "◆ Indicadores" (header) | Abre `IndicatorForm` (popover no modal); `aria-expanded=true` |
| Agregar indicador | "＋ Añadir" en el formulario | Añade desde catálogo existente (RSI/ATR/MM); sin carga por defecto |
| Mostrar/ocultar | Toggle por indicador | Alterna visibilidad sin eliminar |
| Configurar | "⚙" por indicador | Edita parámetros (MA/RSI/ATR) |
| Eliminar | "eliminar" por indicador | Quita el indicador del gráfico |
| Cerrar formulario | "✕" / `Escape` | Libera el espacio; los indicadores persisten (RF-203) |
| Mover dibujo | Arrastrar cuerpo del dibujo | Desplaza el dibujo; pasa por command stack |
| Redimensionar | Arrastrar handle | Ajusta extremos/vértices |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Shift+Z` o botones ↶/↷ | Revierte/reaplica la última operación de dibujo |
| Marca compra/venta | Herramienta + clic | Inserta el triángulo fuera de la vela (10 pips) |
| Persistir/restaurar | Cambio de hoja / recarga | Guarda y restaura por activo+timeframe (ADR-018) |

## SCR-005: Multigráfico sincronizado

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Montaje | Panes en skeleton; "añadir" deshabilitado hasta el primer pane | Hasta primer carga |
| empty | Sin activo base | Redirige a SCR-003 | — |
| error | Pane falla | Retry individual; otros operan | persistente |
| success | Panes OK (≤3) | Crosshair/scroll sincronizados (UTC) | — |
| partial | Pane con cobertura reducida | Operativo + aviso de cobertura | — |

## SCR-006: Exportar imagen

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Confirmar export | Spinner en preview; descargar deshabilitado; `toBlob` | Hasta blob |
| empty | Canvas sin contenido | Botón deshabilitado + "No hay gráfico que exportar" | — |
| error | Blob falla | Banner inline "No se pudo generar la imagen" + reintentar | persistente |
| success | Blob OK | Descarga disparada; modal cierra; Toast éxito | 200ms |
| partial | Pane sin datos en export multi | Exporta lo visible; avisa lo excluido | — |

## Transiciones globales

- Duración estándar 200ms · Easing ease-out.
- Popover: entrada/salida 150ms; sin animación si `prefers-reduced-motion`.
- Spinners: en descargas largas, jamás timeout visual; progreso determinista.
