/**
 * Adaptador del overlay de dibujos a la API pública de lightweight-charts v4
 * (ADR-005, TASK-027).
 *
 * Convierte el chart + serie de velas en un {@link OverlayBinding}: proyección
 * precio/tiempo → píxeles y suscripción a los eventos que obligan a redibujar
 * (rango lógico visible al hacer pan/zoom y cambio de tamaño). v4 no expone un
 * evento de rango de precios: la coordenada vertical se relee en cada frame,
 * cubriendo el autoscale al cargar datos (RNF-001).
 */
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import type { CoordinateMapper } from './overlay-geometry';

/** Contrato de sincronización del overlay con una instancia de chart. */
export interface OverlayBinding extends CoordinateMapper {
  /**
   * Suscribe un listener de redibujo y devuelve la función de limpieza.
   * Se invoca ante pan/zoom (rango lógico visible) y cambios de tamaño.
   */
  subscribeRedraw(listener: () => void): () => void;
}

/**
 * Crea el binding del overlay para el chart de velas del ChartPane (TASK-027).
 * El overlay queda sincronizado con los ejes reales de la librería: un
 * pan/zoom desplaza las mismas anclas a píxeles nuevos en el siguiente frame.
 */
export function createOverlayBinding(
  chart: IChartApi,
  series: ISeriesApi<'Candlestick'>,
): OverlayBinding {
  return {
    timeToCoordinate: (time) => chart.timeScale().timeToCoordinate(time as Time),
    priceToCoordinate: (price) => series.priceToCoordinate(price),
    subscribeRedraw(listener) {
      const onVisibleLogicalRangeChanged = (): void => listener();
      const onSizeChanged = (): void => listener();
      chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);
      chart.timeScale().subscribeSizeChange(onSizeChanged);
      return () => {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);
        chart.timeScale().unsubscribeSizeChange(onSizeChanged);
      };
    },
  };
}
