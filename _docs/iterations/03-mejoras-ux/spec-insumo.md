# Plataforma de Análisis Técnico - Estilo TradingView
## Especificación técnica y del producto — MVP v1.0

**Estado:** Borrador  

**Fecha:** 15 de septiembre de 2026

## 1. Resumen del producto
Realizar mejoras a la interfaz gráfica de la plataforma de Análisis Técnico en sus diferentes pantallas según se describe en este documento.

## 2. Metas
Crear una experiencia de ususario mas fluida y eficiente para facilitar el analisis de los activos.

## 3. Mejoras propuestas

Se abre a discución los siguientes puntos a Mejorar:
1. Pantalla `Gráfico`
    * Eliminar indicadores técnicos marcados por defecto solo se permitirá la creación de estos segúnla necesidad del usuario
    * Eliminar panel de indicadores de la parte inferior de la pantalla
    * crear en el header del gráfico (donde se encuentran los botones para las herramientas de dibujo) un botón de indicadores que al pusar:

        - Abra un formulario flotante donde se realice la selección de indicadores y su configuración.
        - En el formulario se mostrará en una lista todos los indicadores que se encuentren agregados cada uno con las opciones de mostrar/ocultar, configurar, eliminar.
        - DEbe poseer un botón para cerrar el panel y liberar el espacio todos los indicadores deben persistir una vez se cierre el formulario.
    * Ajustar la lógica para que se mantenga la última configuración del gráfico (Activo, Dibujos, Indicadores) al cambiar de hoja y retornar a Gráfico.
    * El boton de exportar ubicarlo en el header del gráfico al lado de el botón de indicadores del punto anterior.
    * Ampliar el area del gráfico a la pantalla completa horizontal (como esta) y Vertical (ganaria el espacio que hasta ahora estaba reservado para los indicadores)
    * En el eje x del gráfico ademas del dia incluir la hora:minutos de la vela tomando como referencia la apertura de la misma.
    * En el eje y se debe aumentar la precisión a 5 decimales (estandar en forex, metales y petroleo)
    * Cuando se realice una marca por compra o venta el simbolo de triangulo se debe incertar a 10 pips por encima del maximo de la vela si es venta y por debajo del mínimo si es compra.
    * Colorear los diferentes dibujos con diferente colores colores mates preferiblemente Azul (#4A6572): linea, Beige (#D6C7AE): rectangulo y terracota (#DDB2AC): fibobacci
    * Mantener linea completamente horizontal o vertical jugando con la dirección del segundo cli y una tecla como shiff.
    * Usar íconos mas representativos si fuera el caso.

2. Pantalla`Descarga`
    
    * Centrar horizontalmente el formulario y la tabla del historial.
    * Incluir el activo en la tabla del historial.
    * Ampliar la lista de activos en forex a los siguientes:
        - EURUSD
        - GBPUSD
        - USDJPY
        - GBPJPY
        - EURJPY
        - AUDUSD
        - USDCAD
        - EURGBP
    * Realizar los ajustes en backend necesarios para que todos los activos indicados puedan ser procesados

3. Pantalla `Abrir`
    * Centrar horizontalmente el formulario.
    * Eliminar toda referencia a Timeframe de 1s sustituirla por 1m donde aplique.

NOTA: 
- Cual quier cambio que se realice que afecte de alguna manera las funcionalidades del backend debera abordarse demanera conjunta y dejarlo completamente operativo.
- Toda modificación finalizada (pantalla completa) debera ser comprobada visualmente por el usuario antes de ser aprobada por lo tanto debera subir el sistema y animar la evaluación del mismo.
- El orden de prioridad de mejoras es el mismo que se sigue en este documento, al menos que se justifique lo contrario.
