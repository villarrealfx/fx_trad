# ADR-003: Frontend en React + Vite + TypeScript

- **Fecha:** 2026-09-17
- **Estado:** Aceptado
- **Decisores:** Arquitecto
- **Requisitos vinculados:** RF-007, RF-014, RNF-005, RNF-006

## Contexto

El frontend debe renderizar gráficos de velas a 60 FPS (RNF-001), soportar hasta 3 gráficos sincronizados (RF-014) y funcionar en navegadores de escritorio modernos sin plugins ni licencias (RNF-005, RNF-006). El usuario prefiere **React/Vite**.

## Decisión

Frontend SPA en **React 18 + Vite + TypeScript**, integrando `lightweight-charts` (ADR-005). Vite como bundler/dev-server; TypeScript para garantizar el contrato de datos del backend (RNF-008).

## Alternativas consideradas

| Alternativa | Pros | Contras | Por qué se descartó |
|-------------|------|---------|---------------------|
| Vue 3 / Svelte | Ligeros y modernos | Fuera de la preferencia declarada del usuario | La restricción de stack indica React/Vite |
| Frameworks con lógica de servidor (Next/Remix) | SSR/SSG | No aporta para una app de escritorio local con datos en el navegador | Complejidad innecesaria para el MVP |

## Consecuencias

### Positivas
- Ecosistema maduro y velocidad de desarrollo (RNF-007).
- TypeScript fija el contrato OHLC en el frontend (RNF-008).
- Soporte de múltiples instancias de grafo (RF-014) con componentes independientes.

### Negativas / Trade-offs
- Bundle mayor que Svelte; mitigado con code-splitting de Vite.

### Neutras
- npm registry y toolchain abierto, sin licencias comerciales (RNF-006).

## Referencias

- `_docs/plan.md` §5 Restricciones (React/Vite)
- `_docs/requirements.md` RF-014, RNF-005, RNF-006