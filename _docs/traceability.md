# Trazabilidad: fxtrad

> Última actualización: 2026-10-02
> Ciclo actual: **05** (sin requisitos propios todavía)

## 1. Estado de la trazabilidad

El ciclo 05 **no define requisitos nuevos**: arranca con deuda técnica heredada, y la deuda
técnica por definición no cuelga de un requisito funcional (así se registró `TECH-302` y
`TECH-303` en el ciclo 04).

El registro completo de los 27 requisitos del proyecto, con su prueba y su archivo de
evidencia, está en el ciclo 04:

**→ `_docs/iterations/04-dibujo-referencia-operacion/traceability.md`**

Allí se conserva el histórico vivo: qué tarea cubre cada requisito, qué prueba lo verifica y
en qué commit.

## 2. Resumen

| Grupo | Requisitos | 🟢 | 🔵 | Evidencia |
|-------|-----------|----|----|-----------|
| RF-301…312 (operación) | 12 | 12 | 0 | `iterations/04-…/traceability.md` |
| RNF-301…305 (operación) | 5 | 5 | 0 | `iterations/04-…/traceability.md` |
| RI-301 (modelo) | 1 | 1 | 0 | `iterations/04-…/traceability.md` |
| RX-301 (sin dependencias) | 1 | 1 | 0 | `iterations/04-…/traceability.md` |
| **Subtotal propios del ciclo 04** | **19** | **19** | **0** | |
| Heredados sin re-verificar | 8 | — | 🔵 | `iterations/01…03/` |
| **Total** | **27** | **19** | **8** | |

**Requisitos del ciclo 05:** ninguno todavía. Cuando `/sdd-backlog` abra épicas, se
incorporarán aquí su requisito origen y su tarea.

## 3. Requisitos heredados sin re-verificar

Se mantienen como estaban al cierre del ciclo 03. Su evidencia histórica vive en las
carpetas de iteración correspondientes y **no se re-verifica** en cada ciclo.

| ID | Tipo | Evidencia |
|----|------|-----------|
| RNF-001 | RNF | `iterations/01-mvp/traceability.md` |
| RNF-201, RNF-202, RNF-204 | RNF | `iterations/02-optimizacion-descarga/` y `iterations/03-mejoras-ux/` |
| RI-001, RI-003, RI-201 | RI | `iterations/01-mvp/`, `iterations/03-mejoras-ux/` |
| RX-001 | RX | `iterations/01-mvp/` |

## 4. Deuda técnica sin requisito

| ID | Tarea | Por qué no hay requisito |
|----|-------|--------------------------|
| TECH-302 | Contraste de `drawLine` (3.16:1) | **Preexistente del ciclo 03** y no textual: se distingue por forma, no por color. El requisito de contraste (RNF-305) cubre la figura nueva, no la línea de eje |
| TECH-303 | Entrada numérica de Entrada/SL | No cubierto por RF-301…312: el requisito define la operación por dos anclas arrastradas, no por precio tecleado |

Ambas están en el backlog del ciclo 05 (`_docs/backlog.md` §3). Si una iteración futura las
asume, deben colgarse de un requisito nuevo o de uno existente ampliado.

## 5. Cobertura de la nueva figura (operación)

Como referencia rápida de lo que cerró el ciclo 04 — **no** es trazabilidad del ciclo 05:

| Requisito | Tareas del ciclo 04 |
|-----------|--------------------|
| RF-301…305 (modelo y geometría) | TASK-301, TASK-302, TASK-303, TASK-304, TASK-305 |
| RF-306…309 (figura, edición, etiquetas, color) | TASK-UI-310…321, TASK-UI-300/301 |
| RNF-301/305 (etiquetas y contraste) | TASK-UI-300, TASK-UI-301 |
| RI-301 / RNF-304 (persistencia aditiva) | TASK-UI-311, TASK-UI-312 |
| RNF-302/303 (frame budget, sin regresiones) | TASK-TEC-300, TASK-TEC-301 |
| RX-301 (sin dependencias nuevas) | TASK-TEC-303 |