# ADR-010: Transporte de datos vía API chart freeserv con dukascopy-python

- **Fecha:** 2026-09-21
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RF-001, RF-002, RX-001, RNF-003, RNF-004, RNF-006

## Contexto

El ingest de datos históricos descarga archivos ``bi5`` de hora en hora desde
``https://datafeed.dukascopy.com/datafeed`` (TASK-002, ADR-002). Desde la red
del usuario ese dominio devuelve de forma sostenida **HTTP 503 y 429** (rate
limit), también para horas que antes se descargaban correctamente (la DoD de
TASK-002: EURUSD 2026-08-11 10:00 UTC da 429 el 2026-09-21). La descarga se
cumple en el papel (R-001, R-002) pero queda bloqueada en la práctica, lo que
impide alcanzar RX-001 (integración Dukascopy) y el E2E de dev.

En paralelo, la **API pública de charts** de Dukascopy
(``https://freeserv.dukascopy.com/2.0/index.php?path=chart/json3``) responde
HTTP 200 con ticks reales del mismo proveedor, y la librería de terceros
``dukascopy-python`` 4.x la envuelve con paginación por ``last_update``,
reintentos (``max_retries=7`` + ``sleep(1)``) y devolución de un ``DataFrame``.
El usuario ya verificó manualmente que descarga con éxito.

## Decisión

Sustituir el datafeed bi5 como **único** transporte del módulo ingest por la
API chart freeserv usando **``dukascopy-python >= 4.0.1, < 5``**. El nuevo
cliente ``FreeservClient`` mantiene la misma interfaz pública
``download_hour(symbol, year, month_index, day, hour) -> list[Candle]`` que
usaba ``DukascopyClient``, por lo que ``tasks.py``, el contrato de cola
(ADR-006) y el pipeline no cambian de forma.

No se ofrece selector de transporte: se elimina el código bi5 de producción
para evitar confusión entre dos fuentes. El contrato OHLC de salida es
idéntico (velas 1 s UTC, RNF-004), con el mismo ``time`` calculado por
``hour_start_epoch``.

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Solo bi5 (estado actual) | Sin dependencias nuevas | 503/429 sostenido desde la red del usuario; DoD falla | Bloquea RX-001 y el uso real |
| Mantener bi5 + freeserv detrás de env | Redundancia | Dos fuentes activas, más tests y matenimiento; riesgo de datos mezclados | Añade complejidad sin beneficio demostrado (bi5 no funciona hoy) |
| Cliente freeserv propio (urllib) | Sin dependencia externa | Duplica paginación `last_update` y manejo de errores ya resueltos | Rehace la rueda; la librería es MIT y activa |
| **dukascopy-python sobre freeserv** | Funciona hoy, MIT ($0, RNF-006), retry incluido, 7 instrumentos mapeados | Dependencia nueva (pandas + requests) | Cumple RNF-001/RX-001 sin reinventar la paginación |

## Consecuencias

### Positivas
- RX-001 y el E2E de dev vuelven a ser alcanzables: la fuente responde 200.
- Retry/backoff integrado en la librería (mitiga R-001 a nivel transporte).
- Contrato de salida idéntico al bi5: ``Candle`` 1 s UTC (RNF-004), sin tocar
  ``tasks.py``, pipeline ni frontend.
- Instante de cada tick con marca UTC absoluta: se elimina la conversión por
  ``hour_start_epoch`` del archivo, pero se conserva para el ``time`` de la vela.

### Negativas / Trade-offs
- Dependencias nuevas (``pandas``, ``requests``) en el runtime del backend,
  ya previstas en ADR-002.
- El volumen por tick viene reescalado por la librería (÷1e6) y no se
  conserva en el contrato ``Candle`` (RF-003); no se registra volumen, como ya
  ocurría con bi5.
- La paginación es por ventana de ticks (``last_update``), no por archivo
  horario: una hora larga puede requerir varias requests (mismo coste de red).

### Neutras
- ``dukascopy-python`` es MIT, activo y sin coste (RNF-006).
- El cliente bi5 se retira: ``dukascopy.py`` y sus tests dejan de existir.

## Referencias

- `_docs/plan.md` R-001/R-002, ciclo de descarga
- `_docs/requirements.md` RF-001, RF-002, RX-001, RNF-003, RNF-004, RNF-006
- `_docs/adr/ADR-002-backend-python-fastapi.md`, `ADR-006-cola-celery-rabbitmq.md`
- https://pypi.org/project/dukascopy-python/ · https://github.com/Eghosa-Osayande/dukascopy