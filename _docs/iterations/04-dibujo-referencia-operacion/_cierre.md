# Cierre de Ciclo: 04 — Dibujo Referencia de Operación

> Snapshot de cierre del ciclo 04 del pipeline SDD.
> Inicio: 2026-10-01 (`0422923`) · Cierre: 2026-10-02
> Estado final: **20/20 tareas ✅ (100%)** · 56/56 pts · 19/19 requisitos propios 🟢 · 0 bloqueos
> Insumo: `mark_buy _sell.md` · Contexto heredado: `iterations/03-mejoras-ux/`

## Resumen del ciclo

Los ciclos 01–03 construyeron la plataforma de punta a punta: catálogo y descarga (01–02)
y experiencia de análisis en el gráfico (03). El **backtesting** llevaba ciclos declarado
fuera de alcance (`RF-W-205`), pero la sesión de este ciclo aclaró el propósito real del
proyecto: **backtesting manual de estrategias**. El usuario analiza una estrategia sobre el
precio histórico y necesita *anotar operaciones* —Entrada, Stop Loss y objetivos— para medir
su relación riesgo/beneficio y leer el desenlace. Hoy solo existen marcadores de compra/venta
de triángulo fijo (RF-208, ciclo 03), que no expresan niveles.

Este ciclo **invierte la lectura de alcance**: el backtesting **manual** entra como propósito;
el **automatizado** (motor de ejecución, métricas de estrategia) sigue fuera. La fricción
principal era que el retroceso de Fibonacci existente no significa nada operable: había que
calcular a mano dónde va el SL, dónde entra y qué precio corresponde a 1.382R, 1.5R y 2R en
cada activo, con un pip que cambia según sea JPY o no.

Un solo desarrollador, una sesión de trabajo, 56 puntos estimados, stack 100 % OSS ($0).

| Dimensión | Valor al cierre |
|-----------|-----------------|
| Tareas | 20 (56 puntos) |
| 📥 / 🔨 / 👀 / 🔴 | 0 / 0 / 0 / 0 |
| ✅ Done | 20 (100%) |
| Requisitos IN | 19/19 🟢 (12 RF · 5 RNF · 1 RI · 1 RX) + 8 heredados sin re-verificar |
| Épicas | 1 dominio (EP-301) · 3 UI (EP-UI-300…302) · 1 técnica (EP-TEC-300) |
| Capas | test 10 · frontend 9 · docs 1 |
| Ruta crítica | 7/7 completada (23/23 pts) |
| ADRs | 4 (ADR-022…025) |
| Tests | backend 546 ✅ + 2 skip · frontend 458 ✅ (55 archivos, verificado al cierre) |
| CI | run #31 `success` — Frontend y Backend (primera vez que el job frontend pasa lint + tests) |
| Commits | 28 |

## Qué se logró

- **Modelo y geometría (EP-301, RF-301…305):** la Operación se define con **dos anclas** —
  la primera es la Entrada y la segunda el Stop Loss — y la **dirección se deduce sola**
  (`Entrada > SL` → Compra, `Entrada < SL` → Venta). `R = |Entrada − SL|` genera **cinco
  niveles** (SL, Entrada, TP 1.382, 1.5 y 2), con los TP siempre **por encima** de la Entrada
  en Long y **por debajo** en Short, recalculados al editar. Los niveles de cálculo 0, 0.5 y
  1.0 **no se dibujan** (RF-304): solo el 1:1 se usa como referencia interna.
- **Herramienta y figura (EP-UI-301, RF-306…309, RNF-301/305):** la operación se comporta como
  **un único dibujo** en creación, selección, edición, desplazamiento y eliminación, con sus
  **dos handles** heredando mover, ajustar, `Shift` y borrado. Las cinco etiquetas se dibujan
  **siempre**, ordenadas por precio, con separación mínima y guía al handle, mostrando el
  **precio real a 5 decimales**. Colores por token de rol (`drawOpSl`, `drawOpEntry`,
  `drawOpTp`), sin literales en el componente y con contraste verificado sobre los dos fondos
  reales del gráfico.
- **Persistencia y Multigráfico (EP-UI-302, RI-301, RNF-304):** la Operación entra en el
  documento como un dibujo más, con **ampliación aditiva del esquema** —sin migración ni
  pérdida de los dibujos ya guardados en el navegador— y aparece en el selector de capas de
  Multigráfico (SCR-005) junto a Fibonacci,Horizontal/Vertical, Rectángulo y marcadores.
- **Verificación transversal (EP-TEC-300, RNF-302/303, RX-301):** frame budget con la figura
  **activa** (no solo en reposo), auditoría axe-core con la operación visible, suite completa
  en verde y confirmación de **cero dependencias nuevas** y backend intacto.

## Resultados de rendimiento y calidad

| Medición | Resultado |
|----------|-----------|
| RNF-302 · 60 FPS con la figura activa | **60 FPS**, p95 dentro de 16.67 ms, 0 frames caídos |
| RNF-303 · 0 regresiones | backend 546 + 2 skip · frontend 458 · ruff/black/mypy(src)/eslint/tsc/prettier OK |
| RNF-304 · Sin pérdida de dibujos previos | Round-trip de esquema aditivo verificado en `drawings.test.ts` |
| RNF-305 · Contraste de los 3 tokens | ≥4.5:1 sobre `#0A0C10` y `#161B22` (test en `tokens.test.ts`) |
| ACC · Accesibilidad | axe-core sin violaciones con la operación visible; `aria-pressed`, `aria-label` y anuncio en `LiveRegion` verificados |
| CI | run #31 en `success` (Frontend + Backend) |
| Suite frontend (verificación de cierre) | 55 archivos · **458 tests** en verde, en Node 20 y Node 24 |

## Decisiones registradas

- **ADR-022** Tipo de dibujo `operation` (un único dibujo con dos anclas, sin direction).
- **ADR-023** Ampliación aditiva del esquema v1 (sin migración de los documentos guardados).
- **ADR-024** Tokens de color de la operación (reutilizan `color-down`/`color-up`/`color-text`).
- **ADR-025** Layout de etiquetas (orden por precio, separación mínima y guía al handle).
- Decisiones de planificación: DP-1…DP-7 (`backlog.md` §10), incluida **DP-7**: el saneado de
  `format:check` se priorizó como **Must** pese a ser mecánica (1 punto) porque un gate rojo
  entrena al equipo a ignorar el pipeline.

## Verificación de RNF-007 (plazo de la iteración)

La iteración 04 se completó en **2 días** (2026-10-01 → 2026-10-02), por debajo del plazo de
2 semanas. Las 20 tareas y los 19 requisitos quedaron cerrados dentro del plazo. **RNF-007
cumplido.**

## Deuda asumida / fuera de alcance

- **Backtesting automatizado** (motor de ejecución, métricas de estrategia) sigue fuera de
  alcance: entra solo la anotación manual.
- **No hay series de operaciones.** Probar una estrategia exige varias operaciones y hoy cada
  dibujo va suelto, sin relación entre sí. Es la brecha más relevante que deja el ciclo.
- **Contrastepor token de rol pendiente de corregir:** `drawLine` (`#4A6572`) está en **3.16:1**,
  por debajo de 4.5:1. Es deuda preexistente del ciclo 03, no textual (se distingue por forma)
  y ajena a la figura nueva → `TECH-302`.
- **Entrada numérica de Entrada/SL** para dar ruta por teclado y precio exacto al pip. No hay
  RF que lo pida; a zoom de 2 años el pip no es legible → `TECH-303`.
- Requisitos **heredados** (RNF-001/201/202/204, RI-001/003/201, RX-001) se mantienen sin
  re-verificar en este ciclo: su evidencia histórica vive en `iterations/01-mvp/`,
  `iterations/02-optimizacion-descarga/` y `iterations/03-mejoras-ux/`.

## Qué se aprendió

- **Un gate rojo puede estar enmascarando fallos de la capa siguiente.** El lint fallaba desde
  el ciclo 03 y **cortaba el job antes de ejecutar vitest**, así que un segundo fallo llevaba
  tiempo oculto: `minMove` (`10 ** -n`) redondea distinto según la versión de V8, de modo que
  el mismo código producía `0.000009999999999999999` en Node 20 y `0.00001` en Node 24. El
  test de RF-206/207 solo pasaba en la máquina de desarrollo. Arreglar el lint no era
  "dejar CI verde": era **destapar** la señal. Merece la pena suspectar de todo lo que vive
  por debajo de un gate roto.
- **La corrección va en el código, no en el test.** Se podía haber relajado la aserción para
  tolerar el valor no determinista; se cambió `10 ** -n` por `1 / 10 ** n`. Relajar el test
  habría escondido que el valor dependía del entorno.
- **Verificar contra el runtime de destino, no solo en local.** La suite daba 458/458 en verde
  y aun así fallaba en CI. La divergencia local/CI se selló con `.nvmrc` (20) y
  `engines: >=20`; conviene comprobar la paridad development–CI al elegir versiones.
- **La deriva documental se repite si no se reconcilia al cerrar.** El ciclo 03 lo advirtió:
  "`status.md` actualizado sin propagar a `backlog.md` y `traceability.md` genera
  contradicciones". En el ciclo 04 las 20 tareas cerraron en `status.md` mientras la columna
  `Estado` del backlog siguió en `📥` desde el arranque. Reconciliado al archivar; el
  `backlog.md` del ciclo 05 nace con los `Estado` ya sincronizados.
- **Contar es más difícil que cerrar.** Al auditar el cierre, un `grep` mal escrito suggère
  que faltaba una tarea del ciclo 04 (y que la métrica 20/20 · 56/56 era errónea): en realidad
  `TECH-301` —1 punto— era la vigésima tarea y estaba en las tablas. **La métrica era correcta
  y no se cambió.** Las métricas se verifican contra la tabla, nunca a ojo.

## Próximos pasos sugeridos

1. **Ciclo 05** — el trabajo activo es la **serie de operaciones** (brecha principal que deja
   este ciclo), que sí exige decisiones de alcance: `/sdd-brainstorm` primero.
2. `/sdd-backlog` para recoger `TECH-302` (contraste de `drawLine`) y `TECH-303` (entrada
   numérica de Entrada/SL).
3. Procesar `mark_buy _sell.md` como entrada de backlog si se decide ir más allá de lo ya
   construido (la herramienta de operación ya cubre Entrada/SL/TP; el spec describe además
   creación desde el formulario y otros detalles).