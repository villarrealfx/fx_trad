"""Persistencia de la descarga en la base local (TASK-050, RF-006, RI-002).

Cierra el hueco que dejó TASK-019: la tarea de descarga (``ingest``) terminaba
contando velas pero no guardaba nada, así que RF-006 solo se cumplía a nivel de
primitiva de almacenamiento. Aquí se une la descarga con la persistencia
(fusión incremental sobre la base 1m + registro en ``download_metadata``).

Vive en ``pipeline`` y no en ``ingest`` porque es la única frontera que la
arquitectura permite recorrer sin cruzarla: ``ingest -> pipeline -> storage``
(``architecture.md`` §4). ``ingest`` consume este módulo como puerto; el módulo
``storage`` no depende de nada de aquí, y así TASK-049 (``pipeline.refresh``)
repoda los Parquets derivados desde el mismo sitio sin romper las fronteras.

**Volumen (base 1m, ADR-012):** las velas del rango se acumulan en memoria y se
funden en una sola operación al concluir. Con la base 1 m el volumen es manejable
(2 años ≈ 726k velas, RNF-102), muy por debajo del límite práctico de memoria que
imponía la base 1 s.
"""

from __future__ import annotations

import os
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

import structlog

from fxtrad.contracts.ohlc import Candle
from fxtrad.pipeline.refresh import DerivedSeriesRefresher, timeframes_from_env
from fxtrad.storage import (
    DownloadMetadata,
    DownloadMetadataStore,
    DownloadStatus,
    ParquetSeriesStore,
)

logger = structlog.get_logger()

_DEFAULT_DATA_DIR = "data"
"""Directorio base por defecto, coherente con ``api.app`` (ADR-004/ADR-009)."""


class DownloadPersister:
    """Guarda el resultado de una descarga en la base local (RF-006, RI-002).

    Encapsula las escrituras que debe hacer el worker de descarga: la fusión
    incremental de la serie 1m del activo, la regeneración de los Parquets
    derivados que ese merge deja obsoletos (TASK-049, RF-009) y el registro de
    metadatos con las filas obtenidas, que alimenta el catálogo y el historial
    (TASK-018/047).

    Attributes:
        series_store: Almacén de Parquet por activo (ADR-004).
        metadata_store: Tabla de metadatos de descarga (ADR-004).
        refresher: Regenerador de los timeframes derivados; ``None`` deja los
            Parquets pre-resampling sin tocar.
    """

    def __init__(
        self,
        series_store: ParquetSeriesStore,
        metadata_store: DownloadMetadataStore,
        refresher: DerivedSeriesRefresher | None = None,
    ):
        """Crea el persistidor sobre los dos almacenes compartidos por la API.

        Args:
            series_store: Almacén de la serie 1m por activo.
            metadata_store: Almacén de metadatos de descarga.
            refresher: Regenerador de derivados; lo inyecta ``build_persister``.
        """
        self._series_store = series_store
        self._metadata_store = metadata_store
        self._refresher = refresher

    def persist(
        self,
        symbol: str,
        candles: Sequence[Candle],
        *,
        start: int,
        end: int,
        status: DownloadStatus,
        now: datetime | None = None,
    ) -> int:
        """Funde las velas descargadas y registra la descarga concluida.

        La fusión es incremental (``merge``): completa la base existente sin
        duplicar ni borrar filas (RF-006, RI-001, KPI-4). Si no hay velas —una
        descarga en la que fallaron todas las horas— no se toca el Parquet: un
        archivo vacío haría aparecer el activo en el catálogo sin datos (RF-007),
        pero el metadato sí se registra con ``filas=0`` para que el historial
        refleje el intento (RI-002).

        Con refrescador, tras la fusión se rehacen los Parquets pre-resampling
        cuyo rango intersecta el periodo (TASK-049, RF-009). Va **antes** del
        metadato a propósito: si la regeneración falla, no queda registrado
        una descarga cuyos derivados están obsoletos, y el llamante degrada el
        resumen a ``fallo`` (TASK-050). Escribir primero el metadato dejaría el
        historial diciendo ``exito`` mientras ``GET /series?timeframe=1h``
        seguiría sirviendo velas viejas.

        Args:
            symbol: Símbolo del activo descargado.
            candles: Velas 1m en segundos UTC obtenidas por la descarga.
            start: Inicio del rango solicitado en segundos UTC.
            end: Fin del rango solicitado en segundos UTC.
            status: Estado final de la descarga (exito/parcial/fallo).
            now: Momento de conclusión; por defecto la hora UTC actual.

        Returns:
            Total de filas almacenadas del activo tras la fusión, o 0 si no
            había velas que fusionar.

        Raises:
            ValueError: si el símbolo no es un identificador seguro del almacén.
            DuplicateTimeError: si ``candles`` trae ``time`` repetidos (RI-001).
        """
        rows = self._merge(symbol, candles)
        if self._refresher is not None and candles:
            self._refresh(symbol, start, end)
        self._metadata_store.save(
            DownloadMetadata(
                activo=symbol,
                inicio=start,
                fin=end,
                estado=status,
                fecha_descarga=now or datetime.now(UTC),
                filas=len(candles),
            )
        )
        logger.info(
            "descarga_persistida",
            activo=symbol,
            timeframe="1m",
            velas=len(candles),
            filas_totales=rows,
            estado=status,
        )
        return rows

    def _merge(self, symbol: str, candles: Sequence[Candle]) -> int:
        """Fusiona las velas en la base 1m y devuelve el total de filas.

        Returns:
            Filas almacenadas tras la fusión; 0 si no había velas.
        """
        if not candles:
            logger.info("descarga_persistida_sin_datos", activo=symbol, velas=0)
            return 0
        return self._series_store.merge(symbol, candles)

    def _refresh(self, symbol: str, start: int, end: int) -> None:
        """Regenera los derivados del periodo y propaga el fallo si lo hay.

        El error se registra con ``activo`` y rango para que se pueda
        distinguir una base 1m correcta de unos derivados obsoletos, y se
        relanza para que el resumen de la descarga degrade a ``fallo``: servir
        velas viejas es peor que reportar el fallo.
        """
        if self._refresher is None:
            return
        try:
            self._refresher.refresh(symbol, start, end)
        except Exception as error:
            logger.error(
                "refresh_derivadas_fallido",
                activo=symbol,
                inicio=start,
                fin=end,
                error=str(error),
            )
            raise


def build_persister(data_dir: Path | str | None = None) -> DownloadPersister:
    """Construye el persistidor real sobre el directorio de datos configurado.

    Lee ``FXTRAD_DATA_DIR`` (por defecto ``data``), la misma variable que usa la
    API para localizar Parquet y metadatos (ADR-009): el worker y la API son
    procesos distintos y deben escribir y leer sobre el mismo volumen.

    El persistidor sale cableado con el regenerador de Parquets derivados
    (TASK-049) usando ``FXTRAD_DERIVED_TIMEFRAMES``, de modo que cualquier
    descarga deja los timeframes de RF-009 al día sin configurar nada.

    Args:
        data_dir: Directorio base explícito; si se omite, se usa la variable de
            entorno o el valor por defecto.

    Returns:
        Persistidor listo para usarse sobre el directorio indicado.
    """
    if data_dir is not None:
        base = Path(data_dir)
    else:
        base = Path(os.getenv("FXTRAD_DATA_DIR", _DEFAULT_DATA_DIR))
    series_store = ParquetSeriesStore(base)
    refresher = DerivedSeriesRefresher(series_store, timeframes_from_env())
    return DownloadPersister(series_store, DownloadMetadataStore(base), refresher)


__all__ = ["DownloadPersister", "build_persister"]
