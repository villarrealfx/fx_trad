import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

/**
 * Punto de entrada de la SPA. Monta la aplicación React sobre el elemento
 * `#root` definido en `index.html` (ADR-003).
 */
const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Punto de montaje #root no encontrado en index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
