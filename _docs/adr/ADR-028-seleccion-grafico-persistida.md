# ADR-028: La selección de gráfico es estado persistido, con la URL como fuente preferente

- **Fecha:** 2026-10-06
- **Estado:** Aceptado
- **Decisores:** Arquitecto · usuario (stakeholder)
- **Requisitos vinculados:** RF-401, RI-402

## Contexto

La selección del gráfico (activo, timeframe y rango) viaja hoy en la **URL** (`/chart?symbol=…&timeframe=…&start=…&end=…`):
`parseChartQuery` (`app/routes.ts:73-84`) la lee y `buildChartUrl` (`:85-92`) la construye. Los
enlaces de navegación de `AppShell` apuntan a las rutas **estáticas** de `ROUTES` (`app/routes.ts:23-31`),
y la ruta del gráfico es `/chart` a secas. Consecuencia: al cambiar de hoja y volver, `params`
viene vacío y `parseChartQuery` cae a `DEFAULT_SYMBOL = 'EURUSD'` y `DEFAULT_TIMEFRAME = '1h'`
(`:37,70`) — el comportamiento anómalo que reporta `cycle_05.md` §2. Los dibujos y los indicadores
**sí** se conservan en `localStorage`; lo que se pierde es la selección.

Con el documento v2 (ADR-027) existe además un sitio natural donde recordarla (`selection`), y
RI-402 la declara estado persistido.

## Decisión

La selección del gráfico es **estado persistido** y se resuelve con **precedencia explícita**:

1. **URL (hash) > documento persistido > valores por defecto.**
   - Si la URL trae `symbol` y/o `timeframe` **explícitos**, mandan (permite compartir/enlazar un
     gráfico concreto y no rompe los enlaces existentes).
   - Si la URL no trae query (el caso del enlace de navegación), se usa `selection` del documento
     v2 del **último activo usado** (`RI-402`).
   - Si no hay nada persistido, se aplican `DEFAULT_SYMBOL`/`DEFAULT_TIMEFRAME`.
2. **Al cambiar la selección** (activo en `Abrir`, timeframe en el gráfico, rango), se actualiza la
   URL con `buildChartUrl` **y** se guarda `selection` en el documento v2 del activo. La URL sigue
   siendo la fuente de la sesión en curso; el documento es la memoria entre hojas y recargas.
3. **El rango** (`start`/`end`) se persiste igual que el timeframe, para que volver a la hoja no
   recalcule el rango por defecto.
4. **Un query explícito nunca se sobrescribe con el persistido**: si el usuario abre
   `/chart?symbol=GBPJPY`, se carga GBPJPY aunque la memoria diga EURUSD, y GBPJPY pasa a ser la
   nueva selección recordada.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Que el enlace de navegación recuerde la **última URL** del gráfico | Cambio mínimo, sin tocar el documento | La selección no se recupera tras recargar la app ni al abrir `/chart` desde otro sitio (marcador, enlace) | Resuelve solo la mitad del requisito (RI-402 pide estado recuperable) |
| **Solo `localStorage`** (sin URL) | Simple | Rompe los enlaces `?symbol=…` y el botón atrás; impide abrir un gráfico concreto | Regresión sobre RF-007/008 del ciclo 01 |
| **Solo URL** (estado actual) | Sin estado duplicado | Es el bug: el enlace estático pierde la selección | No cumple RF-401 |
| Persistir la selección en un documento **aparte** de la configuración | Separación de conceptos | Un documento más que sincronizar; el activo ya tiene su documento v2 | Se descartó por simplicidad (un activo, un documento) |

## Consecuencias

### Positivas
- RF-401 se cumple en los tres caminos: navegación entre hojas, recarga y enlace directo.
- La URL sigue siendo compartible y el botón atrás sigue funcionando.
- El estado recordado viaja con el activo: no hay un "último gráfico" global que sorprenda.

### Negativas / Trade-offs
- **Dos fuentes de la misma verdad** (URL y documento): exige una regla de precedencia clara y
  tests de que un query explícito gana al persistido (R-404).
- Abrir `/chart` desde un enlace sin query carga la última selección, que puede no ser la
  esperada; se mitiga manteniendo la URL siempre enriquecida con la selección activa.

### Neutras
- Sin dependencias nuevas: la hidratación es código propio (RX-401).
- No hay cambio de contrato de API: la selección sigue siendo del cliente.

## Referencias

- `_docs/requirements.md` RF-401, RI-402 · `_docs/plan.md` §7 R-404
- `_docs/adr/ADR-027-documento-configuracion-v2.md`
- `frontend/src/app/routes.ts` · `frontend/src/App.tsx:128` · `frontend/src/state/chart-config.ts`
- `_docs/session-handoff.md` D-5
