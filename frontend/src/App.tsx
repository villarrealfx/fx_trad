/**
 * Componente raíz de la aplicación.
 *
 * Layout + routing (TASK-UI-003) con vista activa única: SCR-004 monta el
 * gráfico (ChartPane + indicadores + export), SCR-003 el selector de
 * activo/rango/timeframe (TASK-026) y SCR-002 el formulario de descarga. El
 * resto muestra un placeholder hasta que sus tareas de pantalla se implementen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_ROUTE,
  ROUTES,
  buildChartUrl,
  hasExplicitChartQuery,
  parseChartQuery,
  parseLocation,
  routeFor,
  type AppRoute,
  type ChartQuery,
} from './app/routes';
import { navigate, replaceRoute, useHashRoute } from './app/useHashRoute';
import AppShell from './components/AppShell/AppShell';
import AssetLibraryScreen from './components/AssetLibraryScreen/AssetLibraryScreen';
import ChartPane from './components/ChartPane/ChartPane';
import type { ChartPaneHandle, ChartStatus } from './components/ChartPane/ChartPane';
import ChartSelector from './components/ChartSelector/ChartSelector';
import DownloadScreen from './components/DownloadScreen/DownloadScreen';
import ExportModal from './components/ExportModal/ExportModal';
import IndicatorForm from './components/IndicatorForm/IndicatorForm';
import MultiChart from './components/MultiChart/MultiChart';
import Toast from './components/ui/Toast';
import LiveRegion from './components/ui/LiveRegion';
import type { Timeframe } from './contracts/ohlc';
import type { ExportScale } from './export';
import { toIndicatorParameters } from './indicators/config';
import { endOfDayEpoch, startOfDayEpoch } from './utils/dates';
import { createChartConfigStore } from './state/chart-config';
import { useChartConfig } from './state/use-chart-config';

/** Etiqueta hablada de cada timeframe para el anuncio de cambio de escala (RF-403). */
const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1m': '1 minuto',
  '5m': '5 minutos',
  '15m': '15 minutos',
  '1h': '1 hora',
  '4h': '4 horas',
  '1d': '1 día',
};

/** Pantalla SCR-004: gráfico de la selección + indicadores + export. */
function ChartScreen({
  selection,
  hydrateUrl,
}: {
  selection: ChartQuery;
  /** La URL llegó sin query: hay que enriquecerla con la selección efectiva. */
  hydrateUrl: boolean;
}) {
  const { symbol, timeframe } = selection;
  const selectionStart = selection.start;
  const selectionEnd = selection.end;
  // Documento v2 por activo: dibujos compartidos + indicadores + selección (TASK-401, ADR-027).
  const {
    indicators: configs,
    drawings,
    setIndicators,
    setDrawings,
  } = useChartConfig(symbol, selection);
  const paneRef = useRef<ChartPaneHandle>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [indicatorsOpen, setIndicatorsOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const start = selection.start !== undefined ? startOfDayEpoch(selection.start) : undefined;
  const end = selection.end !== undefined ? endOfDayEpoch(selection.end) : undefined;

  /** URL del gráfico para un timeframe, conservando activo y rango (RF-403). */
  const chartUrlFor = useCallback(
    (next: Timeframe) =>
      buildChartUrl({ symbol, timeframe: next, start: selectionStart, end: selectionEnd }),
    [symbol, selectionStart, selectionEnd],
  );

  // Cambio de escala (TASK-UI-403): la URL sigue siendo la fuente de la selección.
  const [pendingTimeframe, setPendingTimeframe] = useState<Timeframe | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const previousTimeframeRef = useRef<Timeframe | null>(null);

  /** Cambia de timeframe navegando; el panel se remonta por su `key`. */
  const handleChangeTimeframe = useCallback(
    (next: Timeframe) => {
      if (next === timeframe) return;
      previousTimeframeRef.current = timeframe;
      setPendingTimeframe(next);
      navigate(chartUrlFor(next));
    },
    [timeframe, chartUrlFor],
  );

  /**
   * Estados `switching-tf` / `tf-ready` / `tf-error` de `interaction-specs.md`.
   *
   * - `loading` con un cambio pendiente ⇒ `switching-tf` (skeleton, dibujos en pantalla).
   * - `success` ⇒ `tf-ready`: se anuncia el timeframe y se olvida el pendiente.
   * - `error` ⇒ `tf-error`: se **vuelve al timeframe anterior** conservando su serie y
   *   sin que la selección recordada quede en el destino fallido.
   */
  const handleStatusChange = useCallback(
    (status: ChartStatus) => {
      if (pendingTimeframe === null) return;
      if (status === 'success') {
        setAnnouncement(`Timeframe ${TIMEFRAME_LABELS[pendingTimeframe]}.`);
        setPendingTimeframe(null);
        return;
      }
      if (status === 'error') {
        const previous = previousTimeframeRef.current;
        setPendingTimeframe(null);
        if (previous !== null) {
          navigate(chartUrlFor(previous));
        }
      }
    },
    [pendingTimeframe, chartUrlFor],
  );

  // Recuerda la última selección usada y enriquece la URL si vino sin query
  // (RI-402, ADR-030). `replaceRoute` no apila historial ni dispara `hashchange`.
  useEffect(() => {
    createChartConfigStore().saveLastSelection({
      symbol,
      timeframe,
      start: selectionStart,
      end: selectionEnd,
    });
    if (hydrateUrl) {
      replaceRoute(buildChartUrl({ symbol, timeframe, start: selectionStart, end: selectionEnd }));
    }
  }, [symbol, timeframe, selectionStart, selectionEnd, hydrateUrl]);

  /** Compone el lienzo del ChartPane a la escala pedida (RF-015). */
  const compose = useCallback((scale: ExportScale) => paneRef.current?.compose(scale) ?? null, []);

  return (
    <section className="chart-screen" aria-label="Gráfico principal">
      <IndicatorForm
        open={indicatorsOpen}
        configs={configs}
        onChange={setIndicators}
        onClose={() => setIndicatorsOpen(false)}
      />
      {/* Sin altura fija: el gráfico ocupa todo el alto disponible (RF-202). */}
      <div className="chart-screen__graph">
        <ChartPane
          key={`${symbol}:${timeframe}`}
          ref={paneRef}
          symbol={symbol}
          timeframe={timeframe}
          start={start}
          end={end}
          indicators={toIndicatorParameters(configs)}
          initialDrawings={drawings}
          onDrawingsChange={(shapes) => setDrawings([...shapes])}
          indicatorsOpen={indicatorsOpen}
          onOpenIndicators={() => setIndicatorsOpen((value) => !value)}
          onExport={() => setExportOpen(true)}
          onChangeTimeframe={handleChangeTimeframe}
          onStatusChange={handleStatusChange}
        />
      </div>
      {announcement !== '' && <LiveRegion message={announcement} />}
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
function OpenChartScreen({ symbol }: { symbol?: string }) {
  return (
    <section className="open-chart-screen" aria-label="Abrir gráfico">
      {/* Formulario centrado horizontalmente (RF-218). */}
      <div className="open-chart-screen__content">
        <h2>Abrir gráfico</h2>
        <ChartSelector
          onOpen={navigate}
          defaultSymbol={symbol}
          onDownload={() => navigate('/downloads')}
        />
      </div>
    </section>
  );
}

export default function App() {
  const location = useHashRoute(DEFAULT_ROUTE);
  const { path, params } = parseLocation(location);
  const route = routeFor(path);

  function renderScreen() {
    if (route.screen === 'SCR-004') {
      // Precedencia: URL explícita > último seleccionado > defecto (ADR-028/ADR-030).
      const explicit = hasExplicitChartQuery(params);
      const fallback = explicit ? null : createChartConfigStore().loadLastSelection();
      return <ChartScreen selection={parseChartQuery(params, fallback)} hydrateUrl={!explicit} />;
    }
    if (route.screen === 'SCR-005') {
      return <MultiChart symbol={parseChartQuery(params).symbol} />;
    }
    if (route.screen === 'SCR-003') {
      return <OpenChartScreen symbol={params.get('symbol') ?? undefined} />;
    }
    if (route.screen === 'SCR-002') return <DownloadScreen />;
    if (route.screen === 'SCR-001') return <AssetLibraryScreen onNavigate={navigate} />;
    return <ScreenPlaceholder route={route} />;
  }

  return (
    <AppShell routes={ROUTES} activePath={route.path} onNavigate={navigate}>
      {renderScreen()}
    </AppShell>
  );
}
