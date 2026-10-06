# ADR-027: Documento de configuración v2 por activo (dibujos compartidos) con migración aditiva desde v1

- **Fecha:** 2026-10-06
- **Estado:** Aceptado
- **Decisores:** Arquitecto · usuario (stakeholder)
- **Requisitos vinculados:** RI-401, RNF-401, RF-404, RF-405 · modifica RI-201, ADR-018 y ADR-023

## Contexto

Hoy la configuración del gráfico se persiste con la clave
`fxtrad.chart.v1.{activo}.{timeframe}` (`state/chart-config.ts:41`) y contiene `indicators` y
`drawings` de **ese** timeframe. El ciclo 05 exige que un dibujo hecho en `GBPUSD 1h` siga
presente al pasar a `15m` (RF-404) y que los indicadores se recalculen con las velas del TF
visible (RF-405).

El análisis previo a la decisión dejó dos hechos verificados en código:

1. **Los dibujos ya están anclados en `(tiempo, precio)`.** Todas las formas usan
   `PriceTimePoint` — `from`/`to` en `line`/`rect`/`fib`/`operation` y `position` en `marker`
   (`charting/drawings.ts:56-87`). Compartirlos entre timeframes **no requiere reproyectar
   geometría**: basta con cambiar el alcance de la clave.
2. **Hay dos contratos de documento para lo mismo.** `DrawingDocument` + `serializeDrawings` /
   `toDrawingDocument` / `fromDrawingDocument` (`charting/drawings.ts:24-29,99-122`) solo los usan
   sus propios tests; la ruta de producción serializa `shapes` directamente desde
   `state/chart-config.ts:57-87`.

`ADR-023` resolvió el ciclo 04 con una ampliación **aditiva dentro de v1**, porque solo se añadía
un `kind`. Aquí cambia el **alcance** del dato (de activo+TF a activo), lo que v1 no puede
representar sin duplicar o perder información.

## Decisión

**Un único documento por activo, versión 2**, con migración **aditiva al leer** desde v1:

1. **Contrato único:** se **reutiliza y extiende** `DrawingDocument` como el contrato del
   documento de configuración (no se crea uno nuevo, no se deja código muerto):

   ```ts
   DrawingDocument {
     version: 2
     symbol: string
     drawings: OverlayShape[]        // del activo, compartidos entre TF
     indicators: IndicatorConfig[]   // del activo, recalculados por TF
     selection: { timeframe, start?, end? }
   }
   ```

2. **Dónde vive:** el contrato se traslada a `state/chart-config.ts`, porque **es un documento de
   persistencia, no geometría**; así `charting/` no depende de `indicators/config`. `charting/drawings.ts`
   conserva `DRAWING_KINDS`, `isOverlayShape` y `colorForShape`, que sí son de la capa de dibujo.
3. **Clave:** `fxtrad.chart.v2.{symbol}`. `CHART_CONFIG_VERSION` pasa a `2`; `deserializeChartConfig`
   sigue descartando versiones desconocidas (robustez ante documentos corruptos).
4. **Migración aditiva al leer** (`state/migrate-chart-config.ts`, módulo puro):
   1. si ya existe el v2 del activo, **no se recalcula** (idempotente);
   2. se recorren los seis TF de `TIMEFRAMES` leyendo `fxtrad.chart.v1.{symbol}.{tf}`;
   3. los `drawings` se unen **deduplicando por `id`**;
   4. los `indicators` se toman del TF de la selección recuperada, o del primer TF con datos;
   5. se escribe el v2 y **las claves v1 no se borran** (respaldo, RNF-401).
5. **Indicadores del activo:** una sola lista (tipo, parámetros, visibilidad) recalculada con las
   velas del TF visible (D-1); no se guarda una lista por TF.
6. **Degradación:** si no hay ni v2 ni v1, el documento se crea vacío en memoria y solo se
   persiste cuando el usuario modifica algo.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Mantener la clave por activo+TF y **unir en lectura** | Sin migración ni cambio de esquema | La misma figura queda en varios TF a la vez; editar exige decidir a qué TF se escribe y los duplicados divergen | Corrige el síntoma (no se ve) y crea un problema de consistencia peor |
| Duplicar los dibujos en **todos** los TF al crearlos | Trivial de implementar | Multiplica por 6 el almacenamiento y las ediciones; una figura borrada en un TF reaparece desde otro | Coste y divergencia inaceptables con cuota de `localStorage` |
| Ampliación **aditiva dentro de v1** (estilo ADR-023) | Sin bump de versión | El documento es por activo+TF: no hay dónde guardar un dibujo del activo sin inventar una clave nueva, que es v2 con otro nombre | El cambio de alcance sí es un cambio de esquema, no una ampliación |
| **Empezar de cero** e ignorar v1 | Implementación mínima | Pierde los dibujos ya guardados del usuario | Incumple RNF-304/RNF-401; es exactamente el riesgo R-401 |
| Documento nuevo (`fxtrad.drawings.v1`) + `chart-config` intacto | No toca lo existente | Dos documentos que pueden desincronizarse (figura y su operación en documentos distintos) | Se descartó por coherencia: un activo, un documento |

## Consecuencias

### Positivas
- Un dibujo vale para todos los timeframes del activo (RF-404) sin tocar la geometría ni la
  proyección: el ancla `(tiempo, precio)` ya era correcta.
- Menos entradas en `localStorage`: una por activo en vez de una por activo+TF.
- Desaparece el contrato duplicado (`DrawingDocument` deja de ser código muerto, Q-STR-02).
- La migración es testeable sin navegador y no borra datos: el respaldo v1 queda disponible.

### Negativas / Trade-offs
- Un formato más que mantener: el código debe seguir leyendo v1 mientras existan documentos sin
  migrar.
- La migración se ejecuta al leer (coste O(6) por activo la primera vez); es despreciable, pero
  ocurre en el hilo de la interfaz.
- El contrato `DrawingDocument` cambia de módulo: los imports de `charting/drawings` para el
  documento deben actualizarse.

### Neutras
- Sin dependencias nuevas: la migración y el deduplicado son código propio (RX-401).
- El backend no participa (RI-003); no hay migración de servidor.

## Referencias

- `_docs/requirements.md` RI-401, RNF-401, RF-404, RF-405 · `_docs/plan.md` §7 R-401
- `_docs/iterations/04-dibujo-referencia-operacion/adr/ADR-023-ampliacion-aditiva-esquema-v1.md`
- `_docs/adr/ADR-018-persistencia-configuracion-grafico.md`
- `frontend/src/state/chart-config.ts` · `frontend/src/charting/drawings.ts`
- `_docs/session-handoff.md` D-1, D-2
