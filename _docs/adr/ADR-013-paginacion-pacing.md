# ADR-013: Paginación por bloques ≤30.000 con precálculo y pacing de 20 s

- **Fecha:** 2026-09-28
- **Estado:** Aceptado
- **Decisores:** Arquitecto, usuario (propietario)
- **Requisitos vinculados:** RF-101, RF-102, RX-101, RNF-101
- **Enmienda a:** ADR-010 (transporte vía freeserv + dukascopy-python)

## Contexto

El ingest de 01-mvp descarga **hora a hora** (`iter_hours` →
`FreeservClient.download_hour`), una petición HTTP por hora (744 para 31 días,
17.520 para 2 años), y además pide `INTERVAL_TICK`, agregando ticks a velas de 1 s
en Python con `iterrows()`. Esta combinación es la causa raíz de que una descarga
de un mes superara los 30 minutos.

Se verificó en la librería que `dukascopy_python.fetch` **ya pagina internamente**
con `limit=30_000` y un cursor `last_update` (`_stream`, `__init__.py:177-288`) y
que, para intervalos OHLC, devuelve directamente `timestamp, open, high, low,
close, volume` (`__init__.py:117`). La fragmentación horaria del sistema es, por
tanto, redundante.

La librería no expone un punto de control entre páginas para espaciar peticiones y
evitar el rate-limiting (503) documentado en ADR-010 (AR-1/R-001).

## Decisión

El módulo `ingest` incorpora un **planificador de descarga** que:

1. **Precalcula** las velas esperadas del rango usando el calendario de mercado
   (excluyendo fines de semana y feriados, RF-106).
2. Particiona el rango en **bloques de ≤ 30.000 velas** (límite duro de la API).
3. Ejecuta **una llamada `fetch(..., INTERVAL_MIN_1, OFFER_SIDE_BID, ...)` por
   bloque**.
4. Aplica una **espera de 20 s entre bloques** (pacing) para mitigar el 503.
5. Aplica el **backoff por bloque** (no por hora): un bloque que falla tras los
   reintentos se marca y el estado queda `parcial`/`fallo`, sin abortar el rango.

Se elimina de producción el bucle `iter_hours` y la agregación de ticks
(`aggregate_to_ohlc`), que dejan de tener sentido con la base 1 m (ADR-012).

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Hora a hora (estado actual) | Granularidad de fallo | 744–17.520 peticiones + ticks crudos; inviable | Causa raíz del problema |
| Confiar solo en la paginación interna de `fetch` | Menos código | Sin control de pacing ni de tamaño de bloque; un fallo no es reanudable | R-001 exige pacing; RF-102 exige bloques ≤30k |
| Fork/parche de `dukascopy-python` | Hook entre páginas | Mantener un fork por una dependencia externa | Coste de mantenimiento desproporcionado (RNF-006/007) |
| **Planificador propio sobre `fetch`** | Control de bloques, pacing, backoff y reanudación | Reinventa partición simple | Es el mínimo control necesario para RF-102/R-001 |

## Consecuencias

### Positivas
- Reducción drástica de peticiones: 1 año ≈ 13 bloques, frente a 8.760 peticiones
  horarias.
- Pacing explícito que ataca el 503 de ADR-010 (R-001).
- Fallos acotados por bloque, con estado parcial/fallo (RF-105, RX-001).
- Habilita RNF-101 (≤900 s/año).

### Negativas / Trade-offs
- La espera de 20 s añade ~260 s por año de descarga; el presupuesto de 900 s lo
  absorbe.
- Reintroduce una forma de fragmentación (bloques, no horas); debe validarse que no
  genera huecos (R-002, ya validado: S-2).

### Neutras
- El transporte sigue siendo freeserv con `dukascopy-python` (ADR-010); cambia el
  intervalo y la estrategia de partición.
- `fetch` sigue acumulando el bloque en memoria; a 30k velas es despreciable.

## Referencias

- `_docs/iterations/02-optimizacion-descarga/plan.md` §1, §6 (D-3)
- `_docs/iterations/02-optimizacion-descarga/requirements.md` RF-101, RF-102, RX-101, RNF-101
- `_docs/iterations/01-mvp/adr/ADR-010-transporte-freeserv-dukascopy-python.md`
- `dukascopy_python/__init__.py:117,177-288`
