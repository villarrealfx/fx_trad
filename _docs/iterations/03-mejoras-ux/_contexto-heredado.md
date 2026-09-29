# Contexto heredado — Ciclo 03: mejoras-ux

> Insumo para `/sdd-brainstorm` del ciclo 03.
> Creado: 2026-09-29 · Ciclo origen previo: `02-optimizacion-descarga`

## Ciclos cerrados (histórico disponible)

- `_docs/iterations/01-mvp/` — MVP, 34 tareas ✅.
- `_docs/iterations/02-optimizacion-descarga/` — 24/24 tareas ✅, base 1 m y descarga viable.

## Insumo de este ciclo

- `_docs/iterations/03-mejoras-ux/spec-insumo.md` (copia de `UI_improvement.md`):
  mejoras de UI en pantallas **Gráfico**, **Descarga** y **Abrir**.

## Deuda asumida del ciclo 02 (incluida por decisión del usuario)

- `contracts.ohlc.Timeframe` conserva `"1s"` (API + espejo TS); el storage ya lo rechaza
  con `InvalidTimeframeError`. **Se aborda en este ciclo 03** — encaja con el punto 3 de
  `spec-insumo.md` (pantalla `Abrir`: eliminar toda referencia a timeframe de 1 s).

## Herencia entre ciclos

| Artefacto | Herencia |
|-----------|----------|
| `glossary.md` | ✅ compartido, crece |
| `logging-contract.md` | ✅ contrato global |
| `adr/` (ADR-001…011) | ✅ vigentes salvo reemplazo |
| `adr/` ciclo 02 (ADR-012…016) | ✅ vigentes salvo reemplazo |
| `architecture.md`, `plan.md`, `requirements.md`, `backlog.md`, `traceability.md` | ❌ nuevos por ciclo |

## Convenciones del ciclo 03

- Nuevos ADRs: numeración desde **ADR-017**.
- Referencias a requisitos previos: marcar `[modifica RF-XXX del ciclo 02-optimizacion-descarga]`.
