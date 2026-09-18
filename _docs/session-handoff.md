# Handoff de Sesión `/sdd-brainstorm`

## Resumen ejecutivo (5 líneas)

1. MVP personal de análisis técnico (estilo TradingView) para validar estrategias de trading con datos históricos.
2. Fuente de datos única: Dukascopy, solo forex, metales y petróleo; descargas en timeframe 1s UTC e incrementales (sin duplicar ni borrar).
3. Pipeline de limpieza (índice temporal, resampling, imputación, feature engineering) que alimenta Parquet + DuckDB.
4. Interfaz web con velas japonesas, zoom/pan, dibujos (líneas, rectángulos, Fibonacci, simulador compra/venta), indicadores (RSI, ATR, MM) y hasta 3 gráficos del mismo activo en distintos timeframes.
5. Sin costos ($0), plazo 2 semanas, y arquitectura deliberadamente extensible.

## Artefactos generados

- `_docs/plan.md`
- `_docs/requirements.md`
- `_docs/glossary.md`
- `_docs/traceability.md`
- `_docs/session-handoff.md`

## Decisiones tomadas

- **D-1:** Fuente de datos exclusiva Dukascopy; fuera de alcance: otras fuentes y activos distintos a forex/metales/petróleo.
- **D-2:** Descarga base a 1 segundo en UTC; timeframes de visualización 1m/5m/15m/1h/4h/1d por resampling.
- **D-3:** Almacenamiento obligatorio Parquet + DuckDB.
- **D-4:** Descargas incrementales que completan activos existentes sin duplicar ni borrar (control por metadatos de descarga).
- **D-5:** Persistencia de estrategias: solo export a imagen (PNG) con gráfico + dibujos; los dibujos no se guardan en la app.
- **D-6:** Carga desde la base local con selección de activo + rango de fechas (fecha inicio/fin) por el usuario.
- **D-7:** Alcance OUT explícito: sin tiempo real, sin creador/evaluación automática de estrategias, sin trading en vivo, sin autenticación/multiusuario.
- **D-8:** Extensibilidad como requisito (RF-016) y estructura de datos consumible por el framework de visualización (RNF-008 / R-005).
- **D-9:** Riesgo de descargas masivas mitigado con retardos de hasta 20 s; plazo 2 semanas negociable.

## Preguntas abiertas / pendientes

- **P-1:** Meta numérica del KPI-1 (tiempo máximo de descarga de 2 años de datos). [impacta en: backlog]
- **P-2:** Formato exacto de la imagen exportada (PNG) y resolución/dimensiones. [impacta en: stack/implement]
- **P-3:** Política específica de imputación de NaN/gaps (p. ej. forward-fill, eliminación). [impacta en: stack/implement]
- **P-4:** Framework/librería de gráficos con contrato de datos compatible con el esquema final (vinculado a R-005). [impacta en: stack]

## Checklist de completitud

- [x] ¿Hay RNF definidos?
- [x] ¿Hay fuera de alcance explícito?
- [x] ¿Cada requisito tiene criterio de aceptación?
- [x] ¿Hay al menos un riesgo identificado?
- [x] ¿Hay stakeholders definidos?
- [x] ¿Hay KPIs medibles?

## Próximo skill sugerido

`/sdd-stack` — Selección de Stack Tecnológico y Arquitectura.