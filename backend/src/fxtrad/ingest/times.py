"""Normalización de timestamps a segundos UTC (TASK-007, RF-002/RNF-004).

Un único punto canónico de conversión a epoch en segundos UTC: acepta un
``datetime`` con cualquier zona horaria y devuelve el int de segundos desde
epoch en UTC. Un ``datetime`` naive se interpreta como UTC (RNF-004: UTC
exclusivo en timestamps), evitando ambigüedades de zona horaria local.
"""

from __future__ import annotations

from datetime import UTC, datetime

type TimestampInput = datetime
"""Entrada normalizable: un ``datetime`` con o sin zona horaria."""


def to_epoch_seconds(value: datetime) -> int:
    """Convierte un ``datetime`` en segundos UTC desde epoch.

    Args:
        value: Instante a normalizar. Si es naive se asume UTC (RNF-004),
            si es consciente de zona horaria se convierte a UTC primero.

    Returns:
        Epoch en segundos UTC (entero).

    Raises:
        TypeError: si ``value`` no es un ``datetime``.
    """
    if not isinstance(value, datetime):
        raise TypeError(f"Se espera datetime, se recibió {type(value).__name__}")
    aware = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
    return int(aware.astimezone(UTC).timestamp())


__all__ = ["TimestampInput", "to_epoch_seconds"]
