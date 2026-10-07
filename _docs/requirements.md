# Requisitos — Ciclo 05 (Mejoras UX del Gráfico y Cierre de Deuda)

> Prioridad MoSCoW: **M**ust / **S**hould / **C**ould / **W**on't
> Tipos: **RF** (Funcional), **RNF** (No funcional), **RI** (Información), **RX** (Integración)
> Numeración: los IDs `4xx` son propios de este ciclo; los `0xx`/`1xx`/`2xx`/`3xx` heredan de
> `_docs/iterations/01-mvp/`, `02-optimizacion-descarga/`, `03-mejoras-ux/` y
> `04-dibujo-referencia-operacion/`.
> Las modificaciones a requisitos previos se marcan explícitamente al final.

## Requisitos funcionales

### Sesión de análisis (pantalla `Gráfico`)

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RF-401 | RF | Al cambiar de hoja y volver a `Gráfico`, se conserva la **última selección** del gráfico (activo, timeframe y rango) | M | Dada una sesión en `Gráfico` con GBPUSD 15 m, cuando se navega a `Biblioteca` y se vuelve por el enlace «Gráfico», entonces el gráfico muestra GBPUSD 15 m y no el activo por defecto | `cycle_05.md` §2 nota |
| RF-402 | RF | El aviso «La cobertura disponible es menor al rango solicitado» aparece **solo** cuando la serie servida no cubre realmente el rango pedido | M | Dado un rango pedido cuyos bordes caen fuera de la cobertura por el redondeo al bucket del TF, cuando se carga la serie, entonces no hay aviso; cuando faltan velas dentro del rango, entonces sí aparece | `cycle_05.md` §2 |
| RF-403 | RF | Cambiar el **timeframe** del activo desde `Gráfico`, sin salir de la pantalla | M | Dado GBPUSD en 1 h, cuando se elige 15 m en el selector del gráfico, entonces la serie se recarga en 15 m manteniendo el activo y el rango | `cycle_05.md` §2.c.1 |
| RF-404 | RF | Los dibujos pertenecen al **activo** y se muestran en **todos** sus timeframes, anclados a sus precios y tiempos | M | Dado un Fibonacci dibujado en GBPUSD 1 h, cuando se cambia a 15 m, entonces la figura sigue visible y en las mismas coordenadas; al volver a 1 h no se duplica | `cycle_05.md` §2.c.2 |
| RF-405 | RF | Los indicadores son del **activo** y se recalculan con las velas del timeframe visible | M | Dados MA/RSI/ATR visibles en 1 h con sus parámetros, cuando se cambia a 15 m, entonces se recalculan sobre las velas de 15 m conservando tipo, parámetros y visibilidad | `cycle_05.md` §2.c.3 |
| RF-406 | RF | Selector de timeframe en la parte superior del gráfico, junto al botón de indicadores, con los seis TF del contrato | M | Dada la pantalla `Gráfico`, cuando se abre, entonces `1m, 5m, 15m, 1h, 4h, 1d` son seleccionables arriba junto a Indicadores y el TF activo está marcado | `cycle_05.md` §2.c.4 |
| RF-407 | RF | Eje X con el **formato original** `{día} {HH:mm}` en una fila — **modificado en D-19** (se descarta el eje de dos filas: rompía la manipulación del eje y la precisión/edición de los dibujos) | S | Dado el eje temporal a cualquier zoom, cuando se renderiza, entonces muestra `{día} {HH:mm}` y el eje nativo conserva el arrastre/zoom | `cycle_05.md` §2.c.5 · D-19 (verificación manual) |
| RF-408 | RF | Clic derecho sobre una vela muestra su información: fecha, hora y OHLC | S | Dada una vela, cuando se hace clic derecho sobre ella, entonces aparece un panel con fecha, hora, apertura, máximo, mínimo y cierre del activo, y se cierra con clic fuera o `Escape` | `cycle_05.md` §2.c.6 |
| RF-409 | RF | Se **retira** la pantalla `Multigráfico`: ruta, pantalla y navegación | S | Dada la navegación de la app, cuando se abre, entonces no existe la entrada «Multigráfico» ni la ruta `/multichart`, y la herramienta Operación sigue disponible en `Gráfico` | `cycle_05.md` §2.d · [modifica RF-310 del ciclo 04] |
| RF-410 | RF | Entrada **numérica** de Entrada y SL de una operación por teclado, con la precisión del activo | S | Dada una operación seleccionada, cuando se edita su Entrada o SL por teclado, entonces el precio se aplica con 5 decimales, se recalcula la figura y la acción es reversible con undo/redo | `cycle_05.md` §1 · TECH-303 |
| RF-411 | RF | **Evaluación** de la pantalla `Exportar` (SCR-006) con decisión documentada: mantenerla o retirarla | C | Dada SCR-006, cuando se evalúa con el criterio acordado, entonces el cierre del ciclo registra la decisión, su evidencia y, si procede, el requisito que se modifica | `cycle_05.md` §2.e |

## Requisitos no funcionales

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RNF-401 | RNF | **No perder** ningún dibujo ya persistido al migrar el documento a v2 | M | Dado un documento v1 con `line`, `rect`, `fib`, `marker` y `operation`, cuando se abre la app con la versión nueva, entonces todos los dibujos siguen presentes y la migración no borra las claves v1 | RNF-304 (04) · ADR-023 |
| RNF-402 | RNF | El ciclo **no introduce regresiones** en las suites existentes | M | Dado el cierre del ciclo, cuando se ejecutan las suites, entonces frontend (458 pruebas) y backend (546 pruebas) quedan en verde | RNF-303 (04) · RNF-203 (03) |
| RNF-403 | RNF | Mantener **60 FPS** con la figura activa durante pan/zoom, arrastre y cambio de TF | M | Dada una operación activa, cuando se hace pan/zoom, se arrastra un handle o se cambia de TF, entonces no hay frames caídos por debajo del presupuesto | RNF-302 (04) · RNF-001 (01) |
| RNF-404 | RNF | El **cambio de TF se mide**: el tiempo de recarga de la serie al cambiar de timeframe se registra en el cierre | S | Dado un cambio de TF en caliente, cuando se mide, entonces el valor queda en el AUDIT LOG del cierre y no supera el de la carga inicial del mismo TF | decisión D-5 |
| RNF-405 | RNF | La línea de eje `drawLine` cumple contraste **≥4.5:1** sobre el fondo del gráfico `#0A0C10` | S | Dado el token `drawLine`, cuando se mide su contraste, entonces es ≥4.5:1 y el test de anti-drift sigue pasando | TECH-302 · RNF-204 (03) · RNF-305 (04) |

## Requisitos de información

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RI-401 | RI | El documento de configuración pasa a **v2 por activo**: dibujos compartidos del activo e indicadores del activo; migración **aditiva al leer** desde v1 | M | Dada una clave `fxtrad.chart.v1.{activo}.{TF}`, cuando se abre el activo, entonces sus dibujos se consolidan en el documento v2 del activo y las claves v1 se conservan íntegras | [modifica RI-201 del ciclo 03] · ADR-018/023 |
| RI-402 | RI | La última **selección** de gráfico (activo, timeframe y rango) es estado persistido y recuperable al volver a la pantalla | M | Dada una selección usada, cuando se abandona y se retorna a `Gráfico`, entonces se recupera la última selección | RF-401 · RI-201 (03) |

## Requisitos de integración

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RX-401 | RX | El ciclo se implementa **sin dependencias nuevas** | M | Dado el build, cuando se instalan dependencias, entonces `package.json`, `package-lock.json` y `backend/` no cambian | RX-301 (04) · RNF-006 |

## No incluidos (Won't — para trazabilidad)

| ID | Tipo | Descripción | Prioridad |
|----|------|-------------|-----------|
| RF-W-401 | RF | Series de operaciones y métricas de estrategia (win rate, R total, curva de resultados) | W |
| RF-W-402 | RF | Motor de backtesting automático y ejecución de estrategias (`RF-W-306` del ciclo 03) | W |
| RF-W-403 | RF | Timeframe `30 m` (nunca estuvo en el contrato ni en la base 1 m; ver D-6) | W |
| RF-W-404 | RF | Mejora o sustituta del Multigráfico (se retira, no se arregla) | W |
| RF-W-405 | RF | Persistencia de dibujos/configuración en backend o sincronización entre dispositivos (`RF-W-201` del ciclo 03) | W |
| RF-W-406 | RF | Deuda de la auditoría `CR-002`: refactores de tamaño, contrato de logging y motivos de waiver (D-8) | W |
| RF-W-407 | RF | Soporte táctil de las herramientas de dibujo (`RF-W-307` del ciclo 03) | W |
| RF-W-408 | RF | Resultado de la operación persistido como dato (`RF-W-302` del ciclo 04) | W |

## Modificaciones a requisitos previos

| Requisito previo | Modificado por | Nota |
|------------------|----------------|------|
| `RF-310` (04): la herramienta Operación está disponible en Gráfico **y** en Multigráfico | RF-409 | Multigráfico se retira; la herramienta queda disponible **solo** en Gráfico |
| `RI-201` (03): configuración persistida con clave activo+timeframe (activo, timeframe, indicadores, dibujos) | RI-401 | El documento pasa a v2 **por activo**: dibujos compartidos e indicadores del activo; migración aditiva desde v1 |
| `RNF-304` (04): no perder ningún dibujo al añadir un tipo nuevo | RNF-401 | La garantía se extiende a la migración de esquema v1→v2 |
| `RNF-204` (03) / `RNF-305` (04): contraste de tokens del design system | RNF-405 | El contraste se exige también a `drawLine`, la línea de eje (cierra TECH-302) |
| `ADR-023` (04): ampliación **aditiva** del documento en v1 | RI-401 | El cambio de alcance de los dibujos (por activo) sí exige v2 y migración: se decide en `/sdd-stack` (ADR nuevo) |
