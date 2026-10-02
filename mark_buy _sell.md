## Herramienta de operación Fibonacci

**Objetivo**

Agregar una nueva herramienta de dibujo que permita representar una operación de trading mediante una aproximación a lo ya realizado con los niveles Fibonacci utilizados actualmente en el análisis. La herramienta debe integrarse con el sistema existente de dibujos y mantener el comportamiento de edición y desplazamiento que ya poseen las herramientas actuales.

**Unidad de dibujo**

La opeherramienta constituye un único dibujo, de forma equivalente al dibujo Fibonacci existente.
Aunque visualmente está compuesto por varias líneas y etiquetas (SL, Entrada y TP), todos los elementos forman parte de una misma figura y deben comportarse como una unidad para:
1. selección;
2. edición;
3. desplazamiento;
4. eliminación.
5. Creación

La operación se define mediante dos puntos:
1. Primer punto: Entrada.
2. Segundo punto: Stop Loss.

La dirección se determina automáticamente:
1. Si Entrada > SL → operación es **Compra**.
2. Si Entrada < SL → operación **Venta**.

No se requiere selección manual de la dirección.

**Similitud con Estructura Fibonacci**

La herramienta utiliza internamente la siguiente relación:
0 → Stop Loss.
0.5 → Entrada.
1.0 → referencia de riesgo/beneficio 1:1.
1.382 → TP 1.382.
1.5 → TP 1.5.
2.0 → TP 2.

Los niveles 0, 0.5 y 1.0 son referencias de cálculo y no deben mostrarse.

Los niveles visibles serán únicamente:
1. Stop Loss.
2. Entrada.
3. TP 1.382.
4. TP 1.5.
5. TP 2.

Representación visual
| Nivel | Color | Etiqueta |
|:---:|:---:|:---:|
| Stop Loss | Rojo | SL (precio) |
| Entrada | Blanco | Entrada (precio) |
| TP 1.382 | Verde | TP 1.382 (precio) |
| TP 1.5 | Verde | TP 1.5 (precio) |
| TP 2 | Verde | TP 2 (precio) |

El valor mostrado como precio debe corresponder al precio real del nivel en el gráfico.

**Edición**

La herramienta debe utilizar dos puntos de control, de forma consistente con el Fibonacci existente:
1. Punto de Entrada.
2. Punto de Stop Loss.

Al modificar cualquiera de los puntos:
1. Se actualiza la posición de la operación.
2. Se determina nuevamente la dirección Long/Short.
3. Se recalculan los niveles TP.
4. Se actualizan las etiquetas con los nuevos precios.
5. Se mantiene la proporción de los niveles respecto a la distancia entre Entrada y SL.
6. La figura completa debe poder desplazarse manteniendo la relación entre sus niveles.

**Comportamiento esperado**

1. Para una operación Long, los niveles TP deben generarse por encima de la Entrada.
2. Para una operación Short, los niveles TP deben generarse por debajo de la Entrada.
3. La herramienta debe mantener esta lógica automáticamente al modificar los puntos.

**Integración**

La nueva herramienta debe integrarse con el sistema actual de dibujos y conservar los comportamientos existentes de:
1. selección;
2. edición;
3. desplazamiento;
4. eliminación;
5. conversión entre coordenadas y precios;
6. representación de etiquetas.
7. Siempre que exista funcionalidad reutilizable en el dibujo Fibonacci actual, debe utilizarse en lugar de implementar mecanismos equivalentes nuevos.
8. La incorporación de esta herramienta no debe modificar ni romper el comportamiento de las herramientas de dibujo existentes.

**Validación**

Debe contemplarse como mínimo:
1. creación correcta de una operación Long;
2. creación correcta de una operación Short;
3. cálculo correcto de los niveles 1.382, 1.5 y 2;
4. actualización de niveles al modificar Entrada;
5. actualización de niveles al modificar SL;
6. desplazamiento de la figura conservando las proporciones;
7. actualización correcta de los precios mostrados en las etiquetas;
8. comportamiento de la operación como un único dibujo.
9. Integración correcta y efectiva dentro del la pantalla correspondiente a Gráfico como herramienta de dibujo.
10. Se mantienen los criterios de persistencia adptados en el proyecto.