"""Tests del endpoint GET /assets (TASK-020, RF-007/CMP-006).

DoD: devuelve el catálogo de activos con datos almacenados en el contrato
``[{symbol, type, coverage_start, coverage_end, status}]`` y un test unitario
del mapping de estado. Se cubre el contrato con stubs de las tiendas y la
coherencia con una integración real Parquet + DuckDB (fixture marzo 2026).
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient

from fxtrad.api import create_app
from fxtrad.api.catalog import AssetStatus, CatalogQuery
from fxtrad.contracts.ohlc import Candle
from fxtrad.storage import DownloadMetadata, DownloadMetadataStore, ParquetSeriesStore

_BASE_TIME = 1772409600  # 2026-03-02T00:00:00Z (lunes, fixture marzo 2026)
_HOUR = 3600


class _FakeQueue:
    """Stub mínimo de DownloadQueue para construir la aplicación."""

    def enqueue(self, request: object) -> str:
        return "fake-task"


class _FakeBankRecord:
    """Registro mínimo de descarga para el stub de metadatos."""

    def __init__(self, activo: str, estado: str) -> None:
        self.activo = activo
        self.estado = estado


class _FakeSeriesStore:
    """Stub de ParquetSeriesStore con una cobertura fija por activo."""

    def __init__(self, coverage: dict[str, tuple[int, int] | None]) -> None:
        self._coverage = coverage

    def coverage(self, symbol: str) -> tuple[int, int] | None:
        return self._coverage.get(symbol)


class _FakeMetadataStore:
    """Stub de DownloadMetadataStore con un historial fijo (más reciente primero)."""

    def __init__(self, history: list[_FakeBankRecord]) -> None:
        self._history = history

    def history(self) -> list[_FakeBankRecord]:
        return self._history


def _client(
    coverage: dict[str, tuple[int, int] | None] | None = None,
    history: list[_FakeBankRecord] | None = None,
) -> TestClient:
    """Construye la app con el catálogo sobre stubs de tiendas."""
    catalog = CatalogQuery(  # type: ignore[arg-type]
        _FakeSeriesStore(coverage or {}),
        _FakeMetadataStore(history or []),
    )
    return TestClient(create_app(_FakeQueue(), catalog_query=catalog))


def _second_candles(start: int, count: int) -> list[Candle]:
    """Serie 1s con OHLC determinista para la integración real."""
    return [
        Candle(time=start + i, open=float(i), high=float(i + 1), low=float(i), close=float(i))
        for i in range(count)
    ]


def _metadata(activo: str, estado: str, inicio: int, fin: int) -> DownloadMetadata:
    """Registro de metadatos para la integración real (RI-002)."""
    return DownloadMetadata(
        activo=activo,
        inicio=inicio,
        fin=fin,
        estado=estado,
        fecha_descarga=datetime(2026, 3, 2, 12, 0, tzinfo=UTC),
        filas=1,
    )


class TestAssetsContract:
    """Contrato CMP-006: activos con datos, en orden canónico y con cobertura."""

    def test_returns_catalog_rows_for_stored_assets(self) -> None:
        client = _client(
            coverage={
                "EURUSD": (_BASE_TIME, _BASE_TIME + _HOUR),
                "XAUUSD": (_BASE_TIME, _BASE_TIME + _HOUR),
            }
        )

        response = client.get("/assets")
        body = response.json()

        assert response.status_code == 200
        assert body == [
            {
                "symbol": "EURUSD",
                "type": "forex",
                "coverage_start": _BASE_TIME,
                "coverage_end": _BASE_TIME + _HOUR,
                "status": "completo",
            },
            {
                "symbol": "XAUUSD",
                "type": "metal",
                "coverage_start": _BASE_TIME,
                "coverage_end": _BASE_TIME + _HOUR,
                "status": "completo",
            },
        ]

    def test_excludes_assets_without_stored_data(self) -> None:
        client = _client(coverage={"EURUSD": (_BASE_TIME, _BASE_TIME + _HOUR)})

        body = client.get("/assets").json()

        assert [row["symbol"] for row in body] == ["EURUSD"]

    def test_empty_catalog_returns_empty_list(self) -> None:
        client = _client(coverage={})

        body = client.get("/assets").json()

        assert body == []


class TestAssetsNewForexPairs:
    """TASK-203: el contrato AssetRow cubre los 5 pares forex añadidos."""

    _NEW_PAIRS = ("GBPJPY", "EURJPY", "AUDUSD", "USDCAD", "EURGBP")

    def test_lists_five_new_pairs_with_coverage(self) -> None:
        new_coverage = dict.fromkeys(self._NEW_PAIRS, (_BASE_TIME, _BASE_TIME + _HOUR))
        client = _client(coverage=new_coverage)

        rows = client.get("/assets").json()

        assert [row["symbol"] for row in rows] == list(self._NEW_PAIRS)
        assert all(row["type"] == "forex" for row in rows)

    def test_rows_match_assetrow_contract(self) -> None:
        coverage = dict.fromkeys(self._NEW_PAIRS, (_BASE_TIME, _BASE_TIME + _HOUR))
        client = _client(coverage=coverage)

        rows = client.get("/assets").json()

        expected_keys = {"symbol", "type", "coverage_start", "coverage_end", "status"}
        assert all(set(row) == expected_keys for row in rows)


class TestAssetStatusMapping:
    """El estado se deriva del último registro de descarga (SCR-001)."""

    def test_latest_success_is_completo(self) -> None:
        client = _client(
            coverage={"EURUSD": (_BASE_TIME, _BASE_TIME + _HOUR)},
            history=[
                _FakeBankRecord("EURUSD", "exito"),
                _FakeBankRecord("EURUSD", "parcial"),
            ],
        )

        rows = client.get("/assets").json()

        assert rows[0]["status"] == "completo"

    def test_latest_partial_is_partial(self) -> None:
        client = _client(
            coverage={"EURUSD": (_BASE_TIME, _BASE_TIME + _HOUR)},
            history=[
                _FakeBankRecord("EURUSD", "parcial"),
                _FakeBankRecord("EURUSD", "exito"),
            ],
        )

        rows = client.get("/assets").json()

        assert rows[0]["status"] == "parcial"

    def test_latest_failure_maps_to_partial(self) -> None:
        client = _client(
            coverage={"EURUSD": (_BASE_TIME, _BASE_TIME + _HOUR)},
            history=[_FakeBankRecord("EURUSD", "fallo")],
        )

        rows = client.get("/assets").json()

        assert rows[0]["status"] == "parcial"

    def test_without_metadata_defaults_to_completo(self) -> None:
        client = _client(coverage={"EURUSD": (_BASE_TIME, _BASE_TIME + _HOUR)})

        rows = client.get("/assets").json()

        assert rows[0]["status"] == "completo"

    def test_status_is_derived_per_asset(self) -> None:
        client = _client(
            coverage={
                "EURUSD": (_BASE_TIME, _BASE_TIME + _HOUR),
                "XAUUSD": (_BASE_TIME, _BASE_TIME + _HOUR),
            },
            history=[_FakeBankRecord("XAUUSD", "parcial")],
        )

        rows = client.get("/assets").json()

        assert {row["symbol"]: row["status"] for row in rows} == {
            "EURUSD": "completo",
            "XAUUSD": "parcial",
        }


class TestAssetsMatchesRealStores:
    """DoD: respuesta coherente con la cobertura real del Parquet y metadatos."""

    def _client(self, tmp_path: Path) -> TestClient:
        series_store = ParquetSeriesStore(tmp_path)
        series_store.write("EURUSD", _second_candles(_BASE_TIME, 120))
        series_store.write("WTI", _second_candles(_BASE_TIME, 60))
        metadata_store = DownloadMetadataStore(tmp_path)
        metadata_store.save(_metadata("EURUSD", "exito", _BASE_TIME, _BASE_TIME + 119))
        metadata_store.save(_metadata("WTI", "parcial", _BASE_TIME, _BASE_TIME + 59))
        catalog = CatalogQuery(series_store, metadata_store)
        return TestClient(create_app(_FakeQueue(), catalog_query=catalog))

    def test_coverage_and_status_from_real_stores(self, tmp_path: Path) -> None:
        client = self._client(tmp_path)

        body = client.get("/assets").json()

        assert body == [
            {
                "symbol": "EURUSD",
                "type": "forex",
                "coverage_start": _BASE_TIME,
                "coverage_end": _BASE_TIME + 119,
                "status": "completo",
            },
            {
                "symbol": "WTI",
                "type": "oil",
                "coverage_start": _BASE_TIME,
                "coverage_end": _BASE_TIME + 59,
                "status": "parcial",
            },
        ]

    def test_statuses_are_catalog_literal(self, tmp_path: Path) -> None:
        client = self._client(tmp_path)

        statuses = {row["status"] for row in client.get("/assets").json()}

        expected: set[AssetStatus] = {"completo", "parcial"}
        assert statuses == expected
