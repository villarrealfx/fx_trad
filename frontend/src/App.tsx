/**
 * Componente raíz de la aplicación.
 *
 * Layout + routing (TASK-UI-003): shell con appbar/navegación y una pantalla
 * activa (single-window). SCR-004 monta el gráfico (ChartPane + indicadores +
 * export); el resto muestra un placeholder hasta que sus tareas de pantalla se
 * implementen (TASK-UI-010/020/030/050/060).
 */
import { useCallback, useRef, useState } from 'react';
import { DEFAULT_ROUTE, DEFAULT_TIMEFRAME, ROUTES, routeFor, type AppRoute } from './app/routes';
import { navigate, useHashRoute } from './app/useHashRoute';
import AppShell from './components/AppShell/AppShell';
import ChartPane from './components/ChartPane/ChartPane';
import type { ChartPaneHandle } from './components/ChartPane/ChartPane';
import DownloadForm from './components/DownloadForm/DownloadForm';
import ExportModal from './components/ExportModal/ExportModal';
import IndicatorPanel from './components/IndicatorPanel/IndicatorPanel';
import Button from './components/ui/Button';
import Toast from './components/ui/Toast';
import type { ExportScale } from './export';
import {
  DEFAULT_INDICATOR_CONFIGS,
  toIndicatorParameters,
  type IndicatorConfig,
} from './indicators/config';

/** Símbolo del gráfico de ejemplo del scaffold. */
const DEMO_SYMBOL = 'EURUSD';

/** Pantalla SCR-004: gráfico principal + indicadores + export (scaffold). */
function ChartScreen() {
  const [configs, setConfigs] = useState<readonly IndicatorConfig[]>(DEFAULT_INDICATOR_CONFIGS);
  const paneRef = useRef<ChartPaneHandle>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /** Compone el lienzo del ChartPane a la escala pedida (RF-015). */
  const compose = useCallback((scale: ExportScale) => paneRef.current?.compose(scale) ?? null, []);

  return (
    <section className="chart-screen" aria-label="Gráfico principal">
      <div className="chart-screen__graph" style={{ height: 420 }}>
        <ChartPane
          ref={paneRef}
          symbol={DEMO_SYMBOL}
          timeframe={DEFAULT_TIMEFRAME}
          indicators={toIndicatorParameters(configs)}
        />
      </div>
      <IndicatorPanel configs={configs} onChange={setConfigs} />
      <section aria-label="Exportación de la captura">
        <Button label="Exportar" onClick={() => setExportOpen(true)} />
      </section>
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        compose={compose}
        symbol={DEMO_SYMBOL}
        timeframe={DEFAULT_TIMEFRAME}
        onExported={(filename) => setToast(`Captura descargada: ${filename}`)}
      />
      {toast !== null && <Toast tone="success" message={toast} onClose={() => setToast(null)} />}
    </section>
  );
}

/** Placeholder de las pantallas pendientes de implementar. */
function ScreenPlaceholder({ route }: { route: AppRoute }) {
  return (
    <section className="screen-placeholder" aria-label={route.label}>
      <h2>{route.label}</h2>
      <p>Pantalla {route.screen} pendiente de implementación.</p>
    </section>
  );
}

/** Pantalla SCR-002: formulario de descarga de datos históricos. */
function DownloadScreen() {
  return (
    <section aria-label="Descarga de datos históricos">
      <h2>Descargar datos históricos</h2>
      <DownloadForm />
    </section>
  );
}

export default function App() {
  const path = useHashRoute(DEFAULT_ROUTE);
  const route = routeFor(path);

  function renderScreen() {
    if (route.screen === 'SCR-004') return <ChartScreen />;
    if (route.screen === 'SCR-002') return <DownloadScreen />;
    return <ScreenPlaceholder route={route} />;
  }

  return (
    <AppShell routes={ROUTES} activePath={route.path} onNavigate={navigate}>
      {renderScreen()}
    </AppShell>
  );
}
