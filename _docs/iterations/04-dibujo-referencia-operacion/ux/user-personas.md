# Personas — Ciclo 04 (Dibujo Referencia de Operación)

> Derivadas de los stakeholders de `_docs/plan.md` §4.
> Base: `_docs/iterations/03-mejoras-ux/ux/user-personas.md`.
> **Sin personas nuevas** en este ciclo: el stakeholder set no cambió.

## P-001: Andrés

- **Stakeholder origen:** Usuario único (trader/analista) — `_docs/plan.md` §4.
- **Rol:** Analista técnico (operador único; converge Admin/Dev/QA). Sin autenticación ni
  multiusuario (`RF-W-05` OUT).
- **Contexto:** Usuario avanzado de mercados, desktop-first, uso diario de apps de trading
  (TradingView, brokers). Opera en su máquina local. El **propósito del proyecto desde el
  ciclo 04 es el backtesting manual** (`plan.md` §1.1): probar una estrategia anotando
  operaciones sobre el precio histórico.
- **Objetivo principal:** **Anotar operaciones de trading** —Entrada, SL y objetivos— sobre
  el gráfico, con los precios calculados automáticamente, y **leer el desenlace** de cada
  una comparando el precio con las líneas marcadas. Reutiliza las capas existentes
  (gráfico, indicadores, dibujos) sin aprender una herramienta nueva de cero.
- **Frustraciones** (de `plan.md` §1.2, las cuatro siguen abiertas al cierre del ciclo):
  1. **Calcula a mano:** el retroceso de Fibonacci no significa nada operable; debe calcular
     dónde va el SL, dónde entra y qué precio corresponde a 1.382R / 1.5R / 2R en cada activo,
     con el pip distinto según sea JPY o no.
  2. **No puede leer el desenlace:** sin niveles marcados no hay forma de responder
     "¿tocó el SL?" o "¿alcanzó el TP?" sin reconstruirlo mentalmente sobre el gráfico.
  3. **No hay series:** probar una estrategia exige varias operaciones; hoy cada dibujo
     queda suelto y sin relación — **fuera de alcance** (`RF-W-301`), se registra como deuda.
  4. ~~Se pierde el trabajo~~: **resuelto en el ciclo 03** (RF-204, persistencia por
     activo+timeframe); este ciclo la amplía a la nueva figura (`RNF-304`).
- **Nivel técnico:** Alto.
- **Dispositivo preferido:** Desktop, navegador moderno, **con ratón** (RNF-005; táctil OUT
  en `RF-W-307`).
- **Frecuencia de uso:** Diaria.
- **Cita representativa:** "Dame la operación con los precios ya puestos, y que se lea de
  un vistazo si se cumplió o la invalidó."

### Necesidades de UX derivadas (contrato de este ciclo)

| Necesidad | Requisito | Cómo la cubre la UX |
|-----------|-----------|---------------------|
| No calcular nada a mano | RF-303, RF-305 | 5 niveles con precio derivado de las dos anclas |
| Saber en qué sentido está la operación sin pedirlo | RF-302 | Dirección automática; el preview muestra los TP al lado correcto |
| Leer el desenlace sobre el gráfico | RF-312 | Niveles visibles de extremo a extremo; el precio los cruza |
| No perder el trabajo | RF-311, RNF-304 | Persistida por activo+timeframe; ampliación aditiva sin descarte |
| No romper lo que ya sabe usar | RNF-303 | La operación **convive** con línea, rectángulo, Fibonacci y marcas |

## Sin persona: Mantenedor del código

- **Stakeholder origen:** Mantenedor del código — `_docs/plan.md` §4.
- **Motivo de exclusión (heredado del ciclo 03):** No opera la interfaz; su expectativa
  (cambio acotado, sin regresiones) se traduce en restricciones técnicas
  (`RNF-303`, OE-2, OE-3), no en journeys.

## Cobertura de stakeholders

| Stakeholder (`plan.md` §4) | Persona | ¿Journey en este ciclo? |
|---------------------------|---------|------------------------|
| Usuario único (trader/analista) | P-001 | Sí — J-008, J-009, J-010 (+J-003, J-005 extendidas) |
| Mantenedor del código | — (excluida por diseño) | No; se traduce en RNF-303 |

✅ Toda persona deriva de un stakeholder declarado. Ninguna inventada.