# Glosario

## Términos del dominio

| Término | Definición | Sinónimos |
|---------|------------|-----------|
| Análisis técnico | Estudio de movimientos de precios con datos históricos para anticipar posibles estrategias | Análisis chartista |
| Vela japonesa | Representación OHLC (open, high, low, close) en un intervalo temporal, con cuerpo y mechas | Candlestick |
| Timeframe | Intervalo temporal que agrega cada vela (1s, 1m, 5m, 15m, 1h, 4h, 1d) | Marco temporal |
| Resampling | Reagrupación de datos de alta frecuencia (1s) a timeframes superiores (agregación OHLC) | Remuestreo, downsampling |
| Imputación | Tratamiento de valores faltantes/NaN en la serie temporal | Relleno de valores |
| Gap | Ausencia de datos o salto de precio en la serie (p. ej. fines de semana, feriados) | Hueco |
| Cierre semanal | Cierre de mercado de los viernes y reapertura del lunes (activos con pausa de fin de semana) | Weekend close |
| Indicador técnico | Función calculada sobre la serie (RSI, ATR, medias móviles) para guiar decisiones | Oscilador/sobrada técnica |
| Retroceso de Fibonacci | Herramienta de dibujo con niveles de retroceso basados en la secuencia de Fibonacci | Fib, fib retracement |
| Simulador de compra/venta | Marcas manuales de entrada/salida sobre el gráfico para evaluar una estrategia | Paper trading manual |
| Descarga incremental | Adición de nuevos periodos a un activo existente sin duplicar ni borrar datos previos | Actualización de datos |
| Feature engineering | Preparación/derivación de características sobre la serie para consumo posterior | Ingeniería de características |

## Acrónimos

| Sigla | Significado |
|-------|-------------|
| OHLC | Open, High, Low, Close |
| UTC | Coordinated Universal Time |
| RSI | Relative Strength Index |
| ATR | Average True Range |
| MM / MA | Media Móvil / Moving Average |
| MVP | Minimum Viable Product |
| KPI | Key Performance Indicator |
| RNF | Requisito No Funcional |
| RF | Requisito Funcional |
| RI | Requisito de Información |
| RX | Requisito de Integración |
| MoSCoW | Must / Should / Could / Won't |
| PII | Personally Identifiable Information |
| QA | Quality Assurance |
| FPS | Frames Per Second |

## Entidades principales

### Activo
- **Descripción:** Instrumento financiero analizable (divisa, metal o petróleo).
- **Atributos clave:** símbolo (EUR/USD), tipo (forex / metal / petróleo), mercado.
- **Relaciones:** 1..N con Series OHLC; 1..N con Metadatos de descarga.
- **Sensibilidad:** pública (datos de mercado).
- **Volumen estimado:** decenas de activos (forex mayor + metales + petróleo).
- **Retención:** ilimitada en la base local.

### Serie OHLC
- **Descripción:** Registro temporal del precio con time, open, high, low, close.
- **Atributos clave:** time (segundos, UTC, único por activo), open, high, low, close (números); derivados: volumen (opcional), intervalos agregados.
- **Relaciones:** N:1 con Activo.
- **Sensibilidad:** pública.
- **Volumen estimado:** ~18M filas por activo (2 años @ 1s); ≈ 45M segundos de mercado en 2 años considerando cierre semanal.
- **Retención:** 2 años móviles desde la fecha de descarga (ventana mínima garantizada).

### Metadatos de descarga
- **Descripción:** Registro de cada proceso de descarga para controlar incrementales.
- **Atributos clave:** activo, rango solicitado (inicio/fin), estado (éxito/parcial/fallo), fecha de descarga, filas obtenidas.
- **Relaciones:** N:1 con Activo.
- **Sensibilidad:** interna.
- **Volumen estimado:** bajo (1 fila por descarga).
- **Retención:** ilimitada.