# SCR-001: Biblioteca de activos

- **Persona:** P-001
- **RF:** RF-007
- **Journey:** J-001, J-002
- **Prioridad:** Must

## Wireframe (ASCII)

```
┌──────────────────────────────────────────────────────────────┐
│ fx_trad                                    [⇣ Descargar]    │
├──────────────────────────────────────────────────────────────┤
│  Activos guardados                                           │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Activo      Cobertura            Estado         Acciones │ │
│ │ EUR/USD     2024-09-06 → 2026-08-31  ✅          [Graficar]│ │
│ │ EUR/GBP     2025-01-02 → 2026-08-31  ✅          [Graficar]│ │
│ │ XAU/USD     2026-01-02 → 2026-08-31  🔄 parcial  [Graficar]│ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Abrir gráfico]        (activo + rango + timeframe)          │
│ [Actualizar activos]   (descarga incremental)                │
├──────────────────────────────────────────────────────────────┤
│ Última descarga: 26-08-2026 · EUR/USD · 87 421 filas        │
└──────────────────────────────────────────────────────────────┘
```

## Estados
- **loading:** skeleton de filas en la tabla + appBar estable
- **empty:** sin activos → ilustración + CTA destacado "Descargar mi primer activo" (→ SCR-002)
- **error:** el catálogo no carga → banner superior con "Reintentar"; appBar operativa
- **success:** tabla completa con cobertura y estado por activo
- **partial:** activos individuales con estado parcial (descarga en curso/fallida) → badge en la fila, el resto operativo

## Componentes usados
- Button (primary, ghost, icon)
- AssetList
- StatusBanner
- Table

## Notas de accesibilidad
- Tabla con `<th scope>` y encabezados reales; filas navegables por teclado.
- Badge de estado con texto y color (no color solo).
- CTA de fila no requieren hover exclusivo.