/**
 * Componente raíz de la aplicación.
 *
 * Scaffold de TASK-023 con la integración provisional del panel de velas
 * (TASK-024, CMP-007): renderiza un ChartPane de ejemplo con un activo y
 * timeframe fijos. El layout completo (appbar, routing, selectores) llega con
 * TASK-UI-003.
 */
import ChartPane from './components/ChartPane/ChartPane';

export default function App() {
  return (
    <main>
      <h1>fxtrad</h1>
      <p>Plataforma de análisis técnico</p>
      <section style={{ height: 480 }} aria-label="Vista previa del gráfico">
        <ChartPane symbol="EURUSD" timeframe="1h" />
      </section>
    </main>
  );
}
