# Handoff de Sesión

> Estado al cierre del ciclo 04 y arranque del ciclo 05 — 2026-10-02

## Dónde estamos

**Ciclo 04 cerrado y archivado** en
`_docs/iterations/04-dibujo-referencia-operacion/`:
20/20 tareas · 56/56 pts · 19/19 requisitos propios 🟢 · ruta crítica 7/7 · CI en verde.

**Ciclo 05 abierto y vacío.** Solo arrastra la deuda que el ciclo 04 difirió
(`TECH-302`, `TECH-303`). No hay plan, ni épicas, ni requisitos nuevos.

## Decisiones recientes que importan

- **Alcance del proyecto:** backtesting **manual** (anotar operaciones sobre el precio
  histórico). El automatizado —motor de ejecución, métricas de estrategia— sigue fuera de
  alcance (`RF-W-205`).
- **DP-7 (ciclo 04):** un gate rojo en CI se corrige aunque sea mecánica y cueste 1 punto.
  Se entrena al equipo a ignorar el pipeline, y lo que hay debajo queda oculto.
- **Regla que salió de aquel trabajo:** cuando un test falla solo en CI, **verificar contra
  el runtime de destino**, no confiar en el verde local. Ya hay `.nvmrc` (20) y
  `engines: >=20` para sellar la paridad.
- **DP-6 (ciclo 04):** el número de tests del `README.md` sale de la ejecución real, nunca
  de memoria.

## Estado técnico

| Aspecto | Valor |
|---------|-------|
| Backend | FastAPI + Celery + DuckDB/Parquet, 546 tests + 2 skip |
| Frontend | React + Vite + lightweight-charts, 458 tests (55 archivos) |
| Dependencias | Sin nuevas desde el ciclo 03 (RX-301) |
| CI | `make ci` replica los jobs en local; run #31 en `success` |
| Node | `.nvmrc` = 20 (CI usa 20; el desarrollo local puede usar ≥20) |

## Brecha principal que deja el ciclo 04

**No hay series de operaciones.** Cada dibujo va suelto: para probar una estrategia hacen
falta varias operaciones y hoy no hay forma de agruparlas ni de ver su resultado conjunto.
Es la candidata más natural a propósito del ciclo 05.

## Qué haría yo ahora

1. `/sdd-brainstorm` sobre las **series de operaciones** (y decidir si `TECH-302`/`TECH-303`
   entran con él).
2. `/sdd-backlog` para promover la deuda a tareas con épica y requisito.
3. `/sdd-plan` para el plan del ciclo 05. **Sin `plan.md` las skills `/sdd-implement` y
   `/sdd-plan` no tienen con qué trabajar.**

## Avisos

- `requirements.md`, `architecture.md`, `adr/` y `ux/` de la raíz son **copias** de los del
  ciclo 04: se copiaron porque son acumulativos y `/sdd-backlog` los lee desde la raíz. Al
  abrir el ciclo 05, los que cambien se editan en la raíz (el archivo ya es el histórico).
- `_cierre.md` del ciclo 04 tiene una sección "Qué se aprendió" que vale la pena leer antes
  de arrancar: explica por qué el gate rojo del lint ocultaba un bug de coma flotante.