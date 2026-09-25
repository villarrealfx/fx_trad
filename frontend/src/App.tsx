/**
 * Componente raíz de la aplicación.
 *
 * Layout + routing (TASK-UI-003) con vista activa única: SCR-004 monta el
 * gráfico (ChartPane + indicadores + export), SCR-003 el selector de
 * activo/rango/timeframe (TASK-026) y SCR-002 el formulario de descarga. El
 * resto muestra un placeholder hasta que sus tareas de pantalla se implementen.
 */
import { useCallback, useRef, useState } from 'react';
import {
  DEFAULT_ROUTE,
  ROUTES,
  parseChartQuery,
  parseLocation,
  routeFor,
  type AppRoute,
  type ChartQuery,
} from './app/routes';
import { navigate, useHashRoute } from './app/useHashRoute';
import AppShell from './components/AppShell/AppShell';
import ChartPane from './components/ChartPane/ChartPane';
import type { ChartPaneHandle } from './components/ChartPane/ChartPane';
import ChartSelector from './components/ChartSelector/ChartSelector';
import DownloadScreen from './components/DownloadScreen/DownloadScreen';
import ExportModal from './components/ExportModal/ExportModal';
import IndicatorPanel from './components/IndicatorPanel/IndicatorPanel';
import MultiChart from './components/MultiChart/MultiChart';
import Button from './components/ui/Button';
import Toast from './components/ui/Toast';
import type { ExportScale } from './export';
import {
  DEFAULT_INDICATOR_CONFIGS,
  toIndicatorParameters,
  type IndicatorConfig,
} from './indicators/config';
import { endOfDayEpoch, startOfDayEpoch } from './utils/dates';

/** Pantalla SCR-004: gráfico de la selección + indicadores + export. */
function ChartScreen({ selection }: { selection: ChartQuery }) {
  const [configs, setConfigs] = useState<readonly IndicatorConfig[]>(DEFAULT_INDICATOR_CONFIGS);
  const paneRef = useRef<ChartPaneHandle>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { symbol, timeframe } = selection;
  const start = selection.start !== undefined ? startOfDayEpoch(selection.start) : undefined;
  const end = selection.end !== undefined ? endOfDayEpoch(selection.end) : undefined;

  /** Compone el lienzo del ChartPane a la escala pedida (RF-015). */
  const compose = useCallback((scale: ExportScale) => paneRef.current?.compose(scale) ?? null, []);

  return (
    <section className="chart-screen" aria-label="Gráfico principal">
      <div className="chart-screen__graph" style={{ height: 420 }}>
        <ChartPane
          ref={paneRef}
          symbol={symbol}
          timeframe={timeframe}
          start={start}
          end={end}
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
        symbol={symbol}
        timeframe={timeframe}
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

/** Pantalla SCR-003: selector de activo/rango/timeframe → SCR-004 (TASK-026). */
function OpenChartScreen() {
  return (
    <section aria-label="Abrir gráfico">
      <h2>Abrir gráfico</h2>
      <ChartSelector onOpen={navigate} />
    </section>
  );
}

export default function App() {
  const location = useHashRoute(DEFAULT_ROUTE);
  const { path, params } = parseLocation(location);
  const route = routeFor(path);

  function renderScreen() {
    if (route.screen === 'SCR-004') {
      return <ChartScreen selection={parseChartQuery(params)} />;
    }
    if (route.screen === 'SCR-005') {
      return <MultiChart symbol={parseChartQuery(params).symbol} />;
    }
    if (route.screen === 'SCR-003') return <OpenChartScreen />;
    if (route.screen === 'SCR-002') return <DownloadScreen />;
    return <ScreenPlaceholder route={route} />;
  }

  return (
    <AppShell routes={ROUTES} activePath={route.path} onNavigate={navigate}>
      {renderScreen()}
    </AppShell>
  );
}
