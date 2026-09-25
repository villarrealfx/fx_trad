import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Destino del proxy de la API (TASK-038).
 *
 * En desarrollo local apunta a `http://localhost:8000`; dentro de Docker
 * Compose, `VITE_PROXY_TARGET=http://backend:8000` resuelve el servicio por la
 * red interna, de modo que el navegador usa un único origen y no hace falta CORS.
 */
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/series': { target: proxyTarget, changeOrigin: true },
      '/downloads': { target: proxyTarget, changeOrigin: true },
      '/assets': { target: proxyTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts', 'src/contracts'],
    },
  },
});
