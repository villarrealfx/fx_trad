# Interfaces y fronteras de módulos (RF-016, TASK-042)

> **Requisito:** RF-016 (agregar características sin reescribir componentes)
> **ADR:** ADR-001 (monolito modular)
> **Verificación:** `backend/tests/test_module_interfaces.py`

## 1. Regla

Cada módulo del backend expone su **interfaz pública** en su `__init__.py`
mediante `__all__`. El resto del código debe consumir el módulo **solo** por esa
interfaz (no importar submódulos internos de otro módulo). Las dependencias
directas entre módulos respetan las direcciones de `architecture.md` §4 y se
verifican con un test que analiza el AST de los imports.

`logging_config` es transversal (ADR-008) y puede importarse desde cualquier
módulo.

## 2. Módulos

| Módulo | Responsabilidad | Depende de (directo) |
|--------|-----------------|----------------------|
| `contracts` | Contrato OHLC canónico (ADR-004/RNF-008) | — |
| `storage` | Parquet + DuckDB, incremental y metadatos (ADR-004) | `contracts` |
| `pipeline` | Limpieza, resampling, UTC, persistencia e indicadores (ADR-002) | `contracts`, `storage` |
| `ingest` | Descarga Dukascopy + cola Celery (ADR-006/ADR-010) | `contracts`, `pipeline` |
| `api` | Exposición REST (ADR-002) | `contracts`, `ingest`, `storage` |

Fronteras que **no** se permiten (test negativo): `ingest` no importa `storage`
(consume el persistidor de `pipeline` por inyección), `storage` no importa
`ingest`/`pipeline`/`api`, y `contracts` no importa ningún otro módulo.

## 3. Interfaz pública

### `fxtrad.contracts`
Modelos del contrato OHLC: `Candle`, `OhlcResponse`, `Timeframe`.

### `fxtrad.storage`
- Persistencia: `ParquetSeriesStore`, `DuplicateTimeError`.
- Consulta: `SeriesQuery`, `InvalidRangeError`, `InvalidTimeframeError`.
- Caché (ADR-007): `SeriesWindowCache`, `CachedSeriesQuery`, `CacheStats`,
  `CachedWindow`, `window_key`, `DEFAULT_MAX_WINDOWS`, `DEFAULT_MAX_CANDLES`.
- Contrato de lectura: `SeriesReader`, `VersionedSeriesReader`.
- Metadatos: `DownloadMetadata`, `DownloadMetadataStore`, `DownloadStatus`.

### `fxtrad.pipeline`
- Limpieza/normalización: `clean_candles`, `CleaningResult`, `RawCandle`,
  `normalize_schema`, `normalize_row`, `normalize_time`, `normalize_price`,
  `SchemaViolationError`.
- Mercado/resampling: `MarketCalendar`, `filter_open_candles`,
  `filter_open_timestamps`, `resample_ohlc`, `ResamplingResult`,
  `InvalidTimeframeError`, `InvalidSourceTimeframeError`.
- Persistencia e incrementales: `DownloadPersister`, `build_persister`,
  `DerivedSeriesRefresher`, `parse_timeframes`, `timeframes_from_env`,
  `DERIVED_TIMEFRAMES`, `ENV_TIMEFRAMES`.
- Indicadores: `compute_indicators`, `IndicatorsResult`, `MA_PERIODS_DEFAULT`,
  `RSI_PERIOD_DEFAULT`, `ATR_PERIOD_DEFAULT`.

### `fxtrad.ingest`
- Catálogo: `ASSET_CATALOG`, `Asset`, `AssetType`, `assets_by_type`, `get_asset`.
- Descarga: `FreeservClient`, `aggregate_to_ohlc`, `hour_start_epoch`,
  `to_epoch_seconds`, `DownloadRequest`, `MAX_WINDOW_SECONDS`,
  `validate_request_window`.
- Cola/estado: `DownloadQueue`, `CeleryDownloadQueue`, `DownloadStatusQuery`,
  `CeleryDownloadStatus`, `DownloadInfo`, `DownloadStatus`, `download_asset`,
  `celery_app`.

### `fxtrad.api`
- App: `create_app`, `create_default_app`, `router`.
- Contratos REST: `AssetRow`, `AssetStatus`, `CatalogQuery`,
  `DownloadHistoryQuery`, `DownloadHistoryRow`, `DownloadRange`,
  `DownloadMetadataReader`, `DownloadAccepted`.

## 4. Protocols ↔ implementaciones

| Protocol (frontera) | Implementación de producción |
|---------------------|------------------------------|
| `ingest.DownloadQueue` | `ingest.CeleryDownloadQueue` |
| `ingest.DownloadStatusQuery` | `ingest.CeleryDownloadStatus` |
| `storage.SeriesReader` | `storage.SeriesQuery`, `storage.CachedSeriesQuery` |
| `api.DownloadMetadataReader` | `storage.DownloadMetadataStore` |

## 5. Cómo extender

- **Nuevo indicador (TASK-043):** crear un módulo en
  `pipeline/indicator_plugins/` con `register(registry)` (ver `indicator_registry`);
  `indicators.REGISTRY.discover()` lo carga sin tocar código existente. Los
  built-ins MA/RSI/ATR se consultan con `REGISTRY.compute(name, candles, period)`.
- **Nueva fuente/cola:** implementar `ingest.DownloadQueue` y usar
  `create_app(download_queue=...)`.
- **Nuevo almacenamiento/consulta:** implementar `storage.SeriesReader` e
  inyectarlo en `create_app(series_query=...)`.

Regla práctica: si una característica obliga a editar varios módulos a la vez,
probablemente falta un punto de extensión (Protocol) en la frontera.
