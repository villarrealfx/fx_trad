"""Cliente de descarga Dukascopy vía API chart freeserv (RF-001, RX-101; ADR-010).

Descarga velas OHLC de **1 minuto** (BID) del rango solicitado desde
``freeserv.dukascopy.com`` (endpoint público de charts, path ``chart/json3``) con
la librería ``dukascopy-python`` (ADR-010) y las mapea al contrato ``Candle``.

La base canónica es 1 m (ADR-012). La paginación la resuelve la librería a
30.000 puntos y el planificador (TASK-052) acota la ventana; el pacing y los
reintentos por bloque viven en ``ingest`` (ADR-013), no en este cliente.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime

import structlog
from dukascopy_python import (  # type: ignore[import-untyped]
    INTERVAL_MIN_1,
    OFFER_SIDE_BID,
    fetch,
)

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest.catalog import is_known_asset

logger = structlog.get_logger()

FREESERV_INSTRUMENT: dict[str, str] = {
    "EURUSD": "EUR/USD",
    "GBPUSD": "GBP/USD",
    "USDJPY": "USD/JPY",
    "GBPJPY": "GBP/JPY",
    "EURJPY": "EUR/JPY",
    "AUDUSD": "AUD/USD",
    "USDCAD": "USD/CAD",
    "EURGBP": "EUR/GBP",
    "XAUUSD": "XAU/USD",
    "XAGUSD": "XAG/USD",
    "WTI": "E_Light",
    "BRENT": "E_Brent",
}
"""Mapeo de símbolo canónico del catálogo a id de instrumento de la API chart.

Los id siguen la nomenclatura con ``/`` de la API freeserv; petróleo y ciertos
índices usan el prefijo ``E_`` de los CFD de energía.
"""

type Fetcher = Callable[
    [str, str, str, datetime, datetime, int | None],
    object,
]
"""Firma del fetcher inyectable (``dukascopy_python.fetch``)."""


def instrument_id_for(symbol: str) -> str:
    """Devuelve el id freeserv del activo del catálogo."""
    if not is_known_asset(symbol):
        raise KeyError(f"El símbolo '{symbol}' no está en el catálogo (TASK-001).")
    return FREESERV_INSTRUMENT[symbol]


def _as_utc(value: datetime) -> datetime:
    """Interpreta un ``datetime`` naive como UTC y normaliza el resto a UTC.

    Args:
        value: Instante a normalizar (RNF-004).

    Returns:
        El mismo instante con zona horaria UTC.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def candles_from_ohlc(data: object) -> list[Candle]:
    """Convierte el DataFrame OHLC de ``dukascopy_python.fetch`` a velas canónicas.

    Para los intervalos OHLC la librería devuelve un ``DataFrame`` con índice de
    timestamps UTC y columnas ``open/high/low/close/volume``; aquí se mapea sin
    transformación de precio y se descarta el volumen (contrato ``Candle``).

    Args:
        data: ``DataFrame`` devuelto por ``fetch`` (o ``None`` si no hay datos).

    Returns:
        Velas ordenadas ascendentemente por ``time`` (segundos UTC).

    Raises:
        TypeError: si ``data`` no es un ``pandas.DataFrame``.
    """
    if data is None:
        return []
    import pandas as pd  # type: ignore[import-untyped]

    if not isinstance(data, pd.DataFrame):
        raise TypeError("Se espera un DataFrame devuelto por dukascopy_python.fetch")
    candles: list[Candle] = []
    for timestamp, row in data.iterrows():
        candles.append(
            Candle(
                time=int(timestamp.timestamp()),
                open=float(row["open"]),
                high=float(row["high"]),
                low=float(row["low"]),
                close=float(row["close"]),
            )
        )
    return candles


class FreeservClient:
    """Cliente de la API chart freeserv de Dukascopy.

    Se inyecta el fetcher para poder simularlo en tests sin red; en producción
    es ``dukascopy_python.fetch`` (ADR-010).
    """

    def __init__(self, fetcher: Fetcher | None = None) -> None:
        self._fetcher = fetcher or fetch

    def download_range(self, symbol: str, start: datetime, end: datetime) -> list[Candle]:
        """Descarga velas OHLC de 1 minuto (BID) del rango ``[start, end]``.

        Llama a ``fetch`` con ``INTERVAL_MIN_1`` y ``OFFER_SIDE_BID``; la librería
        pagina internamente a 30.000 puntos (ADR-013). La ventana la provee el
        planificador (TASK-052), por lo que aquí no se fragmenta el rango.

        Args:
            symbol: Símbolo canónico del catálogo.
            start: Inicio del rango (si es naive se asume UTC).
            end: Fin del rango (si es naive se asume UTC).

        Returns:
            Velas de 1 m ordenadas ascendentemente por ``time`` (segundos UTC).

        Raises:
            KeyError: si ``symbol`` no está en el catálogo.
            TypeError: si el fetcher no devuelve un ``DataFrame``.
        """
        instrument = instrument_id_for(symbol)
        start_utc = _as_utc(start)
        end_utc = _as_utc(end)
        logger.info(
            "descarga_rango_iniciada",
            activo=symbol,
            instrumento=instrument,
            inicio_utc=start_utc,
            fin_utc=end_utc,
        )
        data = self._fetcher(instrument, INTERVAL_MIN_1, OFFER_SIDE_BID, start_utc, end_utc, None)
        candles = candles_from_ohlc(data)
        logger.info(
            "descarga_rango_completada",
            activo=symbol,
            velas=len(candles),
            inicio_utc=start_utc,
            fin_utc=end_utc,
        )
        return candles


__all__ = [
    "FREESERV_INSTRUMENT",
    "Fetcher",
    "FreeservClient",
    "candles_from_ohlc",
    "instrument_id_for",
]
