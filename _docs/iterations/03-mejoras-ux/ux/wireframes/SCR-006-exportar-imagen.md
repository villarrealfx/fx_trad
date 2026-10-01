# SCR-006: Exportar imagen (PNG)

- **Persona:** P-001
- **RF:** RF-205 (el disparador vive en el header de SCR-004)
- **Journey:** J-006
- **Prioridad:** Must

## Wireframe (ASCII)

```
┌────────────────────────────────────────────────────────────────────┐
│  Exportar captura           [✕]                                    │
├────────────────────────────────────────────────────────────────────┤
│  Incluye: velas + dibujos + indicadores + anotaciones (ticker/TF)  │
│                                                                    │
│  ● Resolución                     ● Formato                        │
│  [ (●) 2x (nice) ]                [ (●) PNG   ( ) WebP ]           │
│  [ ( ) 1x (1:1)  ]                                                 │
│  [ ( ) 4x (máx.) ]                                                 │
│                                                                    │
│  ┌─────────── Vista previa ───────────────┐                        │
│  │ EUR/USD · 1h   ╭──╮  ╱ ╲              │                        │
│  │              ╭─╯  ╰─╮╱   ╲            │                        │
│  │              │      │╱ fib ╲          │                        │
│  └────────────────────────────────────────┘                        │
│                                                                    │
│  [ Cancelar ]   [ Descargar PNG ]                                  │
└────────────────────────────────────────────────────────────────────┘
```

El disparador (botón) está en el **header de SCR-004**, junto al de indicadores.

## Estados
- **loading:** `toBlob` en curso → spinner en preview; descargar deshabilitado.
- **empty:** canvas sin contenido → botón deshabilitado + nota "No hay gráfico que exportar".
- **error:** fallo de generación/blob vacío → banner inline + reintentar.
- **success:** blob creado → descarga disparada; modal cierra; toast de confirmación.
- **partial:** pane sin datos → exporta lo visible y avisa lo excluido.

## Componentes usados
- Modal, Button (primary, ghost), RadioGroup, ImagePreview.

## Notas de accesibilidad
- Modal con focus trap; `Escape` cierra; foco restaurado al botón de origen.
- Alt descriptivo de la vista previa.
