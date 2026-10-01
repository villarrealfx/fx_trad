# Personas — Ciclo 03 (Mejoras UX)

> Derivadas de los stakeholders de `_docs/plan.md` §4.
> Base: `_docs/iterations/01-mvp/ux/user-personas.md`.

## P-001: Andrés

- **Stakeholder origen:** Usuario único (propietario).
- **Rol:** Analista técnico (operador único; converge Admin/Dev/QA).
- **Contexto:** Usuario avanzado de mercados, desktop-first, uso diario de apps de
  trading (TradingView, brokers). Opera en su máquina local, sin autenticación ni
  multiusuario (RF-W-05 OUT).
- **Objetivo principal:** Analizar una estrategia (dibujos + indicadores +
  simulación compra/venta) sobre datos históricos confiables, con **fluidez** y
  **precisión**, sin perder la configuración al navegar entre pantallas.
- **Frustraciones:**
  - Indicadores por defecto y un panel inferior que roban espacio al gráfico.
  - Perder activo, dibujos e indicadores al cambiar de hoja y volver.
  - Precisión/escala insuficiente (eje Y, hora:minuto, área vertical).
  - Dibujos que, una vez colocados, no se pueden mover ni ajustar.
  - Cobertura de activos forex incompleta.
- **Nivel técnico:** Alto.
- **Dispositivo preferido:** Desktop (navegador moderno, RNF-005).
- **Frecuencia de uso:** Diaria.
- **Cita representativa:** "Que el gráfico se comporte como una herramienta de
  análisis, no como un formulario; y que al volver siga donde lo dejé."

## Sin persona: Mantenedor del código

- **Stakeholder origen:** Mantenedor del código (`_docs/plan.md` §4).
- **Motivo de exclusión:** No opera la interfaz; su expectativa (cambio acotado,
  sin regresiones) se traduce en restricciones técnicas (RNF-203), no en journeys.
