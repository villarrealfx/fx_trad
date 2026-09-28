# Especificaciones de Interacción

> Estados obligatorios por pantalla: loading, empty, error, success, partial.
> Transiciones globales: 200ms, ease-out; respetar `prefers-reduced-motion`.

## SCR-001: Biblioteca de activos

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Montaje / refetch | Skeleton de filas; appbar estable | Hasta respuesta |
| empty | Sin activos | Ilustración + CTA "Descargar mi primer activo" → SCR-002 | persistente |
| error | Fallo de catálogo | StatusBanner error + "Reintentar"; appbar operativa | persistente |
| success | Datos OK | Tabla con cobertura y estado por activo | — |
| partial | Fila con descarga en curso/fallida | Badge `parcial` en fila; resto operativo | vivo |

## SCR-002: Descarga de datos

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Click "Iniciar descarga" | Form deshabilitado, ProgressBar (1s UTC) en curso, tarea asíncrona (Celery): usuario sigue navegando | Hasta estado final |
| empty | Sin historial | Bloque historial oculto | — |
| error | Descarga falla / campo inválido | Error inline por campo + fila `fallo` en historial + banner "Reintentar" (preserva valores) | persistente |
| success | Descarga completa | Banner éxito + fila historial con filas obtenidas; estado de cobertura se propaga a SCR-001 | auto-dismiss 5s |
| partial | Descarga cortada/limitada | Estado `parcial` con rango cubierto detallado + sugerencia del rango faltante (incremental RF-006) | persistente |

## SCR-003: Abrir gráfico

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Montaje (lee cobertura de activos) | Skeleton del selector | Hasta respuesta |
| empty | Biblioteca sin activos | Mensaje + CTA a SCR-002; botón Abrir deshabilitado | persistente |
| error | Fallo al leer cobertura | Banner + reintentar; selección previa preservada | persistente |
| success | Cobertura OK + rango válido | Botón habilita → navega a SCR-004 | 200ms |
| partial | Cobertura discontinua / rango recalado | Aviso de límite útil exacto; validación inline | — |

## SCR-004: Gráfico principal

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Abrir gráfico | Skeleton de velas, toolbar deshabilitada | Hasta carga (KPI-3 < 2 s) |
| empty | Sin datos en rango | Overlay "Sin datos en este periodo" + volver a SCR-003 | persistente |
| error | Fallo de serie | Banner + "Reintentar"; estado del chart intacto | persistente |
| success | Datos OK | Velas renderizadas; zoom/pan/crosshair 60 FPS (KPI-2) | — |
| partial | Huecos/gaps internos removidos | Velas continuas sin filas fantasma; aviso discreto de cobertura recortada | — |

Interacciones críticas:
- Zoom en cursor y pan heredan de `lightweight-charts` (ADR-005); mantener 60 FPS (RNF-001).
- Herramienta activa: botón con `aria-pressed`; dibujo efímero (RI-003) — sin autosave.
- Simulador buy/sell: al hacer clic se crea marcador con el precio de la barra bajo el cursor; borrado con tool `🗑` o clic en marcador + confirmación inline.
- Atajos: `+`/`-` zoom, `1` ajustar vista.

## SCR-005: Multigráfico sincronizado

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Montaje | Panes en skeleton; añadir deshabilitado hasta primer pane | Hasta primer carga |
| empty | Sin activo base | Redirige a SCR-003 | — |
| error | Pane falla | Retry individual en ese pane; otros operan (aislamiento) | persistente |
| success | Panes OK (hasta 3) | Crosshair/scroll sincronizados; mismos límites temporales (UTC, RNF-004) | — |
| partial | Pane con cobertura reducida | Pane operativo + aviso de cobertura | — |

Límite: máximo 3 panes (RF-014); el control "añadir" se deshabilita al llegar a 3 con tooltip explicativo.

## SCR-006: Exportar imagen

| Estado | Disparador | Comportamiento | Duración |
|--------|------------|----------------|----------|
| loading | Confirmar export | Spinner en preview, Descargar deshabilitado, `toBlob` generando | Hasta blob |
| empty | Canvas sin contenido | Alt "No hay gráfico que exportar"; botón deshabilitado | — |
| error | Blob falla | Banner inline "No se pudo generar la imagen" + Reintentar | persistente |
| success | Blob OK | Descarga disparada (PNG 2x default, P-2), modal cierra, Toast éxito | 200ms |
| partial | Pane sin datos en export multi | Exporta lo visible; avisa lo excluido | — |

## Transiciones globales

- Duración estándar: 200ms · Easing: ease-out.
- Filas/panes: fade 150ms al cambiar estado.
- Motion: respetar `prefers-reduced-motion` (deshabilitar fade/skeleton).
- Spinners: CRITICAL — en descargas largas (hasta minutos), jamás timeout visual; se muestran progreso determinista y estado del último evento.