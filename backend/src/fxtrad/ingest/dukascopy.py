"""Cliente de descarga Dukascopy (RF-001, RF-002, RX-001).

Descarga archivos ``bi5`` por hora (timeframe tick) desde
``datafeed.dukascopy.com`` y los decodifica a velas OHLC de 1 segundo UTC
(RNF-004). Las descargas largas con reintentos son responsabilidad de Celery
(ADR-006, TASK-005); aquí solo se resuelve una hora.
"""

from __future__ import annotations

import calendar
import lzma
import struct
from collections.abc import Callable
from dataclasses import dataclass
from urllib.request import Request, urlopen

import structlog

from fxtrad.contracts.ohlc import Candle
from fxtrad.ingest.catalog import is_known_asset

logger = structlog.get_logger()

DATA_FEED_BASE_URL = "https://datafeed.dukascopy.com/datafeed"
"""URL base del datafeed público de Dukascopy."""

TICK_RECORD_SIZE = 20
"""Tamaño en bytes de cada registro de tick (5 campos big-endian)."""

TICK_FORMAT = ">IIIff"
"""Formato struct de un registro: ms, ask, bid, ask_volume, bid_volume."""

_USER_AGENT = "fxtrad/0.1 (uso personal, datos públicos de mercado)"

INSTRUMENT_BY_ASSET: dict[str, str] = {
    "EURUSD": "eurusd",
    "GBPUSD": "gbpusd",
    "USDJPY": "usdjpy",
    "XAUUSD": "xauusd",
    "XAGUSD": "xagusd",
    "WTI": "lightcmdusd",
    "BRENT": "brentcmdusd",
}
"""Mapeo de símbolo canónico del catálogo a id de instrumento Dukascopy."""

POINT_VALUE_BY_INSTRUMENT: dict[str, int] = {
    "eurusd": 100000,
    "gbpusd": 100000,
    "usdjpy": 1000,
    "xauusd": 100,
    "xagusd": 1000,
    "lightcmdusd": 1000,
    "brentcmdusd": 1000,
}
"""Divisor para obtener el precio real (valor entero / point value).

>> FX: 100000 (mayoría de pares), pares JPY: 1000. Los valores de metales y
>> petróleo siguen la convención de-facto de dukascopy-node; se validan contra
>> el mercado real en el test de integración optativo de test_dukascopy.py.
"""


@dataclass(frozen=True, slots=True)
class RawTick:
    """Un tick sin escala: precio entero y volumen tal como vienen del archivo.

    Attributes:
        ms: Milisegundos desde el inicio de la hora (formato datafeed).
        ask: Precio ask sin escala (entero Dukascopy).
        bid: Precio bid sin escala (entero Dukascopy).
        ask_volume: Volumen ask en millones de la moneda base.
        bid_volume: Volumen bid en millones de la moneda base.
    """

    ms: int
    ask: int
    bid: int
    ask_volume: float
    bid_volume: float


def instrument_id_for(symbol: str) -> str:
    """Devuelve el id Dukascopy del activo del catálogo."""
    if not is_known_asset(symbol):
        raise KeyError(f"El símbolo '{symbol}' no está en el catálogo (TASK-001).")
    return INSTRUMENT_BY_ASSET[symbol]


def point_value_for(symbol: str) -> int:
    """Devuelve el divisor de escala del precio para el activo indicado."""
    instrument = instrument_id_for(symbol)
    return POINT_VALUE_BY_INSTRUMENT[instrument]


def build_hour_url(symbol: str, year: int, month_index: int, day: int, hour: int) -> str:
    """Construye la URL bi5 de una hora (mes 0-based, enero = 0).

    Args:
        symbol: Símbolo canónico del catálogo (p. ej. ``EURUSD``).
        year: Año (4 dígitos).
        month_index: Mes 0-based (``0`` = enero … ``11`` = diciembre).
        day: Día del mes (1-based).
        hour: Hora UTC (0-23).
    """
    instrument = instrument_id_for(symbol)
    return (
        f"{DATA_FEED_BASE_URL}/{instrument}/{year:04d}/{month_index:02d}/"
        f"{day:02d}/{hour:02d}h_ticks.bi5"
    )


def hour_start_epoch(year: int, month_index: int, day: int, hour: int) -> int:
    """Devuelve el epoch (segundos UTC) del inicio de la hora indicada."""
    return calendar.timegm((year, month_index + 1, day, hour, 0, 0))


def decode_bi5(payload: bytes) -> list[RawTick]:
    """Descomprime (LZMA raw) y decodifica un archivo bi5 a ticks ordenados.

    Args:
        payload: Contenido binario del archivo ``.bi5``.

    Returns:
        Ticks ordenados ascendentemente por milisegundo.

    Raises:
        ValueError: si el contenido descomprimido no divide en registros de 20 B.
        lzma.LZMAError: si el payload no es un flujo LZMA válido.
    """
    if not payload:
        return []
    raw = lzma.decompress(payload)
    if len(raw) % TICK_RECORD_SIZE:
        raise ValueError(
            f"Archivo bi5 inválido: {len(raw)} bytes no alinean a registros de "
            f"{TICK_RECORD_SIZE} bytes."
        )
    ticks: list[RawTick] = []
    for offset in range(0, len(raw), TICK_RECORD_SIZE):
        ms, ask, bid, ask_volume, bid_volume = struct.unpack(
            TICK_FORMAT, raw[offset : offset + TICK_RECORD_SIZE]
        )
        ticks.append(RawTick(ms=ms, ask=ask, bid=bid, ask_volume=ask_volume, bid_volume=bid_volume))
    ticks.sort(key=lambda tick: tick.ms)
    return ticks


def aggregate_to_ohlc(
    ticks: list[RawTick], hour_start_epoch_s: int, point_value: int
) -> list[Candle]:
    """Agrega ticks a velas OHLC de 1 segundo usando el precio medio bid/ask.

    Args:
        ticks: Ticks de una hora (ms desde el inicio de la hora).
        hour_start_epoch_s: Epoch del inicio de la hora en segundos UTC.
        point_value: Divisor para convertir el precio entero a precio real.

    Returns:
        Velas ordenadas ascendentemente por ``time`` (segundos UTC, sin volumen).
    """
    mids_by_second: dict[int, list[float]] = {}
    for tick in ticks:
        second = tick.ms // 1000
        mids_by_second.setdefault(second, []).append((tick.ask + tick.bid) / 2)

    candles: list[Candle] = []
    for second in sorted(mids_by_second):
        mids = mids_by_second[second]
        candles.append(
            Candle(
                time=hour_start_epoch_s + second,
                open=mids[0] / point_value,
                high=max(mids) / point_value,
                low=min(mids) / point_value,
                close=mids[-1] / point_value,
            )
        )
    return candles


def _fetch_bytes(url: str) -> bytes:
    """Descarga la URL con cabecera de usuario; falla si el estado no es 2xx."""
    request = Request(url, headers={"User-Agent": _USER_AGENT})
    with urlopen(request) as response:
        return bytes(response.read())


class DukascopyClient:
    """Cliente del datafeed horario de Dukascopy.

    Se inyecta el fetcher para poder simularlo en tests sin red; en producción
    se usa ``urllib.request.urlopen`` (stdlib, sin dependencias nuevas).
    """

    def __init__(self, fetcher: Callable[[str], bytes] | None = None) -> None:
        self._fetcher = fetcher or _fetch_bytes

    def download_hour(
        self, symbol: str, year: int, month_index: int, day: int, hour: int
    ) -> list[Candle]:
        """Descarga una hora de ticks y la decodifica a velas OHLC de 1 s."""
        url = build_hour_url(symbol, year, month_index, day, hour)
        logger.info("descarga_iniciada", activo=symbol, url=url)
        start = hour_start_epoch(year, month_index, day, hour)
        payload = self._fetcher(url)
        ticks = decode_bi5(payload)
        candles = aggregate_to_ohlc(ticks, start, point_value_for(symbol))
        logger.info(
            "descarga_completada",
            activo=symbol,
            velas=len(candles),
            inicio_utc=start,
        )
        return candles


__all__ = [
    "DATA_FEED_BASE_URL",
    "DukascopyClient",
    "POINT_VALUE_BY_INSTRUMENT",
    "RawTick",
    "aggregate_to_ohlc",
    "build_hour_url",
    "decode_bi5",
    "hour_start_epoch",
    "instrument_id_for",
    "point_value_for",
]
