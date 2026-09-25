"""Regeneración de los Parquets pre-resampling tras un merge de la base 1s.

TASK-049 (RF-009, ADR-004/ADR-007). Hoy los Parquets derivados se consultan
(``queries.py`` lee ``{symbol}.{tf}.parquet``) pero nada los produce: una
descarga incremental deja la base 1s al día y los timeframes derivados
sirviendo velas obsoletas, o directamente inexistentes (404 en
``GET /series?timeframe=1h``).

Vive en ``pipeline`` porque el resampling es responsabilidad de este módulo
(``architecture.md`` §4) y ``pipeline → storage`` es una frontera permitida.

**Ámbito por buckets, no recálculo completo.** Del periodo fusionado
``[inicio, fin]`` solo se rehacen los buckets de cada timeframe que el periodo
intersecta, leyendo la base 1s de la ventana ya existente. Recalcular el
derivado entero serían ~18M filas por descarga (RNF-002); el coste de este
enfoque es proporcional al periodo descargado, no al histórico del activo.

Un bucket recalculado se funde con ``merge()``, que hace upsert por ``time`` y
no borra nada (TASK-019), así que los buckets fuera de la ventana sobreviven y
un bucket a medio llenar queda completo (se rehace entero desde la base 1s,
que ya incluye las filas de descargas anteriores).

**Consistencia eventual:** los derivados se actualizan uno a uno, así que un
lector que caiga en mitad del refresco puede ver un timeframe nuevo y otro
viejo. Cada archivo se escribe de forma atómica (``os.replace``) y el siguiente
refresco converge; la ventana en la que se da el caso es del orden de
segundos.
"""

from __future__ import annotations

import os
from collections.abc import Sequence

import structlog

from fxtrad.contracts.ohlc import Candle, Timeframe
from fxtrad.pipeline.resample import TIMEFRAME_SECONDS, resample_ohlc
from fxtrad.storage.series import CANONICAL_TIMEFRAMES, ParquetSeriesStore

logger = structlog.get_logger()

DERIVED_TIMEFRAMES: tuple[Timeframe, ...] = ("1m", "5m", "15m", "1h", "4h", "1d")
"""Timeframes que RF-009 pone a disposición del usuario sobre la base 1s."""

ENV_TIMEFRAMES = "FXTRAD_DERIVED_TIMEFRAMES"
"""Variable de entorno para recortar el conjunto de derivados a regenerar."""


def _bucket_window(start: int, end: int, timeframe: Timeframe) -> tuple[int, int]:
    """Alinea el periodo a los bordes de bucket del timeframe.

    Args:
        start: Inicio del periodo en segundos UTC.
        end: Fin del periodo en segundos UTC.
        timeframe: Granularidad canónica destino (RF-009).

    Returns:
        Tupla ``(primer_bucket, ultimo_bucket)`` con los ``time`` de las velas
        de bucket que el periodo intersecta, ya alineados a ``timeframe``.
    """
    seconds = TIMEFRAME_SECONDS[timeframe]
    return (start // seconds) * seconds, (end // seconds) * seconds


def parse_timeframes(raw: str | None) -> tuple[Timeframe, ...]:
    """Convierte la variable de entorno en timeframes derivados canónicos.

    Args:
        raw: Valor crudo de ``FXTRAD_DERIVED_TIMEFRAMES`` (separado por comas);
            ``None`` o vacío devuelve el conjunto por defecto completo.

    Returns:
        Timeframes derivados a regenerar, en el orden en que se declararon.

    Raises:
        ValueError: si algún valor no es canónico, si se pide el ``1s``, que
            es la base, o si un valor explícito no deja ningún timeframe válido.
    """
    if raw is None or not raw.strip():
        return DERIVED_TIMEFRAMES
    selected: list[Timeframe] = []
    for token in (item.strip() for item in raw.split(",")):
        if not token:
            continue
        if token not in CANONICAL_TIMEFRAMES:
            raise ValueError(
                f"Timeframe no canónico en {ENV_TIMEFRAMES}: {token!r}. "
                f"Válidos: {', '.join(sorted(CANONICAL_TIMEFRAMES))}"
            )
        if token == "1s":
            raise ValueError(
                f"El timeframe '1s' es la base, no un derivado: no puede ir en {ENV_TIMEFRAMES}"
            )
        selected.append(token)  # type: ignore[arg-type]
    if not selected:
        raise ValueError(
            f"{ENV_TIMEFRAMES} no define ningún timeframe válido: {raw!r}. "
            f"Para el conjunto por defecto, quita la variable."
        )
    return tuple(dict.fromkeys(selected))


def timeframes_from_env() -> tuple[Timeframe, ...]:
    """Lee ``FXTRAD_DERIVED_TIMEFRAMES`` con el conjunto por defecto como fallback."""
    return parse_timeframes(os.getenv(ENV_TIMEFRAMES))


class DerivedSeriesRefresher:
    """Rehace los Parquets derivados que un merge de la base 1s deja obsoletos.

    Attributes:
        series_store: Almacén Parquet compartido con la base 1s (ADR-004).
        timeframes: Derivados a regenerar en cada refresco.
    """

    def __init__(
        self,
        series_store: ParquetSeriesStore,
        timeframes: Sequence[Timeframe] = DERIVED_TIMEFRAMES,
    ) -> None:
        """Crea el refrescador sobre el almacén de series.

        Args:
            series_store: Almacén Parquet por activo y timeframe.
            timeframes: Derivados a regenerar; por defecto los seis canónicos
                que RF-009 requiere.

        Raises:
            ValueError: si algún timeframe no es canónico o es el ``1s``, que
                es la base y no un derivado. Se valida al construir y no en
                cada refresco para fallar antes de escribir nada.
        """
        for timeframe in timeframes:
            if timeframe not in CANONICAL_TIMEFRAMES or timeframe == "1s":
                raise ValueError(
                    f"Timeframe no canónico como derivado: {timeframe!r}. "
                    f"Válidos: {', '.join(tf for tf in sorted(CANONICAL_TIMEFRAMES) if tf != '1s')}"
                )
        self._series_store = series_store
        self._timeframes = tuple(timeframes)

    def refresh(self, symbol: str, start: int, end: int) -> dict[Timeframe, int]:
        """Regenera los derivados cuyo rango intersecta el periodo indicado.

        Lee la base 1s **una sola vez** en la ventana alineada al timeframe más
        grueso configurado y agrega en memoria para cada uno. Escanear DuckDB
        por timeframe multiplicaría la E/S sin ahorrar CPU, que es donde está
        el coste de la agregación.

        Args:
            symbol: Identificador del activo (nombre de archivo).
            start: Inicio del periodo fusionado en segundos UTC.
            end: Fin del periodo fusionado en segundos UTC.

        Returns:
            Filas totales de cada Parquet derivado tras el refresco; vacío si
            no había nada que regenerar.

        Raises:
            ValueError: si el símbolo no es seguro o si ``start > end``.
        """
        if start > end:
            raise ValueError(
                f"Periodo inválido para regenerar derivados: start={start} > end={end}"
            )
        if not self._timeframes or not self._series_store.has_series(symbol, "1s"):
            logger.info("derivadas_sin_datos", activo=symbol, velas=0, timeframe="1s")
            return {}
        window_start, window_end = self._source_window(start, end)
        rows = self._series_store.read_range(symbol, window_start, window_end, "1s")
        if not rows:
            logger.info("derivadas_sin_datos", activo=symbol, velas=0, timeframe="1s")
            return {}
        return {
            timeframe: self._refresh_one(symbol, rows, start, end, timeframe)
            for timeframe in self._timeframes
        }

    def _source_window(self, start: int, end: int) -> tuple[int, int]:
        """Ventana de la base 1s que cubre enteros todos los buckets a rehacer.

        Se alinea al timeframe más grueso configurado, que es el de la ventana
        más ancha, y se extiende hasta el **final** de su último bucket. Cortar
        en el inicio del bucket produciría una vela agregada sobre una fracción
        del intervalo, que es justo el caso que un bucket a medio llenar
        necesita: hay que releer las filas que ya tenía en disco.
        """
        coarsest = max(self._timeframes, key=lambda tf: TIMEFRAME_SECONDS[tf])
        first_bucket, last_bucket = _bucket_window(start, end, coarsest)
        return first_bucket, last_bucket + TIMEFRAME_SECONDS[coarsest] - 1

    def _refresh_one(
        self,
        symbol: str,
        rows: Sequence[Candle],
        start: int,
        end: int,
        timeframe: Timeframe,
    ) -> int:
        """Rehace y fusiona los buckets de un timeframe; devuelve sus filas totales.

        Args:
            symbol: Identificador del activo.
            rows: Base 1s leída en la ventana común a todos los derivados.
            start: Inicio del periodo fusionado en segundos UTC.
            end: Fin del periodo fusionado en segundos UTC.
            timeframe: Granularidad derivada a regenerar (RF-009).

        Returns:
            Total de filas del Parquet derivado tras la fusión; 0 si ningún
            bucket del periodo tiene velas que agregar.
        """
        first_bucket, last_bucket = _bucket_window(start, end, timeframe)
        aggregated = resample_ohlc(rows, timeframe).candles
        buckets = [candle for candle in aggregated if first_bucket <= candle.time <= last_bucket]
        if not buckets:
            return 0
        total = self._series_store.merge(symbol, buckets, timeframe=timeframe)
        logger.info(
            "serie_derivada_regenerada",
            activo=symbol,
            timeframe=timeframe,
            inicio_bucket=first_bucket,
            fin_bucket=last_bucket,
            velas=len(buckets),
            filas_totales=total,
        )
        return total


__all__ = [
    "DERIVED_TIMEFRAMES",
    "ENV_TIMEFRAMES",
    "DerivedSeriesRefresher",
    "parse_timeframes",
    "timeframes_from_env",
]
