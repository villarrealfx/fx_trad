# Requisitos — Ciclo 03 (Mejoras UX)

> Prioridad MoSCoW: **M**ust / **S**hould / **C**ould / **W**on't
> Tipos: **RF** (Funcional), **RNF** (No funcional), **RI** (Información), **RX** (Integración)
> Numeración: los IDs `2xx` son propios de este ciclo; los `0xx`/`1xx` heredan de
> `_docs/iterations/01-mvp/requirements.md` y `_docs/iterations/02-optimizacion-descarga/requirements.md`.
> Las modificaciones a requisitos previos se marcan explícitamente.

## Requisitos funcionales

### Pantalla Gráfico

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RF-201 | RF | No cargar indicadores técnicos por defecto; se agregan a petición del usuario | M | Dado un gráfico recién abierto, cuando carga, entonces no muestra ningún indicador y ofrece agregarlos | spec-insumo §3.1 |
| RF-202 | RF | Eliminar el panel inferior de indicadores y ampliar el área del gráfico (pantalla completa horizontal y vertical) | M | Dado el gráfico, cuando se abre, entonces no existe panel inferior y el área usa todo el alto disponible | spec-insumo §3.1 |
| RF-203 | RF | Botón de indicadores en el header que abre un formulario flotante con la lista de indicadores agregados (mostrar/ocultar, configurar, eliminar) y botón de cierre que libera el espacio | M | Dado un gráfico, cuando se pulsa el botón de indicadores, entonces aparece el formulario; al cerrarlo el espacio se libera y los indicadores persisten | spec-insumo §3.1 |
| RF-204 | RF | Mantener la última configuración del gráfico (activo, dibujos, indicadores) al cambiar de hoja y volver, persistida en el navegador | M | Dado un gráfico configurado, cuando se cambia a otra hoja y se vuelve, entonces activo, dibujos e indicadores se conservan | spec-insumo §3.1 · [modifica RI-003 del ciclo 01] |
| RF-205 | RF | Ubicar el botón de exportar en el header del gráfico, junto al de indicadores | M | Dado el gráfico, cuando se inspecciona el header, entonces el botón de exportar está junto al de indicadores | spec-insumo §3.1 |
| RF-206 | RF | El eje X debe mostrar fecha y hora:minuto (según la apertura de la vela) | M | Dado un gráfico de 1 m, cuando se inspecciona el eje X, entonces cada vela muestra fecha y hora:minuto | spec-insumo §3.1 |
| RF-207 | RF | El eje Y debe mostrar precisión de 5 decimales | M | Dado un gráfico, cuando se inspecciona el eje Y, entonces los precios se muestran con 5 decimales | spec-insumo §3.1 |
| RF-208 | RF | Las marcas de compra/venta deben ubicar el triángulo 10 pips por debajo del mínimo (compra) o por encima del máximo (venta), sin solapar la vela de referencia | M | Dado un marcador sobre una vela, cuando se dibuja, entonces el triángulo queda fuera del rango de la vela según la operación | spec-insumo §3.1 |
| RF-209 | RF | Colorear los dibujos con colores mate: línea `#4A6572`, rectángulo `#D6C7AE`, Fibonacci `#DDB2AC` | S | Dado un dibujo de cada tipo, cuando se crea, entonces usa el color definido | spec-insumo §3.1 |
| RF-210 | RF | Mantener una línea completamente horizontal o vertical combinando la dirección del segundo clic con la tecla `Shift` | S | Dado el trazado de una línea, cuando se pulsa `Shift` y se fija el segundo punto, entonces la línea queda horizontal o vertical | spec-insumo §3.1 |
| RF-211 | RF | Usar íconos más representativos donde aplique | C | Dada una acción con ícono ambiguo, cuando se revisa la UI, entonces el ícono comunica su función | spec-insumo §3.1 |
| RF-212 | RF | Permitir editar dibujos ya colocados: mover el dibujo y redimensionar/ajustar sus extremos (además de borrar) | M | Dado un dibujo existente, cuando se arrastra o se ajusta un extremo, entonces el dibujo refleja el cambio | spec-insumo §3.1 + sesión |
| RF-213 | RF | Deshacer/rehacer acciones de dibujo | C | Dada una acción de dibujo, cuando se deshace y rehace, entonces el estado se revierte/reaplica | Sesión (condicionado a viabilidad en `/sdd-stack`) |

### Pantalla Descarga

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RF-214 | RF | Centrar horizontalmente el formulario y la tabla del historial | M | Dado la pantalla Descarga, cuando se abre, entonces formulario y tabla están centrados | spec-insumo §3.2 |
| RF-215 | RF | Incluir el activo en la tabla del historial de descargas | M | Dado el historial, cuando se lista, entonces cada fila muestra el activo | spec-insumo §3.2 |
| RF-216 | RF | Ampliar la lista forex con GBPJPY, EURJPY, AUDUSD, USDCAD y EURGBP | M | Dado el selector de activos, cuando se abre, entonces incluye los 5 pares nuevos | spec-insumo §3.2 |
| RF-217 | RF | Realizar los ajustes de backend necesarios para que todos los activos indicados puedan procesarse end-to-end | M | Dado un par nuevo, cuando se descarga, entonces se persiste y se consulta sin errores | spec-insumo §3.2 |

### Pantalla Abrir

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RF-218 | RF | Centrar horizontalmente el formulario | M | Dado la pantalla Abrir, cuando se abre, entonces el formulario está centrado | spec-insumo §3.3 |
| RF-219 | RF | Eliminar toda referencia al timeframe de 1 s y sustituirla por 1 m donde aplique | M | Dado la pantalla Abrir y sus contratos, cuando se inspecciona, entonces no queda ninguna referencia a `1s` | spec-insumo §3.3 · [modifica deuda del ciclo 02] |

### Integración / plataforma

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RF-220 | RF | Exponer `GET /assets` como fuente única del catálogo y consumirlo desde el frontend, eliminando el espejo `frontend/src/catalog/index.ts` | M | Dado el frontend, cuando lista activos, entonces los obtiene de `GET /assets` y no existe catálogo duplicado | Sesión |

## Requisitos no funcionales

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RNF-201 | RNF | La configuración del gráfico persistida en el navegador debe ser robusta y versionada (sobrevive recarga/cierre) | M | Dado un gráfico configurado, cuando se recarga la app, entonces la configuración se restaura | Sesión |
| RNF-202 | RNF | La edición de dibujos (mover/redimensionar) debe mantener 60 FPS | M | Dado un dibujo en arrastre, cuando se mueve, entonces la interacción se mantiene fluida (60 FPS) | Sesión · RNF-001 (01-mvp) |
| RNF-203 | RNF | El ciclo no debe introducir regresiones en las suites existentes | M | Dado el cierre del ciclo, cuando se ejecutan las suites, entonces backend y frontend quedan en verde | Sesión |
| RNF-204 | RNF | La paleta mate y la precisión deben unificarse mediante tokens de diseño | S | Dado un cambio de color/precisión, cuando se edita el token, entonces se aplica de forma consistente | Sesión |
| RNF-205 | RNF | Los activos nuevos deben procesarse con la misma latencia y contrato que los actuales | M | Dado un par nuevo, cuando se descarga y consulta, entonces respeta los límites y el contrato vigentes | Sesión |
| RNF-001 | RNF | Latencia de interfaz objetivo 60 FPS | M | Heredado 01-mvp | 01-mvp |
| RNF-004 | RNF | Uso exclusivo de UTC en timestamps | M | Heredado 01-mvp | 01-mvp |
| RNF-005 | RNF | Funciona en navegadores de escritorio modernos | M | Heredado 01-mvp | 01-mvp |
| RNF-006 | RNF | Costo total $0 (solo OSS) | M | Heredado 01-mvp | 01-mvp |
| RNF-007 | RNF | Iteración entregable en 2 semanas (plazo negociable) | M | Heredado 01-mvp | 01-mvp |
| ACC-201 | RNF | Accesibilidad validada con axe-core | M | Heredado ADR-011 | ADR-011 |

## Requisitos de información

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RI-201 | RI | Modelar y persistir la **Configuración de gráfico** (activo, timeframe, indicadores, dibujos) en el almacenamiento del navegador, con clave activo+timeframe y esquema versionado | M | Dada una configuración guardada, cuando se restaura, entonces se recupera íntegra y con su versión de esquema | Sesión · [modifica RI-003 del ciclo 01] |
| RI-202 | RI | El catálogo de activos debe exponerse como dato consultable vía `GET /assets` (fuente única backend) | M | Dado un consumidor, cuando consulta `GET /assets`, entonces recibe el catálogo canónico | Sesión |
| RI-001 | RI | Almacenar OHLC con `time` único en segundos UTC | M | Heredado 01-mvp | 01-mvp |
| RI-002 | RI | Almacenar metadatos de descarga (activo, rango, estado, filas) | M | Heredado 01-mvp | 01-mvp |

## Requisitos de integración

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RX-201 | RX | Dukascopy debe servir los 5 pares nuevos (1 m BID) con su mapeo de `instrument_id` en `freeserv.py` | M | Dado cada par nuevo, cuando se descarga, entonces la API responde OHLC 1 m BID | Sesión |
| RX-202 | RX | El frontend debe consumir `GET /assets` en lugar del catálogo duplicado | M | Dado el arranque de la UI, cuando se listan activos, entonces se usa el endpoint | Sesión |
| RX-001 | RX | Integración con Dukascopy (reintentos, backoff) | M | Heredado 01-mvp | 01-mvp |

## No incluidos (Won't — para trazabilidad)

| ID | Tipo | Descripción | Prioridad |
|----|------|-------------|-----------|
| RF-W-201 | RF | Persistir dibujos/configuración en backend o sincronizar entre dispositivos | W |
| RF-W-202 | RF | Nuevos tipos de indicadores (MACD, Bollinger, etc.) | W |
| RF-W-203 | RF | Guardar/exportar estrategias o dibujos como archivos | W |
| RF-W-204 | RF | Multiusuario, autenticación y roles | W |
| RF-W-205 | RF | Tiempo real, backtesting y trading en vivo | W |
| RF-W-206 | RF | Fuentes de datos distintas de Dukascopy | W |
