# Plan del Proyecto: Dibujo Referencia de Operación (Ciclo 04)

**Iteración:** 04 — `dibujo-referencia-operacion`
**Estado:** Ejecutado — ciclo cerrado el 2 de octubre de 2026 (20/20 tareas ✅ · 56/56 pts)
**Fecha:** 1 de octubre de 2026
**Precede:** `_docs/iterations/03-mejoras-ux/`
**Insumo:** `mark_buy _sell.md` (raíz del repo)

## 1. Contexto y justificación

### 1.1 Reencuadre del propósito

Los ciclos 01–03 construyeron la plataforma de punta a punta: catálogo y descarga (01–02)
y experiencia de análisis en el gráfico (03). A lo largo de esos ciclos el **backtesting quedó
declarado fuera de alcance** (`RF-W-205`: "Tiempo real, backtesting y trading en vivo").

La sesión de este ciclo aclaró el propósito real del proyecto: **el backtesting manual de
estrategias**. El usuario analiza una estrategia sobre el precio histórico y necesita
*anotar operaciones* —Entrada, Stop Loss y objetivos— para medir su relación riesgo/beneficio
y leer su desenlace. Esa anotación hoy no existe como herramienta: solo hay marcadores de
compra/venta de triángulo fijo (RF-208 del ciclo 03) que no expresan niveles.

Este ciclo **invierte la lectura de alcance**: el backtesting **manual** entra como
propósito; el **automatizado** (motor de ejecución, métricas de estrategia) sigue fuera.

### 1.2 Problema confirmado en sesión

Cuatro fricciones, en orden de peso:

1. **Se calcula a mano.** El retroceso de Fibonacci actual no significa nada operable:
   el usuario debe calcular dónde va el SL, dónde entra y qué precio corresponde a
   1.382R, 1.5R y 2R en cada activo (y el pip cambia según sea JPY o no).
2. **No se lee el desenlace.** Sin niveles marcados no hay forma de responder "¿tocó el SL?"
   o "¿alcanzó el TP?" sin reconstruirlo mentalmente sobre el gráfico.
3. **No hay series.** Probar una estrategia exige varias operaciones; hoy cada dibujo
   está suelto y sin relación (queda **fuera de alcance**, se registra como deuda).
4. **Se pierde el trabajo.** Resuelto en el ciclo 03 (RF-204): la configuración del gráfico
   se persiste por activo+timeframe.

**Por qué ahora:** el proyecto ya no tiene cuellos de botella de datos ni de navegación.
La única capacidad que falta para cumplir su propósito es anotar la operación.

### 1.3 Geometría decidida en sesión

Con `R = |Entrada − SL|`, dirección automática (`Entrada > SL` → Compra/Long;
`Entrada < SL` → Venta/Short):

| Nivel visible | Precio (Long) | Precio (Short) | Etiqueta |
|---------------|---------------|----------------|----------|
| SL | `Entrada − R` | `Entrada + R` | `SL` |
| Entrada | `Entrada` | `Entrada` | `Entrada` |
| TP 1.382 | `Entrada + 1.382·R` | `Entrada − 1.382·R` | `TP 1.382` |
| TP 1.5 | `Entrada + 1.5·R` | `Entrada − 1.5·R` | `TP 1.5` |
| TP 2 | `Entrada + 2·R` | `Entrada − 2·R` | `TP 2` |

La "referencia 1:1" del insumo queda como **nivel de cálculo no visible**. Ejemplo
verificado en sesión: EURUSD, Entrada `1.10000`, SL `1.09500` → R = 50 pips → SL `1.09500`,
Entrada `1.10000`, TP 1.382 `1.10691`, TP 1.5 `1.10750`, TP 2 `1.11000`.

## 2. Objetivos

### Objetivo general

Dotar al gráfico de una herramienta de dibujo que represente una **operación de trading**
(Entrada, SL y 3 objetivos) con precios calculados y etiquetados, reutilizando la capa de
dibujos existente del ciclo 03.

### Objetivos específicos (SMART)

- **OE-1:** Implementar el 100% de los puntos del insumo, incluidos los 10 casos de validación.
- **OE-2:** Reutilizar la capa de dibujo de ADR-017 (modelo, hit-testing, handles, command
  stack) sin reescribir el overlay ni duplicar geometría.
- **OE-3:** No alterar el comportamiento de las herramientas de dibujo existentes.
- **OE-4:** No perder ningún dibujo ya persistido en el navegador de quien use la herramienta.
- **OE-5:** Mantener 60 FPS con la figura activa durante pan/zoom y arrastre.

### KPIs

| KPI | Métrica | Meta | Frecuencia |
|-----|---------|------|------------|
| KPI-301 | Casos de validación del insumo superados | 10/10 | Al cierre |
| KPI-302 | Regresiones en suites existentes | 0 (frontend en verde) | Por commit |
| KPI-303 | FPS con pan/zoom y arrastre de la figura | ≥60 FPS, 0 frames caídos | Al cierre |
| KPI-304 | Validaciones visuales del usuario | 5/5 | Al cierre |
| KPI-305 | Dibujos previos perdidos tras la ampliación | 0 | Al cierre |

## 3. Alcance

### 3.1 Dentro del alcance (IN)

1. Herramienta de dibujo **Operación** nueva en la paleta de `ChartPane`, disponible en
   Gráfico y en Multigráfico (mismo componente, sin trabajo adicional).
2. Definición por **dos anclas: Entrada y SL** (primer clic = Entrada, segundo = SL).
3. **Dirección automática:** `Entrada > SL` → Compra · `Entrada < SL` → Venta. Sin selección
   manual de dirección.
4. Cinco **niveles visibles** con la geometría de §1.3: SL, Entrada, TP 1.382, TP 1.5, TP 2.
5. Los TP se generan **por encima de la Entrada en Long** y **por debajo en Short**, y se
   recalculan al modificar cualquier ancla manteniendo la proporción sobre `R`.
6. **Un solo dibujo:** selección, edición (mover/redimensionar sus dos handles),
   desplazamiento, eliminación y creación se comportan como una unidad.
7. Heredar del ciclo 03: `Shift` para restringir H/V, hit-testing, handles con target ≥24 px,
   undo/redo por command stack y atajos.
8. **Etiquetas** por nivel con nombre y precio real a 5 decimales, situadas a la derecha
   del segundo ancla.
9. **Layout de etiquetas** con separación vertical mínima y línea guía cuando una etiqueta
   se desplaza para no solaparse.
10. **Colores por token:** SL `drawOpSl` `#EF5350`, Entrada `drawOpEntry` `#E6EDF3`,
    TP `drawOpTp` `#26A69A` (los tres TP comparten verde y se distinguen por etiqueta).
    Tres tokens nuevos en `tokens.ts` + `tokens.css`, cubiertos por el test de anti-drift.
11. **Persistencia** en el documento de dibujos (`localStorage`, clave activo+timeframe)
    **sin campos nuevos**: SL, dirección, R y niveles son derivados de las dos anclas.
12. **Desenlace legible:** el usuario determina si la operación se cumplió o se invalidó
    leyendo el precio contra las líneas marcadas. No es una función calculada ni persistida.

### 3.2 Fuera del alcance (OUT)

- Series de operaciones y métricas de estrategia (win rate, R total, curva de resultados).
- Resultado de la operación persistido (ganada/perdida/alcanzada) como dato.
- Tamaño de posición, % de riesgo y R en dinero o pips en la etiqueta.
- Niveles de TP configurables por el usuario (1.382 / 1.5 / 2 son fijos en este ciclo).
- Alertas o avisos al cruzar un nivel.
- Motor de backtesting automático y ejecución de estrategias.
- Soporte táctil (la herramienta es de escritorio con ratón, como las demás).
- Persistencia en backend o sincronización entre dispositivos.
- Otros tipos de dibujo o retrofit de los existentes.

## 4. Stakeholders

| Rol | Interés | Influencia | Expectativa |
|-----|---------|------------|-------------|
| Usuario único (trader/analista) | Anotar operaciones para medir R:R y leer el desenlace | Alta | Cálculo automático, precios correctos, etiquetas legibles |
| Mantenedor del código | Cambio acotado sobre la capa existente, sin regresiones | Alta | Reutilizar ADR-017, no duplicar geometría, suites en verde |

## 5. Restricciones

| Tipo | Descripción | Origen |
|------|-------------|--------|
| Arquitectura | El overlay de dibujos es custom sobre `lightweight-charts`; no hay librería de dibujo con edición nativa | ADR-005 · ADR-017 |
| Reutilización | Toda funcionalidad existente del dibujo Fibonacci debe reutilizarse en lugar de reimplementarse | Insumo §Integración.7 |
| Compatibilidad | La incorporación no debe modificar ni romper las herramientas existentes | Insumo §Integración.8 |
| Contrato | El documento de dibujos está versionado; hoy una versión desconocida se descarta | ADR-018 · `drawings.ts:96` |
| Almacenamiento | Persistencia sujeta a cuota de `localStorage` | Plataforma |
| Design | El test de anti-drift exige actualizar `tokens.ts` y `tokens.css` juntos | `DRY-044` · RNF-204 |
| Costo | $0 (solo OSS) | RNF-006 (01-mvp) |
| Plazo | 2 semanas (negociable) | RNF-007 (01-mvp) |

## 6. Supuestos

- **S-1:** El uso es de escritorio con ratón; el modelo de interacción heredado del ciclo 03
  (2 clics, handles arrastrables, `Shift`) es válido.
- **S-2:** La capa de ADR-017 admite una figura multi-línea sin reescribir el overlay.
- **S-3:** Los valores `#EF5350`, `#E6EDF3` y `#26A69A` tienen contraste suficiente sobre el
  fondo del gráfico `#0A0C10` (se mide en `/sdd-stack`).
- **S-4:** El esquema del documento de dibujos admite el `kind` nuevo sin descartar los
  dibujos ya persistidos (la estrategia de versión se decide en `/sdd-stack`).
- **S-5:** Los tres TP comparten color y se distinguen por etiqueta.
- **S-6:** Los niveles 1.382, 1.5 y 2 son fijos en este ciclo.

## 7. Riesgos

| ID | Descripción | Prob. | Impacto | Exposición | Mitigación |
|----|-------------|-------|---------|------------|------------|
| R-301 | Ampliar el esquema del documento de dibujos hace que se descarten los dibujos ya persistidos | M | A | M×A | Estrategia de versión en `/sdd-stack` + test de migración que preserva las formas existentes |
| R-302 | A zoom amplio (~1,2 px/pip) las etiquetas de TP se solapan y dejan de leerse | M | M | M×M | Layout con separación mínima + línea guía (RNF-301) |
| R-303 | El hit-test de una figura de 5 líneas con radio pequeño hace que al seleccionar una TP se mueva la figura completa | M | M | M×M | Radio por línea coherente con `fib` + test de selección de la figura |
| R-304 | Token nuevo añadido solo en `tokens.ts` → el test de anti-drift falla en CI | B | B | B×B | El propio test de anti-drift lo detecta; ambos ficheros en la misma tarea |
| R-305 | Reutilizar la geometría de `fib` arrastra el color mate y las etiquetas de ratio, que aquí no proceden | M | M | M×M | `kind` nuevo con su propia proyección; `fib` intacto |

## 8. Matriz de navegación por rol

| Rol | Documentos que debe leer | Frecuencia |
|-----|--------------------------|------------|
| Usuario (sponsor) | plan.md | Al inicio y cierre de iteración |
| Arquitecto | plan.md, requirements.md, ADR nuevos | Continuo |
| Dev | requirements.md, backlog.md, ADR nuevos | Diario |
| QA | requirements.md, traceability.md | Continuo |
