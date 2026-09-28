# Requisitos

> Prioridad MoSCoW: **M**ust / **S**hould / **C**ould / **W**on't
> Tipos: **RF** (Funcional), **RNF** (No funcional), **RI** (Información), **RX** (Integración)

## Requisitos funcionales

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RF-001 | RF | El sistema debe permitir descargar datos históricos de Dukascopy seleccionando activo, fecha de inicio y fecha final | M | Dado que el usuario selecciona un activo (forex/metal/petróleo) y un rango de fechas, cuando inicia la descarga, entonces se obtienen datos del rango solicitado | project.md §2.4.1 |
| RF-002 | RF | La descarga debe realizarse en timeframe base de 1 segundo con timestamps en UTC | M | Dado un rango de fechas válido, cuando se completa la descarga, entonces todos los timestamps están en segundos y en UTC | project.md §2.4.2 |
| RF-003 | RF | Los datos descargados deben pasar por un proceso de limpieza/adecuación y quedar con el formato time/open/high/low/close | M | Dado un dataset crudo, cuando se ejecuta el pipeline de limpieza, entonces cada fila tiene time (segundos), open, high, low, close (números) y es consumible por la librería de visualización | project.md §2.5 |
| RF-004 | RF | El sistema debe excluir fines de semana (activos con cierre semanal) y días feriados para evitar gaps | M | Dado un rango que incluye fines de semana o feriados, cuando se procesan los datos, entonces no existen filas en esos periodos | project.md §2.6 |
| RF-005 | RF | La data procesada debe almacenarse en Parquet (formato) con DuckDB como motor de consulta | M | Dado el proceso de almacenamiento, cuando se completa, entonces los datos son consultables a través de DuckDB y persisten en archivos Parquet | project.md §1 |
| RF-006 | RF | Las descargas incrementales deben completar los datos existentes sin duplicar ni borrar | M | Dado un activo con datos de ene–may 2026, cuando se descarga jun–jul 2026, entonces la base contiene enero a julio sin filas duplicadas | Sesión (usuario) |
| RF-007 | RF | La interfaz debe permitir cargar datos de los activos guardados en la base local | M | Dado un activo almacenado, cuando el usuario lo selecciona desde la interfaz, entonces el gráfico carga sus datos | project.md §2.7 |
| RF-008 | RF | La carga desde la base debe permitir seleccionar un periodo específico (fecha inicio y fin) | M | Dado un activo, cuando el usuario elige desde 01/01/2026 hasta 31/01/2026, entonces solo se visualizan datos dentro de ese rango | Sesión (usuario) |
| RF-009 | RF | La interfaz debe representar datos en timeframes 1m/5m/15m/1h/4h/1d a partir de los datos de 1s | M | Dado un dataset de 1s, cuando el usuario elige 1h, entonces las velas se agregan correctamente a 1 hora | project.md §2.11 |
| RF-010 | RF | El gráfico debe ser de velas japonesas con zoom y pan | M | Dado un gráfico cargado, cuando el usuario hace zoom/pan, entonces la vista se ajusta sin pérdida de datos | project.md §2.10 |
| RF-011 | RF | El gráfico debe soportar herramientas de dibujo: líneas, rectángulos y retrocesos de Fibonacci, con creación y borrado | M | Dado un gráfico, cuando el usuario dibuja/borra una línea, rectángulo o Fibonacci, entonces el trazo se muestra/se elimina correctamente | project.md §2.8 |
| RF-012 | RF | El gráfico debe incluir un simulador de compra y venta manual | M | Dado un gráfico, cuando el usuario marca entradas/salidas de compra y venta, entonces los marcadores se visualizan superpuestos | project.md §2.8 |
| RF-013 | RF | El gráfico debe integrar indicadores técnicos: medias móviles configurables, RSI y ATR | M | Dado un gráfico, cuando el usuario agrega un indicador, entonces se renderiza con sus parámetros configurables | project.md §2.9 |
| RF-014 | RF | El canvas debe permitir desplegar hasta 3 gráficos del mismo activo con diferentes timeframes | M | Dado un activo, cuando el usuario abre 3 gráficos (1d/1h/5m), entonces los tres se muestran sincronizados | project.md §2.12 |
| RF-015 | RF | El sistema debe exportar una captura en imagen (gráfico + dibujos) para verificar la estrategia | M | Dado un gráfico con dibujos, cuando el usuario exporta, entonces se genera una imagen que incluye velas, indicadores y dibujos | Sesión (usuario) |
| RF-016 | RF | La arquitectura debe permitir agregar nuevas características sin fricción (modular/extensible) | M | Dado un cambio incremental, cuando se añade una característica nueva, entonces no requiere reescribir componentes existentes | Sesión (usuario) |

## Requisitos no funcionales

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RNF-001 | RNF | La latencia de la interfaz debe ser similar a las apps de trading existentes | M | Dado un gráfico con 2 años de datos a 1s, cuando el usuario hace pan/zoom continuo, entonces la interacción se mantiene fluida (objetivo 60 FPS) | Sesión (usuario) |
| RNF-002 | RNF | El sistema debe manejar hasta ~18M filas por activo (2 años @ 1s) | M | Dado un activo con volumen máximo estimado, cuando se carga y consulta, entonces la app responde según RNF-001 | project.md §2 |
| RNF-003 | RNF | La ventana de datos históricos debe cubrir 2 años desde la fecha de descarga | M | Dado un activo, cuando se solicita descarga, entonces el sistema permite obtener hasta 2 años de antigüedad | Sesión (usuario) |
| RNF-004 | RNF | Uso exclusivo de UTC en timestamps | M | Dado cualquier timestamp almacenado/consultado, cuando se procesa, entonces está expresado en UTC en segundos | Sesión (usuario) |
| RNF-005 | RNF | La aplicación debe funcionar en navegadores de escritorio modernos | M | Dado un navegador de escritorio moderno, cuando se abre la app, entonces funciona sin plugins ni licencias de pago | project.md §2.2 |
| RNF-006 | RNF | Costo total de la solución: $0 (solo software de código abierto) | M | Dado el inventario del stack, cuando se audita licencias, entonces no existen componentes comerciales | Sesión (usuario) |
| RNF-007 | RNF | MVP entregable en 2 semanas (plazo negociable) | M | Dado el alcance IN, cuando se completa la iteración, entonces el MVP está operativo al cierre de la semana 2 | Sesión (usuario) |
| RNF-008 | RNF | La estructura final de datos debe ser directamente consumible por el framework de visualización (sin hacks) | M | Dado el contrato de datos de la librería de gráficos, cuando se define el esquema, entonces no se requieren transformaciones ad-hoc en el frontend | Sesión (usuario R-005) |

## Requisitos de información

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RI-001 | RI | Almacenar OHLC con time único en segundos UTC | M | Dado un intento de inserción duplicada (mismo time/activo), cuando se procesa, entonces se rechaza o se completa sin duplicar | Análisis |
| RI-002 | RI | Almacenar metadatos de descarga (activo, rango solicitado, estado, fecha de descarga) | M | Dado un proceso de descarga, cuando concluye, entonces queda registro de qué se descargó, con estado y fecha | Análisis (incrementales) |
| RI-003 | RI | Los dibujos/estrategias NO se almacenan en la aplicación | M | Dado un dibujo realizado, cuando se cierra la sesión, entonces no queda registro interno (solo export de imagen) | Sesión (usuario) |

## Requisitos de integración

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RX-001 | RX | Integrar con la API/descarga de datos de Dukascopy | M | Dado un activo, cuando se solicita descarga, entonces los datos se obtienen de Dukascopy y almacenan en local | project.md §1 |
| RX-002 | RX | El backend debe exponer los datos locales a la interfaz (activar, rango, timeframe) | M | Dado el frontend, cuando solicita datos de la base local, entonces recibe los OHLC del activo/rango/timeframe pedido | Análisis |

## No incluidos (Won't — para trazabilidad)

| ID | Tipo | Descripción | Prioridad |
|----|------|-------------|-----------|
| RF-W-01 | RF | Datos en tiempo real | W |
| RF-W-02 | RF | Creador de estrategias (scripting) | W |
| RF-W-03 | RF | Evaluación automática de estrategias / backtesting | W |
| RF-W-04 | RF | Trading en vivo | W |
| RF-W-05 | RF | Autenticación, multiusuario y roles | W |
| RF-W-06 | RF | Otras fuentes de datos ≠ Dukascopy | W |
| RF-W-07 | RF | Activos fuera de forex / metales / petróleo | W |