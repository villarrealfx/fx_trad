# Requisitos — Iteración 02 (Optimización de descarga y base 1m)

> Prioridad MoSCoW: **M**ust / **S**hould / **C**ould / **W**on't
> Tipos: **RF** (Funcional), **RNF** (No funcional), **RI** (Información), **RX** (Integración)
> Numeración: los IDs `1xx` son propios de esta iteración; los `0xx` heredan de
> `_docs/iterations/01-mvp/requirements.md`.

## Requisitos funcionales

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RF-101 | RF | La descarga debe obtener velas OHLC de 1 minuto (`INTERVAL_MIN_1`) desde freeserv, en lugar de ticks agregados localmente | M | Dado un activo y un rango, cuando se descarga, entonces las velas tienen intervalo de 1 m y timestamps UTC | Sesión (usuario) |
| RF-102 | RF | El sistema debe precalcular las velas esperadas del rango y particionarlo en bloques de ≤ 30.000 velas, esperando 20 s entre bloques | M | Dado un rango que excede 30.000 velas, cuando se descarga, entonces se emiten peticiones por bloques ≤ 30.000 con 20 s de espera entre ellas | Sesión (usuario) |
| RF-103 | RF | La serie canónica debe ser 1 m y las derivadas 5 m/15 m/30 m/1 h/4 h/1 d deben obtenerse por resampling | M | Dado un dataset 1 m, cuando se solicita 1 h, entonces la vela 1 h agrega exactamente las 60 velas 1 m correspondientes | Sesión (usuario) |
| RF-104 | RF | La descarga debe ejecutarse por tandas de 6–12 meses con progreso y reanudación, mediante la cola Celery | M | Dado un rango mayor a 12 meses, cuando se descarga, entonces se ejecuta en tandas, el estado refleja el progreso y una tanda interrumpida puede reanudarse | Sesión (usuario) |
| RF-105 | RF | La fusión debe ser incremental (upsert por `time`) sin duplicar ni borrar, y registrar metadatos de descarga | M | Dado un activo con datos previos, cuando se descarga un periodo nuevo, entonces no hay filas duplicadas y queda el metadato del rango | 01-mvp RF-006/RI-002 |
| RF-106 | RF | El sistema debe excluir fines de semana (cierre semanal) y días feriados | M | Dado un rango con fines de semana o feriados, cuando se procesan, entonces no hay filas en esos periodos | 01-mvp RF-004 |

## Requisitos no funcionales

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RNF-101 | RNF | La descarga de 1 año a 1 m debe completarse en ≤ 900 s; la de 2 años (2 tandas) en ≤ 1800 s | M | Dado un activo, cuando se descarga 1 año / 2 años a 1 m, entonces el tiempo medido respeta el límite | Sesión (usuario) |
| RNF-102 | RNF | El sistema debe manejar ~726.000 velas por activo (2 años @ 1 m) | M | Dado un activo con la volumetría máxima estimada, cuando se carga y consulta, entonces la app responde según RNF-001 (60 FPS) | Sesión (usuario) |
| RNF-003 | RNF | La ventana de datos históricos debe cubrir 2 años desde la fecha de descarga | M | Dado un activo, cuando se solicita descarga, entonces el sistema permite hasta 2 años de antigüedad | Heredado 01-mvp |
| RNF-004 | RNF | Uso exclusivo de UTC en timestamps | M | Dado cualquier timestamp almacenado/consultado, cuando se procesa, entonces está en UTC en segundos | Heredado 01-mvp |
| RNF-005 | RNF | La aplicación debe funcionar en navegadores de escritorio modernos | M | Dado un navegador de escritorio moderno, cuando se abre la app, entonces funciona sin plugins ni licencias de pago | Heredado 01-mvp |
| RNF-006 | RNF | Costo total de la solución: $0 (solo OSS) | M | Dado el inventario del stack, cuando se audita licencias, entonces no hay componentes comerciales | Heredado 01-mvp |
| RNF-007 | RNF | Iteración entregable en 2 semanas (plazo negociable) | M | Dado el alcance IN, cuando se completa la iteración, entonces está operativa al cierre de la semana 2 | Heredado 01-mvp |
| RNF-008 | RNF | La estructura final de datos debe ser directamente consumible por el framework de visualización (sin hacks) | M | Dado el contrato de la librería de gráficos, cuando se define el esquema, entonces no se requieren transformaciones ad-hoc en el frontend | Heredado 01-mvp |

> **Obsoleto por esta iteración:** RNF-002 de 01-mvp ("~18M filas/activo, 2 años @
> 1 s") queda reemplazado por RNF-102 (~726k velas, 2 años @ 1 m).

## Requisitos de información

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RI-101 | RI | La serie base debe almacenarse con `time` BIGINT epoch UTC y `open/high/low/close` numéricos; el volumen se descarta | M | Dada una vela almacenada, cuando se inspecciona el esquema, entonces `time` es entero UTC y OHLC numérico, sin columna de volumen | Sesión (usuario) |
| RI-102 | RI | La base 1 m se persiste en `{symbol}.1m.parquet` y las derivadas en `{symbol}.{tf}.parquet` | M | Dado un activo descargado, cuando se revisa el disco, entonces existen los Parquet de 1 m y de los timeframes derivados | ADR-007 (01-mvp) |
| RI-002 | RI | Registro de metadatos por descarga (activo, rango, estado, filas) | M | Tras una descarga, el historial muestra activo, rango, estado y filas | Heredado 01-mvp |

## Requisitos de integración

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RX-101 | RX | Integrar con `freeserv.dukascopy.com` (path `chart/json3`) con `INTERVAL_MIN_1` y `OFFER_SIDE_BID` | M | Dada una petición de 1 m, la API responde OHLC BID y el sistema lo consume sin errores | Sesión (usuario) |
| RX-001 | RX | Integración con la fuente Dukascopy (reintentos, backoff) | M | Ante un fallo HTTP, el sistema reintenta con backoff y reporta estado parcial/fallo | Heredado 01-mvp |
