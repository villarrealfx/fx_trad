# Personas

> Derivadas de los stakeholders definidos en `plan.md`.
> Único stakeholder que opera la interfaz: **Usuario único (tú)** (`_docs/plan.md` §4).

## P-001: Andrés

- **Stakeholder origen:** Usuario único (tú)
- **Rol:** Analista técnico (operador único; convergen roles de Admin/Dev/QA)
- **Contexto:** Usuario avanzado de mercados, desktop-first, con uso diario de apps de trading (TradingView, brokers). Opera desde su propia máquina local, sin autenticación ni multiusuario (RF-W-05 OUT).
- **Objetivo principal:** Validar visualmente una estrategia (dibujo + indicador + simulación compra/venta) sobre datos históricos confiables, idealmente en < 2 min desde que abre la app.
- **Frustraciones:**
  - Datos sucios/gaps rompen el análisis (espera datos limpios y sin duplicados).
  - Pan/zoom con latencia rompe el análisis de series largas (2 años @ 1s).
  - Apps que obligan a persistir dibujos/complejidad innecesaria.
- **Nivel técnico:** Alto
- **Dispositivo preferido:** Desktop (navegador moderno, RNF-005)
- **Frecuencia de uso:** Diaria (durante análisis de sesión)
- **Cita representativa:** "Necesito ver una estrategia en el gráfico y exportar la captura; no quiero un CRM."

## Sin persona: Promotor / Ticket de dinero

- **Stakeholder origen:** Promotor / Ticket de dinero (`_docs/plan.md` §4)
- **Motivo de exclusión:** No opera la interfaz; su expectativa (costo $0, RNF-006) se traduce en restricción de stack visual (fuentes open-source, sin SaaS), no en journeys.