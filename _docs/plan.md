# Plan del Proyecto: Mejoras UX del Gráfico y Cierre de Deuda (Ciclo 05)

**Iteración:** 05 — `mejoras-ux-grafico`
**Estado:** Aprobado — pendiente de `/sdd-stack`
**Fecha:** 6 de octubre de 2026
**Precede:** `_docs/iterations/04-dibujo-referencia-operacion/`
**Insumo:** `cycle_05.md` (raíz del repo)

## 1. Contexto y justificación

### 1.1 Qué quedó hecho y qué falta

El ciclo 04 cerró la herramienta de dibujo **Operación** (Entrada, SL y tres objetivos) sobre el
overlay existente: 20/20 tareas, 19/19 requisitos propios 🟢 y CI en verde. Con eso el proyecto ya
tiene datos, navegación y anotación de operaciones. Lo que no tiene es **fluidez de análisis sobre
el gráfico**: el ciclo deja tres fricciones de uso diario y dos piezas sin cerrar.

### 1.2 Problemas confirmados en sesión

1. **Se pierde la selección al cambiar de hoja.** La selección del gráfico (activo, TF, rango)
   viaja en la URL (`/chart?symbol=…&timeframe=…`), pero el enlace de navegación apunta a
   `/chart` sin query; al volver desde otra hoja se cae a los valores por defecto (`EURUSD` +
   `1h`). Los dibujos y los indicadores **sí** se conservan: lo que se pierde es la selección.
2. **Aviso de cobertura parcial discutible.** El gráfico avisa «La cobertura disponible es menor
   al rango solicitado» con rangos que el usuario ve correctos. La condición actual compara el
   primer/último bucket servido contra el rango pedido, sin distinguir bordes de TF y huecos de
   mercado; hay que **diagnosticar antes de tocar**.
3. **El TF es una jaula para los dibujos.** La configuración se persiste con la clave
   `fxtrad.chart.v1.{activo}.{timeframe}`, así que un Fibonacci dibujado en `GBPUSD 1h` no existe
   en `15m`. Además, cambiar de TF obliga a salir a la pantalla `Abrir`.
4. **Superficie que no aporta.** La pantalla `Multigráfico` (SCR-005) no se usa con comodidad y
   duplica el mantenimiento del gráfico; `Exportar` (SCR-006) nunca se ha evaluado con criterio.
5. **Deuda heredada sin requisito.** `TECH-302` (contraste de `drawLine`, 3.16:1) y `TECH-303`
   (entrada numérica de Entrada/SL) siguen abiertas desde el ciclo 04.

**Por qué ahora:** ninguna de las tres fricciones exige datos nuevos ni backend; son cambios
acotados al frontend y a su modelo de persistencia. Es el momento de pagarlas antes de añadir
capacidad nueva (series de operaciones), que es la brecha de producto que el ciclo 04 dejó.

## 2. Objetivos

### Objetivo general

Devolver fluidez a la pantalla `Gráfico`: selección persistente, cambio de TF en contexto,
dibujos e indicadores coherentes entre timeframes, eje temporal legible y consulta rápida de la
vela; cerrar la deuda de contraste y entrada numérica, y retirar la superficie que no aporta.

### Objetivos específicos (SMART)

- **OE-401:** cerrar el 100 % de los 12 frentes del insumo (`cycle_05.md`), con los **Must**
  verificados por el usuario en el cierre.
- **OE-402:** migrar el documento de configuración a **v2 por activo** sin perder **ningún**
  dibujo previamente persistido.
- **OE-403:** permitir el cambio de TF **sin salir del gráfico**, conservando dibujos e
  indicadores.
- **OE-404:** 0 regresiones en las suites existentes (frontend y backend).
- **OE-405:** retirar `Multigráfico` y dejar una **decisión documentada** sobre `Exportar`.

### KPIs

| KPI | Métrica | Meta | Frecuencia |
|-----|---------|------|------------|
| KPI-401 | Frentes del insumo verificados por el usuario | 12/12 | Al cierre |
| KPI-402 | Regresiones en las suites existentes | 0 (frontend en verde, backend intacto) | Por commit |
| KPI-403 | Dibujos previos perdidos en la migración v1→v2 | 0 | Al cierre |
| KPI-404 | FPS con pan/zoom y arrastre de la figura activa | ≥60, 0 frames caídos | Al cierre |
| KPI-405 | Evaluación de `Exportar` cerrada con decisión documentada | 1/1 | Al cierre |

## 3. Alcance

### 3.1 Dentro del alcance (IN)

Prioridad MoSCoW por frente del insumo:

| Frente | Requisito | Prioridad | Nota |
|--------|-----------|-----------|------|
| 2.a selección persistente | RF-401 | **Must** | Bug con causa raíz localizada (URL sin query) |
| 2.b aviso de cobertura | RF-402 | **Must** | Diagnóstico primero: puede no ser falso positivo |
| 2.c.1 cambio de TF en el gráfico | RF-403 | **Must** | |
| 2.c.2 dibujos compartidos por activo | RF-404 | **Must** | Cambia el modelo de persistencia (v2) |
| 2.c.3 indicadores adaptados al TF | RF-405 | **Must** | Lista del activo recalculada por TF |
| 2.c.4 selector de TF arriba | RF-406 | **Must** | `1m, 5m, 15m, 1h, 4h, 1d` |
| 2.c.5 eje X con el formato original de una fila (**D-19**) | RF-407 | Should | |
| 2.c.6 clic derecho → OHLC | RF-408 | Should | |
| 2.d retirada de Multigráfico | RF-409 | Should | Modifica RF-310 del ciclo 04 |
| TECH-303 entrada numérica | RF-410 | Should | Deja de ser deuda sin requisito |
| 2.e evaluación de Exportar | RF-411 | Could | Decisión al cierre |
| TECH-302 contraste de `drawLine` | RNF-405 | Should | Cuelga del RNF de contraste, sin RF propio |

No funcionales e información: RNF-401 (no perder dibujos al migrar), RNF-402 (0 regresiones),
RNF-403 (60 FPS), RNF-404 (medir el cambio de TF), RNF-405 (contraste ≥4.5:1 del eje),
RI-401 (documento v2 por activo con migración aditiva), RI-402 (la última selección se
recupera), RX-401 (sin dependencias nuevas).

### 3.2 Fuera del alcance (OUT)

- **Series de operaciones** y métricas de estrategia (win rate, R total, curva de resultados):
  es la brecha del ciclo 04, pero no es el propósito de este ciclo.
- Backtesting automático y ejecución de estrategias (`RF-W-306`).
- **Timeframe `30 m`**: no existe en el contrato ni en la base 1 m; se corrige el glosario
  (decisión D-6), no se implementa.
- Mejora o sustituta del **Multigráfico**: se retira, no se arregla.
- Persistencia en backend o sincronización entre dispositivos.
- **Deuda de la auditoría `CR-002`**: refactores de tamaño (`ChartPane.tsx` 874 líneas,
  `run_download_range` 110), contrato de logging y motivos de waiver. Queda en el backlog para
  que `/sdd-backlog` la promueva cuando toque (decisión D-8).
- Soporte táctil (`RF-W-307`) y dependencias nuevas.

## 4. Stakeholders

| Rol | Interés | Influencia | Expectativa |
|-----|---------|------------|-------------|
| Usuario único (trader/analista) | Analizar sin perder el contexto ni el trabajo | Alta | La hoja `Gráfico` se comporta como una sesión, no como un formulario que se resetea |
| Mantenedor del código | Cambio acotado al frontend, sin regresiones | Alta | Reutilizar el overlay y la persistencia existentes; suites en verde |

## 5. Restricciones

| Tipo | Descripción | Origen |
|------|-------------|--------|
| Plataforma | Persistencia en `localStorage` sujeta a cuota; no hay backend para dibujos | RI-003 · ADR-018 |
| Compatibilidad | No perder los documentos v1 ya persistidos | RNF-304 (04) · ADR-023 |
| Contrato | Los TF válidos son los de `TIMEFRAMES` (`1m, 5m, 15m, 1h, 4h, 1d`) | `contracts/ohlc.ts` |
| Rendimiento | 60 FPS con la figura activa durante pan/zoom y arrastre | RNF-001/202 (01/03) |
| Design | Tokens como fuente única con test de anti-drift | RNF-204 (03) · D-5 (04) |
| Costo | $0 (solo OSS), sin dependencias nuevas | RNF-006 · RX-401 |
| Plazo | 2 semanas (negociable) | RNF-007 (01) |
| Interacción | Escritorio con ratón; el menú contextual no sustituye atajos existentes | RNF-005 · S-1 (04) |

## 6. Supuestos

- **S-1:** los documentos v1 viven solo en el `localStorage` local; no hay datos en servidor que
  migrar ni coordinar.
- **S-2:** los dibujos están anclados en `(tiempo, precio)`, por lo que son válidos en cualquier
  TF sin reproyectar su geometría.
- **S-3:** el aviso de cobertura (RF-402) es un falso positivo de borde; **se confirma con el
  diagnóstico** antes de tocar la condición (si no lo fuera, se ajusta el texto y se conserva).
- **S-4:** el dolor de Multigráfico no desaparece al arreglar RF-401; se comprueba con la
  evidencia antes de la retirada.
- **S-5:** la lista de indicadores por activo recalculada por TF cubre la necesidad; no hace falta
  una configuración distinta por TF.

## 7. Riesgos

| ID | Descripción | Prob. | Impacto | Exposición | Mitigación |
|----|-------------|-------|---------|------------|------------|
| R-401 | La migración v1→v2 pierde o duplica dibujos del usuario | M | A | M×A | Migración **aditiva al leer** (no borra claves v1) + test de round-trip con documento v1 mixto; KPI-403 |
| R-402 | Retirar Multigráfico rompe RF-310 y deja tests huérfanos | M | M | M×M | Modificación explícita de RF-310 en `traceability.md`; borrar ruta + pantalla + tests en la misma tarea |
| R-403 | El aviso de cobertura es correcto y eliminarlo oculta datos incompletos | M | M | M×M | Diagnosticar primero (PA-1); si es correcto, se conserva con texto más claro |
| R-404 | El selector de TF desincroniza estado, URL y persistencia | M | M | M×M | La URL sigue siendo la fuente de la selección (RF-401); test de ida y vuelta |
| R-405 | El eje X en dos filas se solapa a zoom de 2 años | B | B | B×B | **Retirado (D-19):** se mantiene el formato de una fila de la librería; sin franja propia |
| R-406 | El cambio de TF degrada el render con la figura activa | B | M | B×M | Recalcular solo las velas del TF visible; frame budget de RNF-403 |

## 8. Matriz de navegación por rol

| Rol | Documentos que debe leer | Frecuencia |
|-----|--------------------------|------------|
| Usuario (sponsor) | `plan.md` | Inicio y cierre de iteración |
| Arquitecto | `plan.md`, `requirements.md`, ADR nuevos | Continuo |
| Dev | `requirements.md`, `backlog.md`, ADR nuevos | Diario |
| QA / auditoría | `requirements.md`, `traceability.md`, `_docs/reviews/` | Continuo |
