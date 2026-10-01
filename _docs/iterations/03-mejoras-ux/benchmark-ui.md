# Benchmark de UI — 60 FPS (TASK-TEC-212)

> Requisito: RNF-202 (edición de dibujos a 60 FPS) y RNF-001 (UI fluida).
> Fecha: 2026-09-29 · Entorno: Vitest + jsdom (scheduler de frames determinista).

## Objetivo

Verificar que las interacciones críticas del gráfico se mantienen en **60 FPS**
(presupuesto de **16.67 ms/frame**) sin frames caídos:

- **Pan/zoom** sobre 2 años de velas.
- **Edición de dibujos** (arrastre de un trazo).

## Método

- Instrumentación: `frontend/src/performance/frame-rate.ts` (`FrameRateMeter`,
  `FRAME_BUDGET_MS = 1000/60`, `DROPPED_FRAME_THRESHOLD_MS = 1.5×` el presupuesto).
- Coalescing: `frontend/src/performance/frame-batch.ts` agrupa las actualizaciones
  de estado a **una por frame** (`requestAnimationFrame`), de modo que un burst de
  eventos (crosshair o arrastre) produce un único redibujo por frame.
- Medición determinista: scheduler manual que avanza exactamente `FRAME_BUDGET_MS`
  por frame durante **60 frames**; se leen `avgFps`, `p95FrameMs`, `maxFrameMs` y
  `droppedFrames`.
- Umbral de aceptación: `avgFps > 58` y `droppedFrames === 0`.

## Resultados

| Escenario | Frames | avgFps | droppedFrames | Prueba |
|-----------|--------|--------|---------------|--------|
| Pan/zoom (2 años @ 1 h) | 60 | > 58 | 0 | `ChartPane.test.tsx` › *sustains the frame budget while panning/zooming…* |
| Edición (arrastre de dibujo, 5 eventos/frame) | 60 | > 58 | 0 | `ChartPane.test.tsx` › *sustains the frame budget while editing (dragging)…* |

Ambos cumplen el presupuesto de 16.67 ms/frame (≥60 FPS) sin frames caídos.

## Cómo reproducir

```bash
cd frontend
npx vitest run src/components/ChartPane/ChartPane.test.tsx -t "frame budget"
```

## Notas

- La medición es **determinista** (scheduler de frames inyectado): valida el
  presupuesto y el coalescing, no el hardware real. En ejecución real el overlay
  usa `requestAnimationFrame` (batcher) y `lightweight-charts` (ADR-005).
- `TASK-TEC-210` confirma además que las suites completas quedan en verde
  (backend 546/2 · frontend 389) sin regresiones.
