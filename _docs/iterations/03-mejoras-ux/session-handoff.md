# Handoff de Sesión `/sdd-brainstorm`

**Iteración:** 03 — Mejoras UX (`mejoras-ux`)
**Fecha:** 29 de septiembre de 2026
**Insumo:** `_docs/iterations/03-mejoras-ux/spec-insumo.md` (UI_improvement.md)

## Resumen ejecutivo (5 líneas)

La base de datos ya es correcta y descargable (ciclo 02); el cuello de botella
pasó a la experiencia de análisis. Este ciclo elimina el ruido de indicadores,
persiste la configuración del gráfico en el navegador, amplía el área y precisión
del chart, permite editar dibujos, centra las pantallas de Descarga/Abrir, añade 5
pares forex y salda la deuda del timeframe `1s`. Se prioriza el orden del insumo
(Gráfico → Descarga → Abrir).

## Artefactos generados

- `_docs/plan.md`
- `_docs/requirements.md`
- `_docs/glossary.md` (compartido, ampliado)
- `_docs/traceability.md`
- `_docs/session-handoff.md`

## Decisiones tomadas

- **D-1:** Indicadores existentes (RSI, ATR, MM) **sin carga por defecto**; se agregan a petición.
- **D-2:** Persistencia de la configuración del gráfico en el **navegador** (`localStorage`/IndexedDB); **modifica `RI-003`** del ciclo 01.
- **D-3:** Marcas de compra/venta con offset de **pip estándar** (`0.0001` no-JPY / `0.01` JPY), fuera del rango de la vela.
- **D-4:** Edición de dibujos = **mover + redimensionar** (M); **undo/redo** queda como Could sujeto a `/sdd-stack`.
- **D-5:** Implementar **`GET /assets`** y eliminar el espejo del frontend.
- **D-6:** Retirar `"1s"` del contrato `Timeframe` (API + espejo TS) y de la UI.

## Preguntas abiertas / pendientes

- **P-1 [stack]:** viabilidad técnica de undo/redo de dibujos (RF-213, Could).
- **P-2 [integraciones]:** `instrument_id` exacto de Dukascopy para los 5 pares nuevos (RX-201, S-1).
- **P-3 [backlog]:** esquema/clave exacta de persistencia de dibujos (RI-201, R-206).

## Checklist de completitud

- [x] ¿Hay RNF definidos? (RNF-201..205 + heredados)
- [x] ¿Hay fuera de alcance explícito? (§3.2)
- [x] ¿Cada requisito tiene criterio de aceptación? (Dado/Cuando/Entonces)
- [x] ¿Hay al menos un riesgo identificado? (R-201..R-206)
- [x] ¿Hay stakeholders definidos? (usuario único + mantenedor)
- [x] ¿Hay KPIs medibles? (KPI-201..KPI-205)

## Notas de proceso (del insumo)

- Cualquier cambio que afecte al backend debe abordarse de forma conjunta y quedar operativo.
- Cada pantalla terminada debe ser **validada visualmente por el usuario** antes de aprobarse (levantar el sistema).
- El orden de prioridad es el del insumo salvo justificación.

## Próximo skill sugerido

`/sdd-stack` — Selección/confirmación de stack y arquitectura: diseño de la capa
de edición de dibujos, esquema de persistencia en navegador y `GET /assets`.
