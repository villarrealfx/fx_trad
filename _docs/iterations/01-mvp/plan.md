# Plan del Proyecto: Plataforma de Análisis Técnico (Estilo TradingView)

## 1. Contexto y justificación

Aplicación web de uso **exclusivamente personal** para realizar análisis técnico de activos financieros con datos históricos. El objetivo fundamental es **visualizar posibles estrategias de trading** de forma manual (dibujos, indicadores y simulación compra/venta) sobre forex, metales y petróleo.

Los datos se descargan de **Dukascopy** (única fuente admitida), se limpian y preparan (índice temporal, resampling, imputación de valores faltantes, feature engineering básico), se almacenan en **Parquet + DuckDB** y se visualizan en un gráfico de velas japonesas con zoom/pan, herramientas de dibujo e indicadores técnicos, con soporte de hasta 3 gráficos simultáneos del mismo activo en diferentes timeframes.

**Por qué ahora:** necesidad personal real de validar estrategias con datos confiables; el proyecto está orientado a un MVP básico en 2 semanas con costo cero.

## 2. Objetivos

### Objetivo general

Construir una aplicación web de escritorio (MVP) que permita descargar, limpiar, almacenar y visualizar datos históricos de forex, metales y petróleo desde Dukascopy, para explorar manualmente posibles estrategias de trading con latencia comparable a las apps de trading existentes.

### Objetivos específicos (SMART)

- **OE-1:** Descargar datos históricos de Dukascopy (activo + rango de fechas) en timeframe de 1 segundo UTC, limpiarlos al formato `time/open/high/low/close` y almacenarlos en Parquet + DuckDB de forma incremental (completando sin duplicar ni borrar) — operativo al cierre de la semana 1.
- **OE-2:** Visualizar velas japonesas con zoom y pan, herramientas de dibujo (líneas, rectángulos, retrocesos de Fibonacci, simulador de compra/venta) e indicadores técnicos configurados (medias móviles, RSI, ATR), con hasta 3 gráficos del mismo activo en distintos timeframes — operativo al cierre de la semana 2.
- **OE-3:** Permitir seleccionar activo, rango de fechas y timeframe desde la base local con latencia comparable a apps de trading.
- **OE-4:** Exportar una captura en imagen (gráfico + dibujos) que verifique la estrategia visualizada.

### KPIs

| KPI | Métrica | Meta | Frecuencia |
|-----|---------|------|------------|
| KPI-1 | Tiempo de descarga de 2 años de datos desde Dukascopy | [PENDIENTE] minutos como máximo | Por descarga |
| KPI-2 | Latencia de pan/zoom comparable a apps de trading | Interacción estable (objetivo 60 FPS) | Por sesión |
| KPI-3 | Carga de gráfico desde datos guardados | < 2 s tras seleccionar activo + rango + timeframe | Por carga |
| KPI-4 | Descargas incrementales sin duplicados | 0 filas duplicadas al agregar un nuevo periodo | Por descarga |

## 3. Alcance

### 3.1 Dentro del alcance (IN)

1. Descargar datos históricos de Dukascopy seleccionando activo, fecha de inicio y fecha final (timeframe base 1s, UTC).
2. Limpieza y preparación de datos: índice temporal, resampling, imputación de valores faltantes, feature engineering, formato `time/open/high/low/close`.
3. Exclusión de fines de semana (activación semanal) y días feriados para evitar gaps.
4. Almacenamiento en Parquet (formato) + DuckDB (motor de consulta).
5. Descargas incrementales: completan datos de activos existentes, sin borrar ni duplicar.
6. Selección de activo desde los datos guardados.
7. Selección de rango de fechas por el usuario al cargar desde la base (ej. 01/01/2026 → 31/01/2026).
8. Representación en timeframes 1m / 5m / 15m / 1h / 4h / 1d derivados de los datos de 1 segundo.
9. Gráfico de velas japonesas con funciones de zoom y pan.
10. Herramientas de dibujo: líneas, rectángulos, retrocesos de Fibonacci, simulador de compra y venta; creación y borrado.
11. Indicadores técnicos: medias móviles configurables, RSI, ATR.
12. Hasta 3 gráficos del mismo activo con diferente timeframe desplegados a la vez.
13. Export de captura en imagen (gráfico + dibujos) para verificación de estrategias.
14. Arquitectura modular y extensible (agregar una característica nueva no debe generar trauma).
15. Interfaz gráfica minimalista pero eficiente y completa.

### 3.2 Fuera del alcance (OUT)

- **No** otras fuentes de datos (solo Dukascopy).
- **No** activos fuera de forex, metales y petróleo.
- **No** cargar datos en tiempo real.
- **No** creador de estrategias.
- **No** evaluación automática de estrategias.
- **No** trading en vivo.
- **No** autenticación / multiusuario / roles.
- **No** persistencia de dibujos/estrategias dentro de la app (solo export a imagen).

## 4. Stakeholders

| Rol | Interés | Influencia | Expectativa |
|-----|---------|------------|-------------|
| Usuario único (tú) | Funcionalidad completa y fluida | Alta | Validar estrategias de trading de forma visual |
| Promotor / Ticket de dinero | Cero costos | Alta | MVP sin costos de licencia ni SaaS |

*Nota: al ser uso personal de una sola persona, los roles de Sponsor, Arquitecto, Dev, QA y PM convergen en un único actor.*

## 5. Restricciones

| Tipo | Descripción | Origen |
|------|-------------|--------|
| Tecnológica | Parquet como formato de archivo | project.md |
| Tecnológica | DuckDB como motor de consulta | project.md |
| Tecnológica | Stack preferido: Python (backend) + React/Vite (frontend) | Preferencia del usuario |
| Económica | Presupuesto $0 (stack 100% open-source) | Usuario |
| Plazo | MVP en 2 semanas (negociable si es absolutamente necesario) | Usuario |
| Operativa | UTC exclusivo para timestamps (Dukascopy permite elegir zona) | Usuario |
| Plataforma | Navegadores de escritorio modernos | project.md |
| Normativa | Sin datos personales (PII) ni datos de clientes | Por diseño |

## 6. Supuestos

- **S-1:** Dukascopy expone descarga de datos históricos gratuita y accesible sin token para forex, metales y petróleo.
- **S-2:** Los datos descargados incluyen timestamps en segundos (UTC) con formato OHLC.
- **S-3:** Un PC de escritorio moderno basta para manejar 2 años de datos a 1s (~18M filas/activo) con latencia de app de trading.
- **S-4:** El navegador moderno puede renderizar velas de forma fluida sin librería de gráficos de pago.
- **S-5:** La API de Dukascopy permite seleccionar zona horaria; se usará UTC exclusivamente.
- **S-6:** Los dibujos/estrategias se consideran fuera del almacenamiento interno (solo imagen exportada).

## 7. Riesgos

| ID | Descripción | Prob. | Impacto | Exposición | Mitigación |
|----|-------------|-------|---------|------------|------------|
| R-001 | Dukascopy corta o degrada descargas masivas | B | M | Media | Retardos temporales de hasta 20 s entre descargas |
| R-002 | Volumen de datos (2 años @ 1s) degrada la interfaz de gráficos | M | A | **Alta** | Preprocesamiento eficiente, carga por rangos, framework de gráficos optimizado |
| R-003 | Plazo de 2 semanas insuficiente | M | M | Media | Alcance ajustado a MVP; plazo negociable |
| R-004 | Formato/estado de datos inesperado de Dukascopy (gaps, NaN) | M | M | Media | Pipeline de limpieza y adecuación (Fase de procesamiento) |
| R-005 | Estructura final de datos no consumible por el framework de visualización | M | A | **Alta** | Fijar esquema tras validar el contrato de datos de la librería de gráficos |

## 7.1 Preguntas abiertas (from session-handoff)

- **P-1:** Meta numérica del KPI-1 (tiempo máximo de descarga de 2 años). [impacta: backlog]
- **P-2:** Formato exacto de la imagen exportada (PNG) y resolución/dimensiones. [impacta: stack/implement]
- **P-3:** ~~Política específica de imputación de NaN/gaps (p. ej. forward-fill, eliminación).~~ → **RESUELTO (2026-09-18):** política **"Eliminar + FF acotado"** (`G_MAX=60 s`): se descartan filas con NaN en OHLC base; los gaps intra-sesión ≤ 60 s se rellenan con vela plana al último close (open=high=low=close=último close); gaps mayores o fuera de sesión quedan como hueco real gestionado por exclusión de no-mercado (TASK-012/013). Log WARN `imputacion_aplicada` con `filas_afectadas`. [impacta: stack/implement]
- **P-4:** ~~Framework/librería de gráficos~~ → **RESUELTO (2026-09-17):** `lightweight-charts` v4 + overlay canvas propio (ADR-005).

## 8. Matriz de navegación por rol

| Rol | Documentos que debe leer | Frecuencia |
|-----|--------------------------|------------|
| Sponsor | plan.md | Al inicio y cierre de fase |
| Arquitecto | plan.md, requirements.md, architecture.md | Continuo |
| Dev | requirements.md, backlog.md, architecture.md | Diario |
| QA | requirements.md, traceability.md | Continuo |
| PM | plan.md, status.md | Diario |

> *Rol único: revisar los documentos prioritarios de cada rol en función de la tarea del día.*