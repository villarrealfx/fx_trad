"""Capa de consulta DuckDB por activo/rango/timeframe (TASK-016, RF-005/RNF-002).

Construye sobre ``ParquetSeriesStore`` (TASK-015) una query parametrizada que
devuelve la serie del activo en el rango. El timeframe sigue el contrato
RNF-008/TASK-009: la base ``1m`` se lee de ``{symbol}.1m.parquet`` y los
canónicos 5m/15m/1h/4h/1d de su Parquet pre-resampling (ADR-007), sin recomputar
el resampling en cada consulta (RF-009).
"""

from __future__ import annotations

from fxtrad.contracts.ohlc import Candle, Timeframe
from fxtrad.storage.series import (
    BASE_TIMEFRAME,
    CANONICAL_TIMEFRAMES,
    InvalidTimeframeError,
    ParquetSeriesStore,
)


class InvalidRangeError(ValueError):
    """El rango de consulta es inválido (``start > end``) (RNF-002)."""


class SeriesQuery:
    """Capa de consulta OHLC parametrizada por activo/rango/timeframe.

    Args:
        series_store: Almacén Parquet (TASK-015, TASK-017) que resuelve la
            lectura del rango con DuckDB. Se inyecta para permitir un stub.
    """

    def __init__(self, series_store: ParquetSeriesStore) -> None:
        self._series_store = series_store

    def read(
        self,
        symbol: str,
        timeframe: Timeframe = BASE_TIMEFRAME,
        start: int | None = None,
        end: int | None = None,
    ) -> list[Candle]:
        """Devuelve las velas del activo en el rango ``[start, end]``.

        Args:
            symbol: Símbolo del activo (identificador del catálogo).
            timeframe: Granularidad canónica (RF-009). ``1m`` lee la base;
                los demás leen el Parquet pre-resampling (ADR-007), sin
                recomputar.
            start: Inicio del rango en segundos UTC (inclusivo); si es
                ``None`` no hay cota inferior.
            end: Fin del rango en segundos UTC (inclusivo); si es ``None``
                no hay cota superior.

        Returns:
            Velas del rango ordenadas ascendentemente por ``time``.

        Raises:
            InvalidTimeframeError: si ``timeframe`` no es canónico o no tiene
                serie persistida.
            InvalidRangeError: si ``start`` y ``end`` se dan y ``start > end``.
            FileNotFoundError: si el activo no tiene serie para el timeframe.
        """
        if timeframe not in CANONICAL_TIMEFRAMES:
            raise InvalidTimeframeError(
                f"Timeframe '{timeframe}': no es un valor canónico; "
                f"válidos: {', '.join(sorted(CANONICAL_TIMEFRAMES))}"
            )
        if start is not None and end is not None and start > end:
            raise InvalidRangeError(f"Rango inválido: start={start} > end={end}")
        start_bound = start if start is not None else 0
        end_bound = end if end is not None else 2**63 - 1
        return self._series_store.read_range(symbol, start_bound, end_bound, timeframe)

    def has_series(self, symbol: str) -> bool:
        """Indica si el activo tiene serie almacenada (reusa el catálogo)."""
        return self._series_store.has_series(symbol)

    def version(self, symbol: str, timeframe: Timeframe = BASE_TIMEFRAME) -> str | None:
        """Devuelve el token de versión del Parquet del activo (TASK-045).

        La caché in-memory lo usa para invalidar la ventana del activo cuando una
        descarga incremental actualiza su base (ADR-007).

        Args:
            symbol: Símbolo del activo (identificador del catálogo).
            timeframe: Granularidad canónica (RF-009).

        Returns:
            Token de versión del Parquet, o ``None`` si no hay serie almacenada
            para ese timeframe.

        Raises:
            ValueError: si el símbolo no es un identificador seguro.
            InvalidTimeframeError: si ``timeframe`` no es canónico.
        """
        return self._series_store.version(symbol, timeframe)


__all__ = ["InvalidRangeError", "InvalidTimeframeError", "SeriesQuery"]
