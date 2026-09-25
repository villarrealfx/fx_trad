"""Registro extensible de indicadores técnicos (TASK-043, RF-016).

Punto de extensión del pipeline para indicadores: cada indicador se describe con
un `IndicatorSpec` (nombre, categoría, periodo por defecto y función de cálculo)
y se registra en un `IndicatorRegistry`. Añadir un indicador nuevo **no requiere
modificar código existente**: basta crear un módulo en
`fxtrad.pipeline.indicator_plugins/` que exponga ``register(registry)``; el
registro los descubre automáticamente (`discover`).

Los indicadores built-in (MA/RSI/ATR, TASK-031) se registran en
`fxtrad.pipeline.indicators`, que reutiliza sus mismas funciones de cálculo para
que el registro y `compute_indicators` no diverjan.
"""

from __future__ import annotations

import importlib
import pkgutil
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Literal

from fxtrad.contracts.ohlc import Candle

IndicatorCategory = Literal["overlay", "panel"]
"""Categoría de dibujo del indicador (CMP-010): overlay sobre precio o panel."""

CalculateFn = Callable[[Sequence[Candle], int], "tuple[float | None, ...]"]
"""Función de cálculo: recibe velas y periodo, y devuelve una serie alineada."""


@dataclass(frozen=True, slots=True)
class IndicatorSpec:
    """Definición de un indicador registrable.

    Attributes:
        name: Identificador único (p. ej. ``MA``).
        category: ``overlay`` (sobre el precio) o ``panel`` (subgráfico).
        default_period: Ventana por defecto al calcular sin periodo explícito.
        calculate: Función que computa la serie alineada con las velas.
    """

    name: str
    category: IndicatorCategory
    default_period: int
    calculate: CalculateFn


class IndicatorRegistry:
    """Colección de indicadores registrados y punto de descubrimiento."""

    def __init__(self) -> None:
        self._specs: dict[str, IndicatorSpec] = {}

    def register(self, spec: IndicatorSpec) -> None:
        """Registra un indicador.

        Args:
            spec: Definición del indicador.

        Raises:
            ValueError: si ya existe un indicador con el mismo nombre.
        """
        if spec.name in self._specs:
            raise ValueError(f"Indicador ya registrado: {spec.name}")
        self._specs[spec.name] = spec

    def get(self, name: str) -> IndicatorSpec:
        """Devuelve la definición de un indicador.

        Raises:
            ValueError: si el indicador no está registrado.
        """
        try:
            return self._specs[name]
        except KeyError:
            registered = ", ".join(self.names()) or "ninguno"
            raise ValueError(f"Indicador desconocido: {name}. Registrados: {registered}") from None

    def names(self) -> tuple[str, ...]:
        """Nombres registrados, en orden alfabético."""
        return tuple(sorted(self._specs))

    def specs(self) -> tuple[IndicatorSpec, ...]:
        """Definiciones registradas, en orden alfabético."""
        return tuple(self._specs[name] for name in self.names())

    def compute(
        self, name: str, candles: Sequence[Candle], period: int | None = None
    ) -> tuple[float | None, ...]:
        """Calcula un indicador registrado sobre la serie.

        Args:
            name: Indicador a calcular (debe estar registrado).
            candles: Serie de velas ordenada y sin ``time`` duplicado (RI-001).
            period: Ventana; si es ``None`` se usa el ``default_period``.

        Raises:
            ValueError: si el indicador no existe o el periodo es < 1.
        """
        spec = self.get(name)
        chosen = spec.default_period if period is None else period
        if chosen < 1:
            raise ValueError(f"Periodo de {name} inválido: {chosen}. Debe ser ≥ 1.")
        return spec.calculate(tuple(candles), chosen)

    def discover(self, package: str) -> None:
        """Importa los submódulos de ``package`` y llama a su ``register``.

        Cada plugin debe exponer ``register(registry)``. Los módulos privados
        (prefijo ``_``) se ignoran.

        Args:
            package: Ruta importable del paquete de plugins.
        """
        module = importlib.import_module(package)
        for info in pkgutil.iter_modules(module.__path__):
            if info.name.startswith("_"):
                continue
            plugin = importlib.import_module(f"{package}.{info.name}")
            register = getattr(plugin, "register", None)
            if callable(register):
                register(self)


__all__ = ["CalculateFn", "IndicatorCategory", "IndicatorRegistry", "IndicatorSpec"]
