# Smoke test en navegadores de escritorio (TASK-046, RNF-005)

> La app debe funcionar en navegadores de escritorio modernos **sin plugins ni
> licencias de pago** (RNF-005). Este documento es el checklist de smoke y su
> evidencia.

## Alcance

Recorrido crítico de extremo a extremo sobre la SPA:

1. **Arranque / build**: `npm run build` compila sin errores y `vite preview`
   sirve la app (HTTP 200).
2. **Carga inicial**: marca (`h1`), navegación con las 6 rutas y sin errores de
   página/consola.
3. **Gráfico (SCR-004)**: contenedor del chart y toolbar de dibujo presentes.
4. **Navegación** entre las 6 pantallas (SCR-001…SCR-006) por la barra superior.
5. **Sin plugins**: no se requiere extensión ni runtime propietario.

## Cómo ejecutar

```bash
# Backend de datos (opcional, para ver velas): ver README del backend
cd frontend
npm run build            # 1) compilación de producción
npx vite preview         # sirve dist/ en http://localhost:4173
npm run dev              # o el servidor de desarrollo en http://localhost:5173
```

Abre la URL en cada navegador y recorre el checklist. Para el paso 4 usa la
barra superior: Biblioteca · Descarga · Abrir · Gráfico · Multigráfico ·
Exportar.

## Checklist

| #   | Comprobación                             | Chromium (Brave) | Firefox   | Edge | Safari |
| --- | ---------------------------------------- | ---------------- | --------- | ---- | ------ |
| 1   | `npm run build` sin errores              | ✅               | n/a       | n/a  | n/a    |
| 2   | `vite preview` responde 200              | ✅               | n/a       | n/a  | n/a    |
| 3   | Marca `fxtrad` + 6 enlaces de navegación | ✅               | ⬜ manual | ⬜   | ⬜     |
| 4   | Chart host + toolbar presentes (SCR-004) | ✅               | ⬜ manual | ⬜   | ⬜     |
| 5   | Las 6 rutas cargan su pantalla           | ✅               | ⬜ manual | ⬜   | ⬜     |
| 6   | 0 errores de página/consola              | ✅               | ⬜ manual | ⬜   | ⬜     |
| 7   | Sin plugins/licencias de pago            | ✅               | ✅        | ✅   | ✅     |

## Evidencia (2026-09-24)

- **Chromium (Brave headless 1.95)** — automatizado:
  - `npm run build` ✅ (94 módulos, `dist/` generado).
  - `vite preview` HTTP 200 ✅.
  - Dev server: marca ✅, 6 rutas ✅, `.chart-pane__host` ✅, `.chart-toolbar` ✅,
    las 6 rutas ✅, **0 errores** de página/consola ✅.
  - Preview (build de producción): marca ✅, 6 rutas ✅, **0 errores** ✅.
- **Firefox** — pendiente de verificación **manual** (el Firefox del sistema no
  expone el protocolo Juggler que requiere la herramienta headless ligera; no se
  añade Playwright para no introducir dependencia al MVP).
- **Edge** (Chromium) y **Safari** — verificación manual opcional (mismo motor
  Chromium / WebKit respectivamente).

## Notas

- El backend de datos de ejemplo solo contiene **EURUSD 1h**; los paneles con
  otros activos/timeframes muestran estado _empty_/error (aislado por panel), lo
  que no afecta a la carga ni a la navegación.
- Si se desea E2E automatizado **multi-navegador** (Chromium/Firefox/WebKit), se
  registraría `TECH-XXX` para Playwright con su ADR (no incluido por ahora).
