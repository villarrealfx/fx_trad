# ADR-015: Descarga por tandas de 6–12 meses con progreso y reanudación

- **Fecha:** 2026-09-28
- **Estado:** Aceptado
- **Decisores:** Arquitecto, usuario (propietario)
- **Requisitos vinculados:** RF-104, RNF-101, RNF-003

## Contexto

La ventana de datos es de hasta **2 años** (RNF-003), pero una descarga larga es
vulnerable a cortes (timeout de la herramienta, 503 de la API, interrupción del
usuario). En 01-mvp la descarga se interrumpió a los 30 min sin posibilidad de
retomarla, y lo ideal es acotar el riesgo y dar visibilidad.

## Decisión

La unidad de descarga es la **tanda** de **6–12 meses**. Cada tanda:

- Se ejecuta como una tarea Celery (ADR-016) con su propio rango.
- Reporta **progreso** (bloques completados / total).
- Es **reanudable**: el estado `parcial` permite solicitar el complemento del rango
  (comportamiento ya soportado por RF-006/RI-002 de 01-mvp).

Un rango mayor a 12 meses se descompone en tantas tandas como haga falta; 2 años =
2 tandas (KPI-2).

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Descarga única de hasta 2 años | Menos tareas | Un solo fallo pierde todo el avance; difícil de monitorear | R-005; reintroduce el corte observado |
| Tandas de 1 mes | Granularidad fina | Muchas tareas y más overhead de pacing | Peor relación coste/progreso |
| **Tandas de 6–12 meses** | Acota pérdida por fallo, buen progreso, pocas tareas | El usuario debe pedir 2 tandas para 2 años | — (elegida) |

## Consecuencias

### Positivas
- El avance se preserva parcialmente ante un corte (fusión incremental por tanda).
- Progreso observable vía la cola existente (RF-104).
- 2 años quedan en 2 tandas, alineado con el presupuesto de 1800 s (KPI-2).

### Negativas / Trade-offs
- Requiere que el usuario (o la UI) orqueste 2 solicitudes para 2 años; en 01-mvp la
  UI ya sugiere el rango a completar en estado `parcial`.
- Más registros de metadatos por activo.

### Neutras
- No cambia el contrato de la API ni la fusión (RF-105).

## Referencias

- `_docs/iterations/02-optimizacion-descarga/plan.md` §3, §6 (D-5), §7 (R-005)
- `_docs/iterations/02-optimizacion-descarga/requirements.md` RF-104, RNF-101, RNF-003
- `_docs/iterations/01-mvp/adr/ADR-006-cola-celery-rabbitmq.md`
