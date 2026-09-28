# Glosario — Iteración 02 (Optimización de descarga y base 1m)

> Hereda los términos de `_docs/iterations/01-mvp/glossary.md`; aquí se añaden los
> específicos de la optimización de descarga. Los términos de 1 s
> (timeframes sub-minuto) se marcan como **obsoletos** en esta iteración.

## Términos del dominio

| Término | Definición | Sinónimos |
|---------|------------|-----------|
| Base 1m | Serie canónica de velas OHLC de 1 minuto desde la que se derivan los timeframes superiores | Serie base, timeframe base |
| Tanda | Unidad de descarga acotada (6–12 meses) que respeta el límite de la API y permite progreso/reanudación | Batch de descarga, lote |
| Bloque de paginación | Subdivisión de una tanda en ≤ 30.000 velas, con una petición por bloque | Página, chunk |
| Precálculo | Estimación de las velas esperadas del rango (según calendario de mercado) para dimensionar los bloques | Estimación de velas |
| Pacing | Espera deliberada de 20 s entre bloques para evitar el rate-limiting (503) de la API | Espaciado, throttling |
| BID | Precio de compra del mercado; es la única serie de precios de la base 1 m (semántica distinta del `mid` previo) | Bid price |
| Mid | Precio medio `(bid + ask) / 2` calculado localmente sobre ticks; **ya no se usa** | Precio medio |
| Timeframe | Intervalo temporal que agrega cada vela (1 m, 5 m, 15 m, 30 m, 1 h, 4 h, 1 d) | Marco temporal |
| Resampling | Reagrupación de la base 1 m a timeframes superiores (agregación OHLC) | Remuestreo, downsampling |
| Página (`limit`) | Máximo de puntos que devuelve freeserv por petición (30.000) | Límite |
| Cursor (`last_update`) | Marca temporal desde la que la librería continúa la paginación interna | Cursor de paginación |
| Gap | Ausencia de datos o salto de precio en la serie (p. ej. fines de semana, feriados) | Hueco |
| Cierre semanal | Cierre de mercado los viernes y reapertura el lunes (activos con pausa de fin de semana) | Weekend close |

**Términos obsoletos en esta iteración**

| Término | Motivo |
|---------|--------|
| Base 1s | Sustituida por la base 1 m (RNF-102) |
| Timeframes sub-minuto (30 s, 15 s) | Fuera del dominio de estudio (OUT) |

## Acrónimos

| Sigla | Significado |
|-------|-------------|
| OHLC | Open, High, Low, Close |
| UTC | Coordinated Universal Time |
| API | Application Programming Interface |
| HTTP | Hypertext Transfer Protocol |
| FX | Foreign Exchange |
| MVP | Minimum Viable Product |
| KPI | Key Performance Indicator |
| RF | Requisito Funcional |
| RNF | Requisito No Funcional |
| RI | Requisito de Información |
| RX | Requisito de Integración |
| ADR | Architecture Decision Record |
| MoSCoW | Must / Should / Could / Won't |

## Entidades principales

### SerieOHLC (base)

- **Descripción:** serie canónica de velas de 1 minuto de un activo, almacenada en
  Parquet y consultada vía DuckDB.
- **Atributos clave:** `time` (BIGINT, epoch en segundos UTC), `open`, `high`,
  `low`, `close` (numéricos). El volumen se descarta.
- **Relaciones:** 1..N con Series derivadas por timeframe; 1..N con Metadatos de
  descarga.
- **Sensibilidad:** pública (datos de mercado, sin PII).
- **Volumen estimado:** ~726.000 velas/activo (2 años @ 1 m).
- **Retención:** local, indefinida.
- **Persistencia:** `{symbol}.1m.parquet` (ADR-007).

### Serie derivada

- **Descripción:** serie OHLC de timeframe superior (5 m/15 m/30 m/1 h/4 h/1 d)
  obtenida por resampling de la base 1 m.
- **Atributos clave:** mismos que SerieOHLC; `time` alineado al inicio del bucket.
- **Relaciones:** N..1 con SerieOHLC base.
- **Sensibilidad:** pública.
- **Volumen estimado:** el base dividido por el factor del timeframe.
- **Retención:** local, regenerable desde la base.
- **Persistencia:** `{symbol}.{tf}.parquet` (ADR-007).

### Tanda de descarga

- **Descripción:** ejecución acotada de descarga (6–12 meses) con seguimiento de
  progreso y reanudación.
- **Atributos clave:** activo, rango, número de bloques, bloques completados,
  estado (`exito`/`parcial`/`fallo`).
- **Relaciones:** 1..N con Metadatos de descarga.
- **Sensibilidad:** interna.
- **Volumen estimado:** decenas de miles de velas por tanda.
- **Retención:** registro en `download_metadata`.
