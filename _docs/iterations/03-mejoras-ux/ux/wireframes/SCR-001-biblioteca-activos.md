# SCR-001: Biblioteca de activos

- **Persona:** P-001
- **RF:** RF-220 (catálogo vía `GET /assets`)
- **Journey:** J-001, J-002
- **Prioridad:** Must

## Wireframe (ASCII)

```
┌──────────────────────────────────────────────────────────────┐
│ fx_trad                                    [⇣ Descargar]    │
├──────────────────────────────────────────────────────────────┤
│  Activos guardados                                           │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Activo      Cobertura                Estado      Acción   │ │
│ │ EUR/USD     2024-09-06 → 2026-08-31  ✅          [Graficar]│ │
│ │ GBP/JPY     2025-01-02 → 2026-08-31  ✅          [Graficar]│ │
│ │ AUD/USD     2026-01-02 → 2026-08-31  🔄 parcial  [Graficar]│ │
│ └──────────────────────────────────────────────────────────┘ │
│ [Abrir gráfico]   [Actualizar activos]                       │
└──────────────────────────────────────────────────────────────┘
```

> La lista proviene de `GET /assets` (backend canónico); el frontend **no**
> mantiene catálogo propio (RF-220, ADR-021).

## Estados
- **loading:** skeleton de filas; appbar estable.
- **empty:** sin activos → ilustración + CTA "Descargar mi primer activo" (→ SCR-002).
- **error:** fallo de `GET /assets` → StatusBanner error + "Reintentar".
- **success:** tabla con cobertura y estado por activo.
- **partial:** activos con descarga en curso/fallida → badge en su fila.

## Componentes usados
- Button (primary, ghost, icon), AssetList, Table, StatusBanner.

## Notas de accesibilidad
- Tabla con `<th scope>` real; filas navegables por teclado.
- Badge de estado con texto y color (nunca color solo).
