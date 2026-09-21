"""Capa de consulta DuckDB por activo/rango/timeframe (TASK-016, RF-005/RNF-002).

Construye sobre ``ParquetSeriesStore`` (TASK-015) una query parametrizada que
devuelve la serie del activo en el rango. El timeframe sigue el contrato
RNF-008/TASK-009: hoy el almacén persiste la base ``1s`` (RF-005), por lo que
cualquier otra granularidad se rechaza explícitamente hasta que TASK-017
persista el Parquet pre-resampling (RI-001 time único también aplica ahí).
"""

from __future__ import annotations

from fxtrad.contracts.ohlc import Candle, Timeframe
from fxtrad.storage.series import ParquetSeriesStore

_MEANINGFUL_TIMEFRAMES: frozenset[str] = frozenset({"1s"})


class InvalidTimeframeError(ValueError):
    """El timeframe pedido no tiene serie persistida consultable (TASK-016)."""


class InvalidRangeError(ValueError):
    """El rango de consulta es inválido (``start > end``) (RNF-002)."""


class SeriesQuery:
    """Capa de consulta OHLC parametrizada por activo/rango/timeframe.

    Args:
        series_store: Almacén Parquet (TASK-015) que resuelve la lectura
            del rango con DuckDB. Se inyecta para permitir un stub en tests.
    """

    def __init__(self, series_store: ParquetSeriesStore) -> None:
        self._series_store = series_store

    def read(
        self,
        symbol: str,
        timeframe: Timeframe = "1s",
        start: int | None = None,
        end: int | None = None,
    ) -> list[Candle]:
        """Devuelve las velas del activo en el rango ``[start, end]``.

        Args:
            symbol: Símbolo del activo (identificador del catálogo).
            timeframe: Granularidad de la serie. Por contrato base ``1s``;
                otros valores se rechazan (TASK-017 los persistirá).
            start: Inicio del rango en segundos UTC (inclusivo); si es
                ``None`` no hay cota inferior.
            end: Fin del rango en segundos UTC (inclusivo); si es ``None``
                no hay cota superior.

        Returns:
            Velas del rango ordenadas ascendentemente por ``time``.

        Raises:
            InvalidTimeframeError: si ``timeframe`` no tiene serie persistida.
            InvalidRangeError: si ``start`` y ``end`` se dan y ``start > end``.
            FileNotFoundError: si el activo no tiene serie almacenada.
        """
        if timeframe not in _MEANINGFUL_TIMEFRAMES:
            raise InvalidTimeframeError(
                f"Timeframe '{timeframe}': solo la base 1s está persistida;"
                " otros requieren TASK-017 (pre-resampling)"
            )
        if start is not None and end is not None and start > end:
            raise InvalidRangeError(f"Rango inválido: start={start} > end={end}")
        start_bound = start if start is not None else 0
        end_bound = end if end is not None else 2**63 - 1
        return self._series_store.read_range(symbol, start_bound, end_bound)

    def has_series(self, symbol: str) -> bool:
        """Indica si el activo tiene serie almacenada (reusa el catálogo)."""
        return self._series_store.has_series(symbol)


__all__ = ["InvalidRangeError", "InvalidTimeframeError", "SeriesQuery"]
