/**
 * Componente raíz de la aplicación.
 *
 * Scaffold de TASK-023 con la integración provisional del panel de velas
 * (TASK-024, CMP-007) y del panel de indicadores (TASK-032, RF-013): renderiza
 * un ChartPane de ejemplo con un activo y timeframe fijos, computando
 * MA/RSI/ATR con los parámetros por defecto y permitiendo editarlos. El layout
 * completo (appbar, routing, selectores) llega con TASK-UI-003.
 *
 * Incluye además un **harness temporal de verificación visual** (TASK-035,
 * RF-015) que dispara `ChartPane.compose` y muestra el lienzo compuesto
 * (velas + indicadores + dibujos) en pantalla. TODO(TASK-036): reemplazar por
 * el export PNG real (modal CMP-014).
 */
import { useRef, useState } from 'react';
import ChartPane from './components/ChartPane/ChartPane';
import type { ChartPaneHandle } from './components/ChartPane/ChartPane';
import IndicatorPanel from './components/IndicatorPanel/IndicatorPanel';
import { DEFAULT_INDICATOR_PARAMETERS, type IndicatorParameters } from './indicators/indicators';

export default function App() {
  const [indicators, setIndicators] = useState<IndicatorParameters>(DEFAULT_INDICATOR_PARAMETERS);
  const paneRef = useRef<ChartPaneHandle>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [previewEmpty, setPreviewEmpty] = useState(false);

  /** Compone el lienzo (2x) y lo muestra para la verificación visual (TASK-035). */
  function verifyComposition(): void {
    const canvas = paneRef.current?.compose(2) ?? null;
    const host = previewRef.current;
    if (host === null) return;
    host.replaceChildren();
    setPreviewEmpty(canvas === null);
    if (canvas !== null) host.appendChild(canvas);
  }

  return (
    <main>
      <h1>fxtrad</h1>
      <p>Plataforma de análisis técnico</p>
      <section style={{ height: 480 }} aria-label="Vista previa del gráfico">
        <ChartPane ref={paneRef} symbol="EURUSD" timeframe="1h" indicators={indicators} />
      </section>
      <IndicatorPanel params={indicators} onChange={setIndicators} />
      <section aria-label="Verificación de composición">
        <button type="button" onClick={verifyComposition}>
          Verificar composición (dev)
        </button>
        {previewEmpty && <p role="alert">No hay gráfico para componer.</p>}
        <div ref={previewRef} data-testid="composition-preview" aria-live="polite" />
      </section>
    </main>
  );
}
