# Plan del Proyecto: Optimización de descarga y base 1m

**Iteración:** 02
**Estado:** Borrador
**Fecha:** 28 de septiembre de 2026
**Precede:** `_docs/iterations/01-mvp/`

## 1. Contexto y justificación

La iteración 01 (MVP) quedó cerrada al 100%, pero la descarga de datos históricos
desde Dukascopy **nunca llegó a completarse**: una prueba de un solo mes de datos
superó los 30 minutos de ejecución y fue interrumpida. No existe ningún archivo
Parquet de series reales en el repositorio.

El análisis del código identificó dos causas raíz, ambas en `backend/src/fxtrad/ingest`:

1. **Fragmentación redundante:** `run_download_range` recorre el rango **hora a
   hora** (`tasks.py:250` → `iter_hours`) y hace una petición HTTP por hora
   (`freeserv.py:download_hour`). Para 31 días son 744 peticiones; para 2 años,
   17.520. Sin embargo, `dukascopy_python.fetch` **ya pagina internamente** con
   `limit=30_000` y un cursor `last_update` (`__init__.py:177-288`), por lo que
   basta con una llamada por bloque.
2. **Payload innecesario:** se solicita `INTERVAL_TICK` (miles de ticks por hora)
   y se agregan a velas de 1 s en Python con `DataFrame.iterrows()`
   (`freeserv.py:aggregate_to_ohlc`). Una prueba independiente con
   `INTERVAL_MIN_1` redujo 31 días de 138 s (1 s) a ~10 s (1 m).

Además, el timeframe base de 1 s se definió para soportar eventuales timeframes
sub-minuto (30 s, 15 s) que **no se usan**: los timeframes de estudio son 1 m, 5 m,
15 m y 30 m en adelante, y ningún cálculo requiere resolución de 1 s.

**Por qué ahora:** sin descargas viables, la aplicación no tiene datos y el MVP no
es utilizable. La corrección es acotada (solo `ingest` + base 1 m) y de alto
impacto.

## 2. Objetivos

### Objetivo general

Hacer viable la descarga de datos históricos de Dukascopy cambiando la base a
velas de **1 minuto** obtenidas directamente de la API (sin ticks ni agregación
local) y eliminando la fragmentación por hora, respetando el límite de 30.000
puntos por petición.

### Objetivos específicos (SMART)

- **OE-1:** Descargar 1 año de datos de un activo en **≤ 900 s** (y 2 años en
  dos tandas en **≤ 1800 s**), con base 1 m, al cierre de la iteración.
- **OE-2:** Sustituir la base canónica de 1 s por 1 m en el pipeline y el
  almacenamiento, con derivadas 5 m/15 m/30 m/1 h/4 h/1 d por resampling,
  actualizando RNF-002, el benchmark y las referencias de UI.
- **OE-3:** Paginar por bloques de **≤ 30.000 velas** con un **precálculo** del
  número de velas del rango y una **espera de 20 s** entre bloques, reanudable por
  tanda.
- **OE-4:** Mantener Celery/RabbitMQ (decisión de mínimo riesgo) y conservar
  fusión incremental, metadatos y filtro de fines de semana/feriados.

### KPIs

| KPI | Métrica | Meta | Frecuencia |
|-----|---------|------|------------|
| KPI-1 | Tiempo de descarga de 1 año @ 1 m | ≤ 900 s | Por descarga |
| KPI-2 | Tiempo de descarga de 2 años (2 tandas) | ≤ 1800 s | Por descarga |
| KPI-3 | Volumetría por activo (2 años @ 1 m) | ~726.000 velas | Por activo |
| KPI-4 | Descargas incrementales sin duplicados | 0 filas duplicadas al agregar periodo | Por descarga |
| KPI-5 | Integridad de la paginación | 0 huecos no explicados por mercado | Por tanda |

> Heredados de 01-mvp sin cambio: KPI-2 de latencia de UI (60 FPS) y KPI-3 de
> carga desde base (< 2 s).

## 3. Alcance

### 3.1 Dentro del alcance (IN)

1. Descargar velas OHLC **1 m** (`INTERVAL_MIN_1`) con `OFFER_SIDE_BID` por rango
   de activo/fechas.
2. **Precálculo** de velas esperadas del rango y partición en bloques de
   **≤ 30.000 velas**, con **espera de 20 s** entre bloques.
3. Base canónica **1 m** almacenada en `{symbol}.1m.parquet` y derivadas
   5 m/15 m/30 m/1 h/4 h/1 d por resampling.
4. Descarga por **tandas de 6–12 meses** con progreso y reanudación, vía Celery
   (se mantiene).
5. Fusión/upsert incremental y metadatos de descarga (reutiliza RF-006/RI-002 de
   01-mvp).
6. Exclusión de fines de semana y feriados (reutiliza RF-004 de 01-mvp).
7. Actualización de las referencias obsoletas de 1 s: RNF-002, `benchmark_parquet.py`,
   naming de Parquet y notas de UI.

### 3.2 Fuera del alcance (OUT)

- Base 1 s y timeframes sub-minuto (30 s, 15 s).
- Migración o conversión de datos 1 s (no existen Parquet).
- Multiusuario y autenticación.
- Tiempo real, creador/evaluador de estrategias y trading en vivo (ya OUT en
  `project.md` §3).
- Herramientas de dibujo o indicadores nuevos.
- Retirar Celery/RabbitMQ (decisión: se conservan).
- Otras fuentes de datos distintas de Dukascopy.

## 4. Stakeholders

| Rol | Interés | Influencia | Expectativa |
|-----|---------|------------|-------------|
| Usuario único (propietario) | Obtener datos históricos en tiempos razonables para análisis técnico manual | Alta | Descarga de 1–2 años en minutos, no horas |
| Mantenedor del código | Cambio acotado y de bajo riesgo | Alta | Tocar solo `ingest` + base, sin romper el MVP |

## 5. Restricciones

| Tipo | Descripción | Origen |
|------|-------------|--------|
| API | `dukascopy_python` limita a **30.000** puntos por petición (`limit` máx.) | Librería (`__init__.py:258`) |
| Mercado | Ventana máxima de 2 años desde la fecha de descarga | RNF-003 (01-mvp) |
| Operativa | Celery/RabbitMQ se conservan; descarga por tandas de 6–12 meses | Decisión de sesión |
| Semántica | Solo BID (`OFFER_SIDE_BID`); no `mid` (exigiría ticks) | Decisión de sesión (S-1) |
| Costo | $0 (solo OSS) | RNF-006 (01-mvp) |
| Plazo | 2 semanas (negociable) | RNF-007 (01-mvp) |

## 6. Supuestos

- **S-1:** `INTERVAL_MIN_1` + `OFFER_SIDE_BID` entrega OHLC agregado en origen a
  partir del precio **BID**; la serie cambia de semántica respecto a la base
  anterior (`mid = (bid+ask)/2`). **Aceptado y documentado.**
- **S-2 [PENDIENTE]:** la paginación interna de `fetch` (30.000/página) cubre
  6–12 meses sin intervención y sin huecos, y el pacing de 20 s evita el 503.
  Debe validarse empíricamente con una tanda real antes de cerrar la iteración.
- **S-3:** `fetch` devuelve columnas `timestamp, open, high, low, close, volume`
  (`__init__.py:117`); `volume` se descarta y el resto encaja con el contrato
  `Candle` sin transformaciones.
- **S-4:** la base 1 m no degrada los indicadores ni el resampling existentes
  (5 m/15 m/30 m/1 h/4 h/1 d se derivan correctamente de 1 m).

## 7. Riesgos

| ID | Descripción | Prob. | Impacto | Exposición | Mitigación |
|----|-------------|-------|---------|------------|------------|
| R-001 | freeserv responde 503/timeout en tandas largas (ex AR-1 de 01-mvp) | A | A | A×A | Reintentos con backoff + tandas de 6–12 m + pacing de 20 s |
| R-002 | La paginación interna no cubre 6–12 m o deja huecos silenciosos | M | A | M×A | Test de integridad: velas esperadas (calendario) vs. descargadas (S-2, KPI-5) |
| R-003 | Cambio de base 1 s→1 m rompe `resample`, naming, UI ("nota 1s UTC"), RNF-002 y tests | A | M | A×M | ADR nuevo + actualizar trazabilidad y artefactos obsoletos |
| R-004 | Semántica BID vs `mid`: series no comparables con lo previo | A | B | A×B | Aceptado (S-1) y documentado en glosario |
| R-005 | Corte por timeout (>30 min) a mitad de tanda | M | M | M×M | Descarga/progreso por tanda y reanudación |

## 8. Matriz de navegación por rol

| Rol | Documentos que debe leer | Frecuencia |
|-----|--------------------------|------------|
| Usuario (sponsor) | plan.md | Al inicio y cierre de iteración |
| Arquitecto | plan.md, requirements.md, ADR de descarga | Continuo |
| Dev | requirements.md, backlog.md, ADR de descarga | Diario |
| QA | requirements.md, traceability.md | Continuo |
