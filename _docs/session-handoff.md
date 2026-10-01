# Handoff de Sesión `/sdd-brainstorm`

**Iteración:** 04 — Dibujo Referencia de Operación (`dibujo-referencia-operacion`)
**Fecha:** 1 de octubre de 2026
**Insumo:** `mark_buy _sell.md`
**Contexto heredado:** `_docs/iterations/03-mejoras-ux/_cierre.md`, `_docs/adr/` (21 ADRs vigentes), `_docs/glossary.md`, `_docs/logging-contract.md`

## Resumen ejecutivo (5 líneas)

El proyecto existe para el **backtesting manual** de estrategias, y el ciclo 03 resolvió la
experiencia de análisis pero no la anotación de operaciones. Este ciclo añade una herramienta
de dibujo que representa una **operación completa** — Entrada, SL y tres objetivos (1.382R,
1.5R, 2R)— con la dirección deducida automáticamente y los precios calculados sobre
`R = |Entrada − SL|`. Se reutiliza íntegramente la capa de dibujos del ciclo 03 (ADR-017):
un `kind` nuevo, sin reescribir el overlay ni tocar las herramientas existentes. El alcance
es deliberadamente estrecho: **solo anotar**; series de operaciones, métricas de estrategia,
tamaño de posición y TP configurables quedan fuera.

## Artefactos generados

- `_docs/plan.md`
- `_docs/requirements.md`
- `_docs/glossary.md` (compartido, ampliado con 6 términos + acronyms + entidad `Operación`)
- `_docs/traceability.md`
- `_docs/session-handoff.md`

## Decisiones tomadas

- **D-1:** El **backtesting manual** es el propósito del proyecto; el automatizado sigue OUT.
  Esto invierte `RF-W-205` del ciclo 03 (plan.md §1.1).
- **D-2:** Las dos anclas son **Entrada y SL** (no "SL y referencia 1:1"), aunque el flujo
  manual actual del usuario requiera colocar el segundo punto donde la Entrada cae en 0.5.
  La dirección se deduce de `Entrada` vs `SL`; la referencia 1:1 queda como nivel de cálculo.
- **D-3:** Los TP son **múltiplos de R desde la Entrada** (`Entrada ± k·R`, k = 1.382, 1.5, 2),
  no posiciones del eje Fibonacci. Consecuencia: el precio coincide con lo que dice la
  etiqueta (`TP 1.382` = 1.382R). Descartada la alternativa del ratio lineal, que reutilizaba
  `FIB_LEVELS` pero situaba `TP 1.382` a 1.764R.
- **D-4:** El **desenlace** de la operación (¿tocó SL? ¿alcanzó TP?) es **legible** por el
  usuario comparando el precio con las líneas marcadas. No es una función calculada ni un dato
  persistido (`RF-W-302`). Cierra la causa raíz #2 por diseño, sin alcance adicional.
- **D-5:** **Tres tokens de color** (`drawOpSl` `#EF5350`, `drawOpEntry` `#E6EDF3`,
  `drawOpTp` `#26A69A`) que reutilizan valores ya validados del design system; los tres TP
  comparten verde. Extienden la paleta mate sin romperla ni los tests de anti-drift.
- **D-6:** Las **etiquetas se dibujan siempre** con separación vertical mínima y línea guía
  (en vez de ocultarse o solaparse) porque a zoom de 2 años los niveles quedan a ~14 px.
- **D-7:** La herramienta entra en la paleta de `ChartPane`, por lo que queda disponible
  **también en Multigráfico** sin trabajo adicional.
- **D-8:** Persistencia **sin campos nuevos**: dirección, `R`, niveles y etiquetas son
  derivados de las dos anclas en el documento de dibujos.

## Preguntas abiertas / pendientes

- **P-301 [stack]: RESUELTA en `/sdd-stack` → ADR-023.** Cambio **aditivo en v1**, sin
  bumpar versión ni clave. Nota: la persistencia real es `state/chart-config.ts`
  (`CHART_CONFIG_VERSION`, clave `fxtrad.chart.v1.{symbol}.{timeframe}`); los
  `serializeDrawings`/`deserializeDrawings` de `drawings.ts` solo se usan en sus tests.
  La estructura del documento no cambia, así que `RNF-304` se cumple sin migración.
- **P-302 [backlog]: RESUELTA en `/sdd-ux`.** Herramienta **"Operación"** con ícono
  `◎`, colocada **después de `Φ`**. Se descartó "Compra/Venta" (colisiona con ▲/▼ y la
  dirección es automática) y "R:R" (el 1:1 no se dibuja).
- **P-303 [ux]: RESUELTA en `/sdd-ux`.** Las 5 líneas se extienden **de extremo a extremo**
  del chart. Motivo: las etiquetas van a la derecha del 2º ancla (plan.md §3.1-8) y RF-312
  exige leer el desenlace de una vela 300 barras después; si la línea acabara en el SL no
  habría nada que leer.
- **P-304 [stack]: RESUELTA en `/sdd-stack` → ADR-024.** Contraste medido sobre
  `#0A0C10`: `drawOpSl #EF5350` **5.61:1** · `drawOpEntry #E6EDF3` **16.56:1** ·
  `drawOpTp #26A69A` **6.53:1**. Los tres superan 4.5:1 (líneas y texto). Nota colateral
  fuera de alcance: `drawLine #4A6572` queda en 3.16:1 (preexistente del ciclo 03).
- **P-305 [ux]: RESUELTA en `/sdd-ux`.** Etiqueta de **una línea** `TP 1.382  1.10691`
  (nombre en `text-muted`, precio en el color del nivel). Dos líneas obligarían a separar
  ~28 px en el peor zoom y empeorarían RNF-301.
- **P-306 [backlog]:** confirmar que "criterios de persistencia adaptados" (insumo §10) se
  cumple con el esquema vigente sin campos nuevos (hoy es un supuesto, S-4).

## Checklist de completitud

- [x] ¿Hay RNF definidos? (RNF-301…305 propios + heredados)
- [x] ¿Hay fuera de alcance explícito? (§3.2 · `RF-W-301…307`)
- [x] ¿Cada requisito tiene criterio de aceptación? (Dado/Cuando/Entonces)
- [x] ¿Hay al menos un riesgo identificado? (R-301…R-305)
- [x] ¿Hay stakeholders definidos? (usuario único + mantenedor)
- [x] ¿Hay KPIs medibles? (KPI-301…305)
- [x] ¿Las 10 validaciones del insumo están cubiertas? (RF-301…312)

## Cobertura del insumo

| Caso de validación (`mark_buy _sell.md` §Validación) | Requisito |
|---|---|
| 1. Creación correcta de una operación Long | RF-301, RF-302, RF-303 |
| 2. Creación correcta de una operación Short | RF-302, RF-303, RF-305 |
| 3. Cálculo correcto de 1.382, 1.5 y 2 | RF-303 |
| 4. Actualización de niveles al modificar Entrada | RF-305 |
| 5. Actualización de niveles al modificar SL | RF-305 |
| 6. Desplazamiento conservando proporciones | RF-305, RF-307 |
| 7. Precios correctos en las etiquetas | RF-308 |
| 8. Un único dibujo | RF-306 |
| 9. Integración en la pantalla Gráfico | RF-310 |
| 10. Persistencia según criterios del proyecto | RF-311, RNF-304 |

## Notas de proceso (del insumo)

- Reutilizar siempre la funcionalidad existente del dibujo Fibonacci antes de implementar
  mecanismos equivalentes (insumo §Integración.7).
- La incorporación **no debe modificar ni romper** las herramientas existentes (§Integración.8).
- Cada tarea de UI terminada se valida visualmente levantando el sistema antes de aprobarse.

## Próximo skill sugerido

`/sdd-backlog` — Desglose en tareas de lo aprobado en `/sdd-stack` y `/sdd-ux`
(`_docs/architecture.md` + ADR-022…025): módulo `charting/operation-geometry`, `kind`
`'operation'` en `drawings`/`overlay-geometry`/`drawing-edit`, render en `OverlayCanvas`,
herramienta en `ChartPane`, tokens `drawOp*` y sus tests. Pendientes de backlog: P-302
(nombre e ícono en la paleta) y P-306 (confirmar la.persistence sin campos nuevos).
