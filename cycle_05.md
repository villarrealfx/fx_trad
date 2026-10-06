# Plataforma de Análisis Técnico - Estilo TradingView
## Especificación técnica y del producto — MVP v1.0

**Estado:** Borrador  

**Fecha:** 06 de octubre de 2026

## 1. Resumen del producto
Realizar mejoras a la interfaz gráfica de la plataforma de Análisis Técnico en pantalla Graficos y cerrar Tareas diferidas según se describe en este documento.

## 2. Metas
Crear una experiencia de ususario mas fluida y eficiente para facilitar el analisis de los activos.

## 3. Mejoras propuestas

Se abre a discución los siguientes puntos a Mejorar:

1. Tareas pendientes heredadas de Ciclo 4
    - TECH-302 `drawLine` 
    - TECH-303 Entrada numérica de Entrada/SL (formulario) para dar ruta por teclado y precio exacto al pip

2. Pantalla `Gráfico`
    - Ajustar la lógica para que se mantenga la última configuración del gráfico (Activo, Dibujos, Indicadores) al cambiar de hoja y retornar a Gráfico.
    **NOTA**: 
        Actualmente parece estar como predeterminado el gráfico de EURUSD con time frame de 1H esto se probó y funcionó correctamente pero la versión actual tiene este comportamiento anómalo.
        Los graficos conservan los dibujos e indicadores correctamente pero no se muestran al cambiar de pestaña siempre muestra el de EURUSD 1H

    - Eliminar alarma warning "La cobertura disponible es menor al rango solicitado" parece ser un falso positivo por que el gráfico se muestra correctamente con el rango de datos solicitado

    - Mejora de este ciclo En la Pantalla `Gráfico`:
        1. Permitir cambio de Timeframe de un activo (Ejemplo estoy en GBPUSD 1H y pasar a otro TF ejemplo 15min).
        2. Mantener en el canvas los dibujos a la escala del TF que fueron realizados (Ejemplo estoy en GBPUSD en 1 hora y dibujo un fibo este debe aparecer cuando cambie a tf 15 min).
        3. Los indicadores se deben adaptar al TF que se esté visualizando.
        4. Mantener los TF de 1m, 5m, 15m, 1h, 4h, 1d ubicarlos electores en la parte superior al lado del boton de indicadores.
        5. Mejorar visualización de valores eje x colocar en dos filas fecha arriba hora:minutos abajo 
        ejemplo: 18-nov-25
                   00:15 
        6. AL hacer click derecho sobre una vela se despliegue la información de la vela fecha, hora, OHLC
    
    - Eliminar la pestaña o pantalla de Multigráfico la razon es que no aporta una experiencia de usuario cómoda y dificulta el análisis.
    - Evaluar la pantalla `Exportar`SCR-006 verificar si es viable o eliminarla.

