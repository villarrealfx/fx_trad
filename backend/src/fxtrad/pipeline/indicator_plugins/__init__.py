"""Plugins de indicadores técnicos (TASK-043, RF-016).

Punto de extensión del pipeline: para **añadir un indicador nuevo** basta crear
un módulo en este paquete (p. ej. ``bollinger.py``) que exponga::

    from collections.abc import Sequence
    from fxtrad.contracts.ohlc import Candle
    from fxtrad.pipeline.indicator_registry import IndicatorRegistry, IndicatorSpec

    def calculate(candles: Sequence[Candle], period: int) -> tuple[float | None, ...]:
        ...  # serie alineada con las velas y None en el warm-up

    def register(registry: IndicatorRegistry) -> None:
        registry.register(
            IndicatorSpec(
                name="BOLLINGER",
                category="overlay",
                default_period=20,
                calculate=calculate,
            )
        )

El registro por defecto (`fxtrad.pipeline.indicators.REGISTRY`) descubre los
módulos de este paquete al importarse, sin modificar código existente.
"""

from __future__ import annotations

__all__: list[str] = []
