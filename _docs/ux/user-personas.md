# Personas — Ciclo 05 (Mejoras UX del Gráfico y Cierre de Deuda)

> Derivadas de los stakeholders de `_docs/plan.md` §4.
> Base: `_docs/iterations/04-dibujo-referencia-operacion/ux/user-personas.md`.
> **Sin personas nuevas**: el stakeholder set no cambió.

## P-001: Andrés

- **Stakeholder origen:** Usuario único (trader/analista) — `_docs/plan.md` §4.
- **Rol:** Analista técnico (operador único; converge Admin/Dev/QA). Sin autenticación ni
  multiusuario (`RF-W-407`).
- **Contexto:** Usuario avanzado de mercados, desktop-first, uso diario de apps de trading
  (TradingView, brokers). Opera en su máquina local. El **propósito del proyecto desde el ciclo 04
  es el backtesting manual** (`plan.md` §1.1): probar una estrategia anotando operaciones sobre el
  precio histórico. El ciclo 05 ataca la **fluidez** de esa sesión de análisis.
- **Objetivo principal:** **Analizar sin perder el hilo**: volver a `Gráfico` con el mismo activo,
  timeframe y rango; cambiar de timeframe sin salir de la pantalla; que los dibujos sigan ahí
  cuando cambia la escala temporal; y leer el dato exacto de una vela concreta sin reconstruirlo
  del eje.
- **Frustraciones** (reformuladas para este ciclo desde `plan.md` §1.2 y `cycle_05.md`):
  1. **La selección se resetea:** al ir a otra hoja y volver, el gráfico muestra EURUSD 1h aunque
     estuviera analizando GBPUSD 15m. Dibujos e indicadores **sí** se conservan: es la selección
     la que se pierde.
  2. **El timeframe es una jaula:** un Fibonacci dibujado en 1h no existe en 15m, así que comparar
     escalas obliga a redibujar. Y cambiar de TF exige salir a la pantalla `Abrir`.
  3. **Avisos que no se corresponden:** el gráfico avisa de cobertura recortada con rangos que se
     ven completos; la confianza en el aviso se degrada.
  4. **Cifras que no se pueden fijar con el ratón:** a zoom de 2 años (~1,2 px/pip) colocar el SL
     en `1.09500` es imposible (brecha del ciclo 04, **la cierra RF-410**).
  5. ~~Se pierde el trabajo~~: resuelto en el ciclo 03; el ciclo 05 amplía la persistencia a un
     documento por activo (`RI-401`).
- **Nivel técnico:** Alto.
- **Dispositivo preferido:** Desktop, navegador moderno, **con ratón** (RNF-005; táctil OUT en
  `RF-W-407`).
- **Frecuencia de uso:** Diaria.
- **Cita representativa:** "Que el gráfico se quede donde lo dejé y que mis dibujos valgan para
  cualquier escala temporal."

### Necesidades de UX derivadas (contrato de este ciclo)

| Necesidad | Requisito | Cómo la cubre la UX |
|-----------|-----------|---------------------|
| Volver y encontrar la sesión intacta | RF-401, RI-402 | Precedencia URL > persistido > defecto (ADR-028); la hoja `Gráfico` retoma activo, TF y rango |
| Cambiar de escala sin salir | RF-403, RF-406 | `TimeframeSelector` (CMP-023) en la cabecera del gráfico, junto a Indicadores |
| Un dibujo, todas las escalas | RF-404 | Anclas `(tiempo, precio)` + documento v2 por activo (ADR-027) |
| Indicadores coherentes con la escala | RF-405 | Lista del activo recalculada con las velas del TF visible |
| Eje legible sin ambigüedad | RF-407 | Dos filas: fecha arriba, `hh:mm` abajo (`AXIS_TOKENS`) |
| El dato exacto de una vela | RF-408 | Menú contextual (CMP-024) con fecha, hora y OHLC |
| Precio exacto sin pelear con el ratón | RF-410 | Popover numérico anclado a la figura (CMP-025) + ruta por teclado |
| Confiar en los avisos | RF-402 | El aviso de cobertura solo aparece si la serie no cubre el rango |
| Cerrar la deuda sin ruido visual | RNF-405 | `color-draw-line` a 5.25:1 (era 3.16:1) |

## Sin persona: Mantenedor del código

- **Stakeholder origen:** Mantenedor del código — `_docs/plan.md` §4.
- **Motivo de exclusión (heredado del ciclo 03):** No opera la interfaz; su expectativa (cambio
  acotado, sin regresiones) se traduce en restricciones técnicas (RNF-402, OE-404), no en journeys.

## Cobertura de stakeholders

| Stakeholder (`plan.md` §4) | Persona | ¿Journey en este ciclo? |
|---------------------------|---------|------------------------|
| Usuario único (trader/analista) | P-001 | Sí — J-011, J-012, J-013 (+ J-002, J-009 extendidos; J-008/J-010 vigentes) |
| Mantenedor del código | — (excluida por diseño) | No; se traduce en RNF-402 |

✅ Toda persona deriva de un stakeholder declarado. Ninguna inventada.
