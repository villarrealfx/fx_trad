/**
 * Menú contextual de vela (CMP-024, RF-408, HU-UI-403).
 *
 * Panel flotante que **fija** una vela bajo el clic derecho y muestra su fecha,
 * hora y OHLC a 5 decimales con `font-num` tabular (la misma fuente de formato
 * que el eje y la leyenda). No sustituye la leyenda inferior, que sigue al
 * cursor. Se reposiciona si no cabe en el viewport (estado `repositioned`) y
 * **nunca** recorta el dato; fondo y sombra estáticos, sin `backdrop-filter`
 * (RNF-403).
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type { Candle } from '../../contracts/ohlc';
import { PRICE_FORMAT, formatAxisDate, formatAxisTime } from '../../charting/axis-format';
import './CandleContextMenu.css';

/** Punto de anclaje del panel dentro de su contenedor posicionado. */
export interface CandleContextMenuAnchor {
  /** Coordenada horizontal en píxeles. */
  x: number;
  /** Coordenada vertical en píxeles. */
  y: number;
}

/** Props del menú contextual (CMP-024, RF-408). */
export interface CandleContextMenuProps {
  /** Vela fijada por el clic derecho. */
  candle: Candle;
  /** Anclaje del panel al punto del clic. */
  anchor: CandleContextMenuAnchor;
  /** Cierra el panel (estado `context-closing`). */
  onClose: () => void;
  /** Decimales del activo (por defecto, la precisión de RF-207). */
  decimals?: number;
  /** Elemento que recupera el foco al cerrar (el gráfico). */
  returnFocusRef?: RefObject<HTMLElement>;
}

/** Margen mínimo entre el panel y el borde del viewport (`repositioned`). */
const VIEWPORT_MARGIN = 8;

export default function CandleContextMenu({
  candle,
  anchor,
  onClose,
  decimals = PRICE_FORMAT.precision,
  returnFocusRef,
}: CandleContextMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(anchor);

  /** Cierra el panel devolviendo el foco al gráfico (estado `context-closing`). */
  const close = useCallback((): void => {
    returnFocusRef?.current?.focus();
    onClose();
  }, [onClose, returnFocusRef]);

  // Al abrir, el foco entra en el panel (estado `context-open`).
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Reposicionamiento: si el panel no cabe, se desplaza dentro del viewport.
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const rect = container.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - VIEWPORT_MARGIN;
    const maxTop = window.innerHeight - rect.height - VIEWPORT_MARGIN;
    setPosition({
      x: Math.max(VIEWPORT_MARGIN, Math.min(anchor.x, maxLeft)),
      y: Math.max(VIEWPORT_MARGIN, Math.min(anchor.y, maxTop)),
    });
  }, [anchor.x, anchor.y]);

  // Clic fuera: cierra y devuelve el foco.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      const container = containerRef.current;
      if (container !== null && !container.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [close]);

  /** `Escape` cierra; el panel no tiene controles, así que retiene el foco. */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') event.preventDefault();
  }

  const repositioned = position.x !== anchor.x || position.y !== anchor.y;
  const metrics: ReadonlyArray<readonly [string, number]> = [
    ['O', candle.open],
    ['H', candle.high],
    ['L', candle.low],
    ['C', candle.close],
  ];

  return (
    <div
      ref={containerRef}
      className="candle-context-menu"
      role="dialog"
      aria-label="Datos de la vela"
      tabIndex={-1}
      data-repositioned={repositioned}
      style={{ left: position.x, top: position.y }}
      onKeyDown={handleKeyDown}
    >
      <p className="candle-context-menu__header">
        {formatAxisDate(candle.time)} · {formatAxisTime(candle.time)}
      </p>
      <dl className="candle-context-menu__ohlc">
        {metrics.map(([label, value]) => (
          <div key={label} className="candle-context-menu__cell">
            <dt className="candle-context-menu__label">{label}</dt>
            <dd className="candle-context-menu__value">{value.toFixed(decimals)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
