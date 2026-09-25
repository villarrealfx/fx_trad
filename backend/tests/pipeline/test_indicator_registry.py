"""Tests del registro extensible de indicadores (TASK-043, RF-016).

Verifican que los built-ins (MA/RSI/ATR) quedan registrados y coinciden con
`compute_indicators` (TASK-031), y que un plugin nuevo se descubre y registra
**sin modificar código existente** (extensibilidad de RF-016).
"""

from __future__ import annotations

import sys
import textwrap
from pathlib import Path

import pytest

from fxtrad.contracts.ohlc import Candle
from fxtrad.pipeline.indicator_registry import IndicatorRegistry, IndicatorSpec
from fxtrad.pipeline.indicators import MA_PERIODS_DEFAULT, REGISTRY, compute_indicators

_PLUGIN_MODULE = "fxtrad.pipeline.indicator_plugins.median_close"


def _candles(count: int = 40) -> list[Candle]:
    """Serie determinista con oscilación de cierre para ejercitar los cálculos."""
    base = 1_772_409_600
    candles: list[Candle] = []
    for index in range(count):
        close = 1.0 + (index % 7) * 0.5
        candles.append(
            Candle(
                time=base + index,
                open=close,
                high=close + 1.0,
                low=close - 1.0,
                close=close,
            )
        )
    return candles


class TestBuiltins:
    """Los indicadores built-in están registrados y no divergen de TASK-031."""

    def test_builtin_indicators_are_registered(self) -> None:
        assert {"MA", "RSI", "ATR"} <= set(REGISTRY.names())

    def test_registry_compute_matches_compute_indicators(self) -> None:
        candles = _candles()
        result = compute_indicators(candles, ma_periods=(MA_PERIODS_DEFAULT[0],))

        assert (
            REGISTRY.compute("MA", candles, MA_PERIODS_DEFAULT[0])
            == result.ma[MA_PERIODS_DEFAULT[0]]
        )
        assert REGISTRY.compute("RSI", candles, 14) == result.rsi[14]
        assert REGISTRY.compute("ATR", candles, 14) == result.atr[14]

    def test_default_period_is_used_when_omitted(self) -> None:
        candles = _candles()

        assert REGISTRY.compute("MA", candles) == REGISTRY.compute(
            "MA", candles, MA_PERIODS_DEFAULT[0]
        )

    def test_invalid_period_is_rejected(self) -> None:
        with pytest.raises(ValueError, match="Periodo de MA inválido"):
            REGISTRY.compute("MA", _candles(), 0)


class TestRegistration:
    """El registro valida duplicados y nombres inexistentes."""

    def test_duplicate_registration_is_rejected(self) -> None:
        registry = IndicatorRegistry()
        spec = IndicatorSpec(
            name="DUP", category="overlay", default_period=2, calculate=lambda c, p: ()
        )

        registry.register(spec)

        with pytest.raises(ValueError, match="ya registrado"):
            registry.register(spec)

    def test_unknown_indicator_is_rejected(self) -> None:
        with pytest.raises(ValueError, match="Indicador desconocido"):
            IndicatorRegistry().compute("NOPE", [], 3)


class TestExtension:
    """Un plugin nuevo se descubre y registra sin tocar código existente."""

    @pytest.fixture()
    def plugin_dir(self, tmp_path: Path) -> Path:
        (tmp_path / "median_close.py").write_text(
            textwrap.dedent(
                '''
                """Plugin de prueba: mediana móvil simple (solo para el test)."""
                from collections.abc import Sequence

                from fxtrad.contracts.ohlc import Candle
                from fxtrad.pipeline.indicator_registry import IndicatorRegistry, IndicatorSpec


                def calculate(candles: Sequence[Candle], period: int) -> tuple[float | None, ...]:
                    """Mediana de los cierres de la ventana ``period``."""
                    closes = [candle.close for candle in candles]
                    out: list[float | None] = []
                    for index in range(len(closes)):
                        if index + 1 < period:
                            out.append(None)
                        else:
                            window = sorted(closes[index + 1 - period : index + 1])
                            out.append(window[len(window) // 2])
                    return tuple(out)


                def register(registry: IndicatorRegistry) -> None:
                    registry.register(
                        IndicatorSpec(
                            name="median",
                            category="overlay",
                            default_period=3,
                            calculate=calculate,
                        )
                    )
                '''
            ).strip(),
            encoding="utf-8",
        )
        return tmp_path

    def test_new_plugin_is_discovered_without_touching_existing_code(
        self, plugin_dir: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import fxtrad.pipeline.indicator_plugins as plugins

        monkeypatch.setattr(plugins, "__path__", [str(plugin_dir)])
        monkeypatch.delitem(sys.modules, _PLUGIN_MODULE, raising=False)

        registry = IndicatorRegistry()
        registry.discover("fxtrad.pipeline.indicator_plugins")
        sys.modules.pop(_PLUGIN_MODULE, None)

        assert "median" in registry.names()
        series = registry.compute("median", _candles(5), 3)
        assert len(series) == 5
        assert series[0] is None and series[2] is not None
