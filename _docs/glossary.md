# Glosario

> Glosario **compartido** entre ciclos. Crece, no se reemplaza. Hereda y consolida
> los términos de `_docs/iterations/01-mvp/glossary.md` y
> `_docs/iterations/02-optimizacion-descarga/glossary.md`, y añade los del ciclo 03.

## Términos del dominio

| Término | Definición | Sinónimos |
|---------|------------|-----------|
| Análisis técnico | Estudio de movimientos de precios con datos históricos para anticipar posibles estrategias | Análisis chartista |
| Vela japonesa | Representación OHLC (open, high, low, close) en un intervalo temporal, con cuerpo y mechas | Candlestick |
| Timeframe | Intervalo temporal que agrega cada vela (1 m, 5 m, 15 m, 30 m, 1 h, 4 h, 1 d) | Marco temporal |
| Base 1m | Serie canónica de velas OHLC de 1 minuto desde la que se derivan los timeframes superiores | Serie base, timeframe base |
| Resampling | Reagrupación de la base 1 m a timeframes superiores (agregación OHLC) | Remuestreo, downsampling |
| BID | Precio de compra del mercado; única serie de precios de la base 1 m | Bid price |
| Mid | Precio medio `(bid + ask) / 2` calculado sobre ticks; **ya no se usa** | Precio medio |
| Gap | Ausencia de datos o salto de precio en la serie (p. ej. fines de semana, feriados) | Hueco |
| Cierre semanal | Cierre de mercado los viernes y reapertura el lunes | Weekend close |
| Tanda | Unidad de descarga acotada (6–12 meses) que permite progreso/reanudación | Batch de descarga, lote |
| Bloque de paginación | Subdivisión de una tanda en ≤ 30.000 velas, con una petición por bloque | Página, chunk |
| Pacing | Espera deliberada de 20 s entre bloques para evitar el rate-limiting (503) | Espaciado, throttling |
| Indicador técnico | Función calculada sobre la serie (RSI, ATR, medias móviles) para guiar decisiones | Oscilador |
| Formulario flotante de indicadores | Panel superpuesto (no fijo) que lista los indicadores agregados y sus acciones (mostrar/ocultar, configurar, eliminar); puede cerrarse liberando el espacio | Panel de indicadores |
| Dibujo | Herramienta gráfica trazada sobre el chart (línea, rectángulo, retroceso de Fibonacci) | Anotación |
| Edición de dibujo | Modificación posterior de un dibujo ya colocado: mover y redimensionar/ajustar extremos | Ajuste de dibujo |
| Marca de compra/venta | Triángulo que señala una entrada/salida manual, ubicado fuera del rango de la vela de referencia | Simulador de compra/venta, paper trading manual |
| Pip | Unidad mínima de variación de precio: `0.0001` en pares no-JPY y `0.01` en pares JPY | Point |
| Precisión de eje | Número de decimales mostrados en el eje Y (5 en este dominio: forex, metales y petróleo) | Decimales |
| Configuración de gráfico | Estado persistido del gráfico (activo, timeframe, indicadores, dibujos) que se conserva entre hojas y recargas | Estado de gráfico |
| Catálogo de activos | Conjunto canónico de instrumentos analizables, expuesto por `GET /assets` | Asset catalog |

**Términos obsoletos**

| Término | Motivo |
|---------|--------|
| Base 1s | Sustituida por la base 1 m (ciclo 02, RNF-102) |
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
| FPS | Frames Per Second |
| PII | Personally Identifiable Information |
| QA | Quality Assurance |

## Entidades principales

### Activo

- **Descripción:** instrumento financiero analizable (divisa, metal o petróleo).
- **Atributos clave:** símbolo (EUR/USD), tipo (forex / metal / petróleo), nombre legible.
- **Relaciones:** 1..N con Serie OHLC; 1..N con Metadatos de descarga.
- **Sensibilidad:** pública (datos de mercado).
- **Volumen estimado:** decenas de activos.
- **Retención:** ilimitada en la base local.
- **Ciclo 03:** la lista forex se amplía con GBPJPY, EURJPY, AUDUSD, USDCAD y EURGBP.

### Serie OHLC (base)

- **Descripción:** serie canónica de velas de 1 minuto de un activo, almacenada en Parquet y consultada vía DuckDB.
- **Atributos clave:** `time` (BIGINT, epoch en segundos UTC), `open`, `high`, `low`, `close` (numéricos). El volumen se descarta.
- **Relaciones:** 1..N con Series derivadas por timeframe; 1..N con Metadatos de descarga.
- **Sensibilidad:** pública (sin PII).
- **Volumen estimado:** ~726.000 velas/activo (2 años @ 1 m).
- **Retención:** local, indefinida.
- **Persistencia:** `{symbol}.1m.parquet` (ADR-007).

### Serie derivada

- **Descripción:** serie OHLC de timeframe superior (5 m/15 m/30 m/1 h/4 h/1 d) obtenida por resampling de la base 1 m.
- **Atributos clave:** mismos que Serie OHLC; `time` alineado al inicio del bucket.
- **Relaciones:** N..1 con Serie OHLC base.
- **Sensibilidad:** pública.
- **Volumen estimado:** la base dividida por el factor del timeframe.
- **Retención:** local, regenerable desde la base.
- **Persistencia:** `{symbol}.{tf}.parquet` (ADR-007).

### Metadatos de descarga

- **Descripción:** registro de cada proceso de descarga para controlar incrementales.
- **Atributos clave:** activo, rango solicitado (inicio/fin), estado (éxito/parcial/fallo), fecha de descarga, filas obtenidas.
- **Relaciones:** N:1 con Activo.
- **Sensibilidad:** interna.
- **Volumen estimado:** bajo.
- **Retención:** ilimitada.

### Tanda de descarga

- **Descripción:** ejecución acotada de descarga (6–12 meses) con progreso y reanudación.
- **Atributos clave:** activo, rango, número de bloques, bloques completados, estado.
- **Relaciones:** 1..N con Metadatos de descarga.
- **Sensibilidad:** interna.
- **Retención:** registro en `download_metadata`.

### Configuración de gráfico *(nueva en ciclo 03)*

- **Descripción:** estado persistido del gráfico para conservar la sesión de análisis entre hojas y recargas.
- **Atributos clave:** activo, timeframe, indicadores (tipo + parámetros + visibilidad), dibujos (tipo, coordenadas, color); versión de esquema.
- **Relaciones:** N..1 con Activo (por combinación activo+timeframe).
- **Sensibilidad:** interna (almacenamiento local del navegador, sin PII).
- **Volumen estimado:** bajo (una entrada por activo+timeframe).
- **Retención:** local del navegador; puede limpiarse por el usuario.
- **Persistencia:** `localStorage`/IndexedDB. `[modifica RI-003 del ciclo 01]`
