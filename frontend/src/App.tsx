/**
 * Componente raíz de la aplicación.
 *
 * Scaffold de TASK-023 con la integración provisional del panel de velas
 * (TASK-024, CMP-007), del panel de indicadores (TASK-032, RF-013) y del modal
 * de export (TASK-UI-060, SCR-006): renderiza un ChartPane de ejemplo con un
 * activo/timeframe fijos y abre el modal de export que compone y descarga el
 * PNG. El layout completo (appbar, routing, selectores) llega con TASK-UI-003.
 */
import { useCallback, useRef, useState } from 'react';
import ChartPane from './components/ChartPane/ChartPane';
import type { ChartPaneHandle } from './components/ChartPane/ChartPane';
import ExportModal from './components/ExportModal/ExportModal';
import IndicatorPanel from './components/IndicatorPanel/IndicatorPanel';
import Button from './components/ui/Button';
import Toast from './components/ui/Toast';
import type { ExportScale } from './export';
import { DEFAULT_INDICATOR_PARAMETERS, type IndicatorParameters } from './indicators/indicators';

export default function App() {
  const [indicators, setIndicators] = useState<IndicatorParameters>(DEFAULT_INDICATOR_PARAMETERS);
  const paneRef = useRef<ChartPaneHandle>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /** Compone el lienzo del ChartPane a la escala pedida (RF-015). */
  const compose = useCallback((scale: ExportScale) => paneRef.current?.compose(scale) ?? null, []);

  return (
    <main>
      <h1>fxtrad</h1>
      <p>Plataforma de análisis técnico</p>
      <section style={{ height: 480 }} aria-label="Vista previa del gráfico">
        <ChartPane ref={paneRef} symbol="EURUSD" timeframe="1h" indicators={indicators} />
      </section>
      <IndicatorPanel params={indicators} onChange={setIndicators} />
      <section aria-label="Exportación de la captura">
        <Button label="Exportar" onClick={() => setExportOpen(true)} />
      </section>
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        compose={compose}
        symbol="EURUSD"
        timeframe="1h"
        onExported={(filename) => setToast(`Captura descargada: ${filename}`)}
      />
      {toast !== null && <Toast tone="success" message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
