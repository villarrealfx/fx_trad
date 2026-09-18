# Plataforma de Análisis Técnico - Estilo TradingView
## Especificación técnica y del producto — MVP v1.0

**Estado:** Borrador  

**Fecha:** 15 de septiembre de 2026  

## 1. Resumen del producto

Aplicación web para realizar análisis técnico de activos financieros los datos históricos se descargan de la app de duskacopy  pudiendo seleccionar activo, fecha de inicio y fecha de fin de la muestra. una vez descargada la data debera ser procesada y preparada según los siguientes criterios:
1. Carga y Configuración del Índice Temporal
2. Gestión de la Frecuencia y Remuestreo (Resampling)
3. Tratamiento de Valores Faltantes (Imputación)
4. Ingeniería de Características (Feature Engineering)

La data procesada se almacenara según el siguiente criterio Parquet como formato de archivo + DuckDB como motor de consulta. se debe crear una interfaz gráfica al estilo de "Tradingview" donde se puedan representar los datos como velas japonesas, se pueda realizar marcas, con lineas, rectangulos, retrocesos de fibonacci. el gráfico también debe poder integrar indicadores técnicos como medias móviles y se pueda movilizar a través de todos los datos.


## 2. Metas

El MVP debe:

1. Usuario único sin autenticación.

2. La aplicación debera poder ser accesada desde navegadores de escritorio modernos.

4. Un usuario debera poder:
    1. Descargar Data histórica seleccionando el activo, fecha de fnicio y fecha final 
    2. El timeframe para descarga será de 1 segundo en UTC.

5. Al realizar la descarga los datos deberan pasar por un proceso de limpieza y adecuación que permita que la libreria los reconozca deben ser de la siguiente manera:
        - time:timestamps (en segundos)
        - open:number
        - high:number
        - low:number
        - close:number 

6. Los datos que correspondan a Fines de Semana (para Forex, y otros activos con cierre semanal) y días feriados deben excluirce para evitar gaps. 

7. Desde la Interfaz gráfica debera ser posible cargar los datos desde las fuentes guardadas.

8. Permitir anadir herramientas de dibujo (lineas, Fibonacci, simulador de compra y venta) sin hacks

9. Permite anadir Indicadores técnicos (Medias móviles configurables, RSI, ATR).

10. La interfaz debe permitir funciones de Zoom and Pan.

11. La interfaz debera poder representar datos en diferente timeframe a partir de los datos de 1 segundo

12. Capacidad para desplegar hasta 3 gráficos de diferente timeframe del mismo activo a la vez


## 3. No goles para el MVP

Los siguientes están excluidos intencionalmente de la primera versión:

- Cargar datos en tiempo real

- Creador de Estrategias 

- Evaluación automática de estrategias

- Trading en vivo.