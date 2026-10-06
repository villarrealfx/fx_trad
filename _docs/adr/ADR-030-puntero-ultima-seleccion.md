# ADR-030: Puntero de la última selección de gráfico (`fxtrad.chart.last`)

- **Fecha:** 2026-10-06
- **Estado:** Aceptado
- **Decisores:** Arquitecto · usuario (stakeholder)
- **Requisitos vinculados:** RF-401, RI-402 · complementa ADR-027 y ADR-028

## Contexto

ADR-027 guarda la configuración en un documento **por activo**
(`fxtrad.chart.v2.{symbol}`) y ADR-028 decide la precedencia
**URL explícita > selección persistida > defecto**. RI-402 pide recuperar «la **última selección**
de gráfico (activo, timeframe y rango)».

Al implementar TASK-404 apareció un hueco: el `selection` que definió ADR-027 vive **dentro** del
documento de cada activo, de modo que para leerlo hay que saber ya **de qué activo** se trata. Pero
el activo es justamente parte de lo que hay que recuperar cuando se abre `/chart` sin query: sin un
puntero externo, el fallback del documento por activo es **inalcanzable**. Ni ADR-027 ni ADR-028
cubrían ese caso.

## Decisión

Se añade una **clave propia y ligera** en `localStorage`:

```
fxtrad.chart.last = { symbol, timeframe?, start?, end? }
```

1. **Se escribe** cada vez que la pantalla `Gráfico` resuelve una selección efectiva (al montar con
   una selección explícita y al cambiarla), desde `App`/`ChartScreen`.
2. **Se lee** solo cuando `/chart` llega **sin query**: entonces rellena los campos ausentes
   (activo, timeframe y rango). Un parámetro explícito de la URL **nunca** se pisa (ADR-028).
3. **La URL activa se enriquece** con la selección efectiva mediante `history.replaceState`
   (`replaceRoute`), sin apilar una entrada en el historial y sin provocar un bucle de navegación:
   tras el reemplazo la URL ya trae la query, así que no vuelve a hidratar.
4. **No sustituye al `selection` del documento v2**: aquel sigue siendo la fuente del timeframe y
   el rango **de cada activo**; este puntero solo recuerda **cuál fue el último** que se usó.
5. **Datos corruptos o ausentes no rompen nada**: el puntero se valida al leer y, si no sirve, se
   aplican los valores por defecto.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| **Solo el `selection` por activo** (sin puntero) | Cero claves nuevas | Es **inalcanzable**: hace falta el símbolo para encontrar el documento, y el símbolo es lo que se busca | No cumple RI-402 |
| Guardar **solo el último activo** (`lastSymbol`) | Menos datos duplicados | El rango y el timeframe recordados serían los del activo, no los últimos usados: cambiar de rango sin cambiar de activo no se recuerda | Recuperación incompleta |
| Recordar la **última URL** del gráfico | Cero cambios en el documento | Es el mecanismo que ADR-028 ya descartó como único: no cubre recargar la app ni abrir `/chart` desde un marcador | Resuelve solo la mitad del caso |
| Derivar el último activo de las claves de `localStorage` | Sin clave extra | El orden de las claves no es fiable (ni semántico); `symbol` puede contener puntos y la clave se vuelve ambigua | Frágil |

## Consecuencias

### Positivas
- RF-401 y RI-402 se cumplen también al recargar la app y desde un enlace a `/chart` sin query.
- La URL queda enriquecida y compartible sin ensuciar el historial.
- El diseño de ADR-027 no cambia: el puntero es un resumen, no una segunda fuente de verdad.

### Negativas / Trade-offs
- Una clave más que puede desincronizarse del documento del activo; se mitiga porque el puntero se
  **rescribe** en cada resolución de selección y nunca manda sobre la URL explícita.
- `replaceState` no dispara `hashchange`: la URL cambia sin re-render. Es intencionado (evita el
  bucle) y no afecta a lo que se ve.

### Neutras
- Sin dependencias nuevas (RX-401); todo es `localStorage` + `history.replaceState` nativos.
- Sin cambios en el backend ni en los contratos de API.

## Referencias

- `_docs/adr/ADR-027-documento-configuracion-v2.md` · `_docs/adr/ADR-028-seleccion-grafico-persistida.md`
- `_docs/requirements.md` RF-401, RI-402 · `_docs/architecture.md` §5
- `frontend/src/state/chart-config.ts` · `frontend/src/app/routes.ts` · `frontend/src/app/useHashRoute.ts`
- `_docs/session-handoff.md` D-5
