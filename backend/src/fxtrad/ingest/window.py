"""Validación de la ventana temporal de descarga (TASK-008, RNF-003).

RNF-003 exige que el sistema permita obtener hasta 2 años de antigüedad desde
la fecha de descarga. ``validate_request_window`` rechaza con mensaje explícito
una solicitud cuyo inicio es anterior a esa ventana, sin encolar nada (el mismo
nivel de guarda de HU-001 en ``DownloadRequest``).
"""

from __future__ import annotations

from datetime import UTC, datetime

from fxtrad.ingest.times import to_epoch_seconds

MAX_WINDOW_SECONDS = 730 * 24 * 3600
"""Ventana máxima de antigüedad: 2 años expresados como 730 días (RNF-003)."""


def validate_request_window(start: int, end: int, now: datetime | None = None) -> None:
    """Rechaza un rango cuya antigüedad supera los 2 años.

    Args:
        start: Inicio del rango en segundos UTC.
        end: Fin del rango en segundos UTC (usado solo en el mensaje de error).
        now: Instante de referencia; por defecto el UTC actual. Se inyecta en
            pruebas para hacer el límite determinista.

    Raises:
        ValueError: si ``start`` antecede a la ventana de 2 años permitida.
    """
    reference = now if now is not None else datetime.now(UTC)
    min_start = to_epoch_seconds(reference) - MAX_WINDOW_SECONDS
    if start < min_start:
        raise ValueError(
            f"El inicio {start} supera los 2 años de antigüedad desde la descarga"
            f" (mínimo permitido: {min_start}); RNF-003"
        )


__all__ = ["MAX_WINDOW_SECONDS", "validate_request_window"]
