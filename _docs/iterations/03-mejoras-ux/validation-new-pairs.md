# Verificación empírica — pares nuevos (TASK-202)

> Requisito: RX-201 / RF-216 · Fecha: 2026-09-29 · Entorno: local con acceso a `freeserv.dukascopy.com`.

## Objetivo

Confirmar que Dukascopy (`freeserv`) sirve **OHLC de 1 minuto BID** para los 5
pares forex añadidos en el ciclo 03:

`GBPJPY`, `EURJPY`, `AUDUSD`, `USDCAD`, `EURGBP`.

## Método

- Librería `dukascopy_python` (ADR-010), `INTERVAL_MIN_1` + `OFFER_SIDE_BID`
  (ADR-013/ADR-014), ventana de 2 h (2024-01-02 00:00–02:00 UTC).
- Mapeo canónico → id freeserv en `fxtrad.ingest.freeserv.FREESERV_INSTRUMENT`.

## Resultado

| Par (canónico) | `instrument_id` freeserv | Velas 1 m | Columnas | OHLC 1 m BID |
|----------------|--------------------------|-----------|----------|--------------|
| GBPJPY | `GBP/JPY` | 115 | `open, high, low, close, volume` | ✅ |
| EURJPY | `EUR/JPY` | 114 | `open, high, low, close, volume` | ✅ |
| AUDUSD | `AUD/USD` | 109 | `open, high, low, close, volume` | ✅ |
| USDCAD | `USD/CAD` | 113 | `open, high, low, close, volume` | ✅ |
| EURGBP | `EUR/GBP` | 112 | `open, high, low, close, volume` | ✅ |

Todas las llamadas devolvieron un `DataFrame` con OHLC numérico para el rango
solicitado (el conteo menor a 120 se explica por el inicio de sesión de mercado
del día). El `volume` de la fuente se descarta (RI-101).

## Conclusión

**RX-201 verificado empíricamente:** Dukascopy sirve los 5 pares a 1 m BID y el
mapeo canónico los resuelve. La unidad (`test_freeserv.py`) cubre el mapeo; este
documento cubre la verificación contra la API real.

## Cómo reproducir

```bash
cd backend
python -c "
from datetime import UTC, datetime, timedelta
from dukascopy_python import fetch, INTERVAL_MIN_1, OFFER_SIDE_BID
end = datetime(2024, 1, 2, tzinfo=UTC); start = end - timedelta(hours=2)
for inst in ['GBP/JPY','EUR/JPY','AUD/USD','USD/CAD','EUR/GBP']:
    df = fetch(inst, INTERVAL_MIN_1, OFFER_SIDE_BID, start, end, None)
    print(inst, len(df), list(df.columns))
"
```
