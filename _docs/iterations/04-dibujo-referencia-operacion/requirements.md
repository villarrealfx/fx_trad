# Requisitos — Ciclo 04 (Dibujo Referencia de Operación)

> Prioridad MoSCoW: **M**ust / **S**hould / **C**ould / **W**on't
> Tipos: **RF** (Funcional), **RNF** (No funcional), **RI** (Información), **RX** (Integración)
> Numeración: los IDs `3xx` son propios de este ciclo; los `0xx`/`1xx`/`2xx` heredan de
> `_docs/iterations/01-mvp/`, `02-optimizacion-descarga/` y `03-mejoras-ux/`.
> Las modificaciones a requisitos previos se marcan explícitamente.

## Requisitos funcionales

### Herramienta de dibujo «Operación»

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RF-301 | RF | Definir la operación mediante dos anclas: la primera es la **Entrada** y la segunda el **Stop Loss** | M | Dada la herramienta activa, cuando se hacen dos clics, entonces la figura queda definida por los precios de Entrada y SL | mark_buy _sell.md §Unidad de dibujo |
| RF-302 | RF | Determinar la **dirección automáticamente**: `Entrada > SL` → Compra (Long); `Entrada < SL` → Venta (Short), sin selección manual | M | Dada una operación, cuando se comparan Entrada y SL, entonces la dirección se deduce sola y los TP quedan al lado correcto | mark_buy _sell.md §Unidad de dibujo |
| RF-303 | RF | Dibujar **cinco niveles visibles**: SL, Entrada, TP 1.382, TP 1.5 y TP 2, con `R = \|Entrada − SL\|` y precios `SL = Entrada ∓ R`, `TP = Entrada ± k·R` (k = 1.382, 1.5, 2) | M | Dada una operación con Entrada 1.10000 y SL 1.09500 (R = 50 pips), cuando se proyecta, entonces los niveles quedan en 1.09500, 1.10000, 1.10691, 1.10750 y 1.11000 | Sesión §Eje 4 · mark_buy _sell.md §Similitud |
| RF-304 | RF | **No mostrar** los niveles de cálculo 0 (SL), 0.5 (Entrada) y 1.0 (referencia 1:1) como líneas independientes del conjunto visible | M | Dada una operación proyectada, cuando se inspecciona el gráfico, entonces solo aparecen las 5 líneas de RF-303 | mark_buy _sell.md §Similitud |
| RF-305 | RF | Generar los TP **por encima de la Entrada** en Long y **por debajo** en Short, recalculándolos al modificar cualquier ancla y manteniendo su proporción sobre `R` | M | Dada una operación, cuando se mueve el SL, entonces la dirección, los niveles y sus precios se recalculan manteniendo la proporción | mark_buy _sell.md §Edición/Comportamiento |
| RF-306 | RF | Comportar la operación como **un único dibujo** en creación, selección, edición, desplazamiento y eliminación | M | Dada una operación, cuando se pulsa sobre cualquiera de sus líneas, entonces se selecciona y se mueve o se borra la figura completa | mark_buy _sell.md §Unidad/Integración |
| RF-307 | RF | Editar la figura mediante sus **dos handles** (Entrada y SL), heredando mover, redimensionar/ajustar, `Shift` H/V, target ≥24 px y undo/redo del ciclo 03 | M | Dada una operación, cuando se arrastra cualquiera de sus dos handles, entonces la figura se actualiza y la acción es reversible | mark_buy _sell.md §Edición · [extiende RF-212/RF-213 del ciclo 03] |
| RF-308 | RF | Etiquetar cada nivel con su nombre y su **precio real a 5 decimales** (`SL`, `Entrada`, `TP 1.382`, `TP 1.5`, `TP 2`), a la derecha del segundo ancla | M | Dada una operación, cuando se inspecciona el gráfico, entonces cada nivel muestra nombre y precio correspondiente al del nivel | mark_buy _sell.md §Representación visual |
| RF-309 | RF | Asignar color **por token de rol**: SL `drawOpSl` `#EF5350`, Entrada `drawOpEntry` `#E6EDF3`, TP `drawOpTp` `#26A69A`, con los tres TP compartiendo color | M | Dada una operación, cuando se inspecciona el gráfico, entonces cada nivel usa el color definido y los tres TP son del mismo verde | mark_buy _sell.md §Representación visual · Sesión §Eje 4 |
| RF-310 | RF | Exponer la herramienta en la paleta de dibujo del gráfico, disponible en Gráfico y en Multigráfico | M | Dado el gráfico, cuando se abre la paleta, entonces la herramienta está disponible junto a las demás; en Multigráfico, en cada panel | mark_buy _sell.md §Validación.9 · Sesión §Eje 4 |
| RF-311 | RF | Persistir la operación en el **documento de dibujos** del navegador (clave activo+timeframe) sin campos nuevos: SL, dirección, `R` y niveles son derivados | M | Dada una operación guardada, cuando se cambia de hoja y se vuelve, cuando se recarga la app y cuando se serializa el documento, entonces la operación se conserva íntegra | mark_buy _sell.md §Validación.10 · [extiende RI-201 del ciclo 03] |
| RF-312 | RF | Permitir **leer el desenlace** de la operación comparando el precio con las líneas marcadas (¿toca el SL? ¿alcanza un TP?), sin calcular ni persistir un resultado | M | Dada una operación, cuando el precio la recorre, entonces el usuario puede determinar si se cumplió o se invalidó leyendo los niveles marcados | Sesión §Eje 1 · mark_buy _sell.md §Validación |

## Requisitos no funcionales

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RNF-301 | RNF | Las 5 etiquetas se dibujan **siempre**, ordenadas por precio, con una separación vertical mínima y línea guía en las que se desplacen | M | Dada una operación cuyos niveles quedan a ~14 px de distancia (zoom de 2 años), cuando se renderiza, entonces las 5 etiquetas son legibles y ninguna se solapa | Sesión §Eje 6 |
| RNF-302 | RNF | Mantener 60 FPS con la figura activa durante pan/zoom y arrastre de handles o desplazamiento | M | Dada una operación, cuando se hace pan/zoom o se arrastra, entonces la interacción se mantiene a 60 FPS sin frames caídos | Sesión · RNF-202 / RNF-001 |
| RNF-303 | RNF | El ciclo no debe introducir regresiones en las suites existentes | M | Dado el cierre del ciclo, cuando se ejecutan las suites, entonces frontend (y backend) quedan en verde | Sesión · RNF-203 (03) |
| RNF-304 | RNF | **No perder** ningún dibujo ya persistido en el navegador al añadir el nuevo tipo | M | Dado un documento de dibujos existente, cuando se abre la app con la nueva versión, entonces todas las formas anteriores siguen presentes | Sesión · KPI-305 |
| RNF-305 | RNF | Los colores de la herramienta deben cumplir contraste suficiente sobre el fondo del gráfico y estar definidos como tokens en `tokens.ts` y `tokens.css` | M | Dados los tres tokens, cuando se mide el contraste sobre `#0A0C10`, entonces es suficiente y el test de anti-drift pasa | Sesión · RNF-204 (03) |
| RNF-202 | RNF | La edición de dibujos debe mantener 60 FPS | M | Heredado 03-mejoras-ux | 03-mejoras-ux |
| RNF-201 | RNF | La configuración persistida en el navegador debe ser robusta y versionada | M | Heredado 03-mejoras-ux | 03-mejoras-ux |
| RNF-204 | RNF | Tokens de diseño como fuente única (con anti-drift) | M | Heredado 03-mejoras-ux | 03-mejoras-ux |
| RNF-001 | RNF | Latencia de interfaz objetivo 60 FPS | M | Heredado 01-mvp | 01-mvp |
| RNF-004 | RNF | Uso exclusivo de UTC en timestamps | M | Heredado 01-mvp | 01-mvp |
| RNF-005 | RNF | Funciona en navegadores de escritorio modernos | M | Heredado 01-mvp | 01-mvp |
| RNF-006 | RNF | Costo total $0 (solo OSS) | M | Heredado 01-mvp | 01-mvp |
| RNF-007 | RNF | Iteración entregable en 2 semanas (plazo negociable) | M | Heredado 01-mvp | 01-mvp |
| ACC-201 | RNF | Accesibilidad validada con axe-core | M | Heredado ADR-011 | ADR-011 |

## Requisitos de información

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RI-301 | RI | Modelar la **Operación** como un único dibujo del documento: `id`, `kind`, ancla Entrada y ancla SL; la dirección, `R`, los cinco niveles y sus etiquetas se derivan | M | Dada una operación serializada, cuando se deserializa, entonces se recuperan las dos anclas y todos los derivados se recalculan idénticos | Sesión §Eje 10 |
| RI-201 | RI | Configuración de gráfico persistida (activo, timeframe, indicadores, dibujos) con clave activo+timeframe y esquema versionado | M | Heredado 03-mejoras-ux | 03-mejoras-ux |
| RI-003 | RI | Los dibujos no se almacenan en el backend | M | **Modificado:** el ciclo 03 los persiste en el navegador (RI-201) | 01-mvp |
| RI-001 | RI | OHLC con `time` único en segundos UTC | M | Heredado 01-mvp | 01-mvp |
| RI-002 | RI | Metadatos de descarga | M | Heredado 01-mvp | 01-mvp |

## Requisitos de integración

| ID | Tipo | Descripción | Prioridad | Criterio de aceptación | Fuente |
|----|------|-------------|-----------|------------------------|--------|
| RX-301 | RX | La herramienta debe integrarse en el sistema de dibujos existente sin nuevas dependencias externas | M | Dado el build, cuando se instalan dependencias, entonces no se añade ningún paquete nuevo | mark_buy _sell.md §Integración · RNF-006 |
| RX-001 | RX | Integración con Dukascopy (reintentos, backoff) | M | Heredado 01-mvp | 01-mvp |

## No incluidos (Won't — para trazabilidad)

| ID | Tipo | Descripción | Prioridad |
|----|------|-------------|-----------|
| RF-W-301 | RF | Series de operaciones y métricas de estrategia (win rate, R total, curva de resultados) | W |
| RF-W-302 | RF | Resultado de la operación persistido (alcanzado / invalidado) como dato | W |
| RF-W-303 | RF | Tamaño de posición, % de riesgo y R en dinero o pips | W |
| RF-W-304 | RF | Niveles de TP configurables por el usuario | W |
| RF-W-305 | RF | Alertas o avisos al cruzar un nivel | W |
| RF-W-306 | RF | Motor de backtesting automático y ejecución de estrategias | W |
| RF-W-307 | RF | Soporte táctil de las herramientas de dibujo | W |
| RF-W-201 | RF | Persistir dibujos/configuración en backend o sincronizar entre dispositivos | W (03) |
| RF-W-205 | RF | Tiempo real y trading en vivo | W (03) · **nota:** el backtesting **manual** pasa a ser propósito del proyecto (plan.md §1.1) |
| RF-W-206 | RF | Fuentes de datos distintas de Dukascopy | W (03) |
