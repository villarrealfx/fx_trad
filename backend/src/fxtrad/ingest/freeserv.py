"""Cliente de descarga Dukascopy vía API chart freeserv (RF-001, RF-002, RX-001).

Descarga ticks históricos desde ``freeserv.dukascopy.com`` (endpoint público de
charts, path ``chart/json3``) con la librería ``dukascopy-python`` (ADR-010) y
los agrega a velas OHLC de 1 segundo UTC (RNF-004), con el mismo contrato
``Candle`` que producía el datafeed bi5 que sustituye (TASK-002).

Los timestamps de la API son marcas UTC absolutas (ms desde epoch); la
interfaz pública ``download_hour`` es idéntica a la del cliente anterior para
que ``tasks.py`` y el pipeline no cambien (ADR-006). Las descargas largas con
reintentos siguen siendo responsabilidad de Celery; la librería añade además un
retry interno (``max_retries=7`` + ``sleep(1)``) a nivel de HTTP.
"""

from __future__ import annotations

import calendar
from collections.abc import Callable, Iterable
from datetime import UTC, datetime, timedelta

import structlog
from dukascopy_python import (  # type: ignore[import-untyped]
    INTERVAL_MIN_1,
    INTERVAL_TICK,
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
    "XAUUSD": "XAU/USD",
    "XAGUSD": "XAG/USD",
    "WTI": "E_Light",
    "BRENT": "E_Brent",
}
"""Mapeo de símbolo canónico del catálogo a id de instrumento de la API chart.

Los id siguen la nomenclatura con ``/`` de la API freeserv; petróleo y ciertos
índices usan el prefijo ``E_`` de los CFD de energía.
"""

type Tick = tuple[int, float, float]
"""Un tick agregable: (epoch ms UTC, precio bid, precio ask) ya escalados."""


def instrument_id_for(symbol: str) -> str:
    """Devuelve el id freeserv del activo del catálogo."""
    if not is_known_asset(symbol):
        raise KeyError(f"El símbolo '{symbol}' no está en el catálogo (TASK-001).")
    return FREESERV_INSTRUMENT[symbol]


def hour_start_epoch(year: int, month_index: int, day: int, hour: int) -> int:
    """Devuelve el epoch (segundos UTC) del inicio de la hora indicada."""
    return calendar.timegm((year, month_index + 1, day, hour, 0, 0))


def aggregate_to_ohlc(ticks: Iterable[Tick], hour_start_epoch_s: int) -> list[Candle]:
    """Agrega ticks a velas OHLC de 1 segundo usando el precio medio bid/ask.

    Args:
        ticks: Ticks de una hora con marca UTC absoluta (ms desde epoch).
        hour_start_epoch_s: Epoch del inicio de la hora en segundos UTC.

    Returns:
        Velas ordenadas ascendentemente por ``time`` (segundos UTC, sin volumen).
    """
    mids_by_second: dict[int, list[float]] = {}
    for tick_ms, bid, ask in ticks:
        second = tick_ms // 1000 - hour_start_epoch_s
        if second < 0 or second >= 3600:
            continue
        mids_by_second.setdefault(second, []).append((bid + ask) / 2)

    candles: list[Candle] = []
    for second in sorted(mids_by_second):
        mids = mids_by_second[second]
        candles.append(
            Candle(
                time=hour_start_epoch_s + second,
                open=mids[0],
                high=max(mids),
                low=min(mids),
                close=mids[-1],
            )
        )
    return candles


type Fetcher = Callable[
    [str, str, str, datetime, datetime, int | None],
    object,
]
"""Firma del fetcher de ticks inyectable (``dukascopy_python.fetch``)."""


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

    def download_hour(
        self, symbol: str, year: int, month_index: int, day: int, hour: int
    ) -> list[Candle]:
        """Descarga una hora de ticks y la agrega a velas OHLC de 1 s."""
        instrument = instrument_id_for(symbol)
        start_epoch_s = hour_start_epoch(year, month_index, day, hour)
        start = datetime.fromtimestamp(start_epoch_s, tz=UTC)
        end = start + timedelta(hours=1)
        logger.info(
            "descarga_iniciada",
            activo=symbol,
            instrumento=instrument,
            inicio_utc=start,
        )
        data = self._fetcher(instrument, INTERVAL_TICK, OFFER_SIDE_BID, start, end, None)
        ticks = self._ticks_from(data)
        candles = aggregate_to_ohlc(ticks, start_epoch_s)
        logger.info(
            "descarga_completada",
            activo=symbol,
            velas=len(candles),
            inicio_utc=start_epoch_s,
        )
        return candles

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

    @staticmethod
    def _ticks_from(data: object) -> list[Tick]:
        """Normaliza el DataFrame de ``dukascopy_python.fetch`` a ticks.

        El DataFrame tiene índice de timestamps UTC y columnas
        ``bidPrice``/``askPrice`` (valores reales ya escalados). Se ignora el
        volumen, que no forma parte del contrato ``Candle``.
        """
        if data is None:
            return []
        import pandas as pd

        if not isinstance(data, pd.DataFrame):
            raise TypeError("Se espera un DataFrame devuelto por dukascopy_python.fetch")
        ticks: list[Tick] = []
        for timestamp, row in data.iterrows():
            ticks.append(
                (int(timestamp.timestamp() * 1000), float(row["bidPrice"]), float(row["askPrice"]))
            )
        return ticks


__all__ = [
    "FREESERV_INSTRUMENT",
    "Fetcher",
    "FreeservClient",
    "Tick",
    "aggregate_to_ohlc",
    "candles_from_ohlc",
    "hour_start_epoch",
    "instrument_id_for",
]
