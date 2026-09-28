# SCR-006: Exportar imagen (PNG)

- **Persona:** P-001
- **RF:** RF-015 (+ RI-003: la captura es la única vía de conservar la estrategia)
- **Journey:** J-006
- **Prioridad:** Must

## Wireframe (ASCII)

```
┌────────────────────────────────────────────────────────────────────┐
│  Exportar captura           [✕]                                    │
├────────────────────────────────────────────────────────────────────┤
│  Incluye: velas + dibujos + indicadores + anotaciones (ticker/TF)  │
│                                                                    │
│  ● Resolución        ● Formato (P-2 pendiente)                    │
│  [ (●) 2x (nice)     ]  [ (●) PNG   ( ) WebP  ]                   │
│  [ ( ) 1x (1:1)      ]                                            │
│  [ ( ) 4x (máx.)     ]                                            │
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

## Estados
- **loading:** generación del `toBlob` en curso → spinner sobre la vista previa, botón descargar deshabilitado
- **empty:** canvas sin contenido (chart vacío) → botón deshabilitado y nota "No hay gráfico que exportar"
- **error:** fallo de generación o blob vacío → banner inline "No se pudo generar la imagen" + reintentar
- **success:** blob creado → descarga disparada y modal cierra con notificación de confirmación
- **partial:** chart cargado pero con pane sin datos → exporta lo visible y avisa qué quedó excluido

## Componentes usados
- Modal, Button (primary, ghost)
- RadioGroup (resolución, formato)
- ImagePreview

## Notas de accesibilidad
- Modal con focus trap y cierre con Escape (focus nunca se pierde).
- Texto de la leyenda capturada en la imagen es decorativo en preview; se provee alt descriptivo.
- **Dependencia P-2 (plan §7.1):** el default es PNG @2x del viewport hasta fijar resolución.