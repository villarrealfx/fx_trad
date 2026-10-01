# ADR-005: Gráficos con lightweight-charts + overlay propio de dibujos

- **Fecha:** 2026-09-17
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RF-010, RF-011, RF-012, RF-013, RF-014, RF-015, RNF-001, RNF-002, RNF-008

## Contexto

La librería de gráficos fija el **contrato de datos** que el pipeline debe producir (RNF-008) y el motor de renderizado (RNF-001, 60 FPS sobre ~18M filas, RNF-002). P-4 del handoff pedía elegirla explícitamente. Restricciones: navegadores desktop modernos (RNF-005), $0 (RNF-006), aplicación estilo TradingView.

## Decisión

Usar **`lightweight-charts` v4** (open-source, MIT, $0 = RNF-006) para velas japonesas con zoom/pan e indicadores (RF-010, RF-013). Los **dibujos** (líneas, rectángulos, Fibonacci y simulador compra/venta: RF-011, RF-012) se implementan como un **overlay canvas propio** sincronizado con los ejes de la librería, en un lienzo separado reutilizable para el export PNG (RF-015).

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| ECharts | Candlestick + dataZoom out-of-the-box | Contrato genérico (no financiero), peso mayor, rendimiento inferior a 18M filas | No garantiza RNF-001/RNF-008 |
| D3.js / Vega-Lite | Flexibilidad total | Requiere downsampling propio (LTTB) y construir zoom/pan/dibujos a mano | Riesgo alto para RNF-007 |
| Canvas/WebGL a medida | Control absoluto del contrato (RNF-008) | Costo de desarrollo de velas+zoom+pan+dibujos+indicadores en 2 semanas | Inviable para RNF-007 |

*Nota: es la solución a P-4 del handoff.*

## Consecuencias

### Positivas
- Contrato OHLC nativo alineado con el esquema del pipeline (RNF-008, R-005 mitigado).
- Rendimiento canvas optimizado para series financieras (RNF-001).
- Overlay separado permite exportar PNG limpio (RF-015) y mantener dibujos efímeros (RI-003: no se persisten).

### Negativas / Trade-offs
- Dibujos y marcadores del simulador son implementación propia (esfuerzo no trivial sobre RNF-007).
- Indicadores avanzados futuros requieren desarrollo sobre primitivas de la librería.

### Neutras
- Lienzo overlay y lienzo de velas comparten coordenadas precio/tiempo; se sincronizan vía callbacks de la librería.

## Referencias

- `_docs/session-handoff.md` P-4 (resuelta en esta sesión)
- `_docs/plan.md` §7 R-005
- `_docs/requirements.md` RF-010…RF-015, RNF-001, RNF-008