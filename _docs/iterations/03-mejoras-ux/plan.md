# Plan del Proyecto: Mejoras UX (Ciclo 03)

**Iteración:** 03 — `mejoras-ux`
**Estado:** Ejecutado — ciclo cerrado el 29 de septiembre de 2026 (35/35 tareas ✅)
**Fecha:** 29 de septiembre de 2026
**Precede:** `_docs/iterations/02-optimizacion-descarga/`
**Insumo:** `_docs/iterations/03-mejoras-ux/spec-insumo.md`

## 1. Contexto y justificación

Los ciclos 01 (MVP) y 02 (descarga + base 1 m) dejaron la plataforma operativa
de punta a punta. El siguiente cuello de botella ya no es de datos sino de
**experiencia de análisis**: el usuario único no logra analizar con fluidez.

Problemas confirmados en sesión:

1. **Ruido de indicadores:** se cargan indicadores por defecto y un panel
   inferior permanente roba espacio vertical al gráfico.
2. **Pérdida de contexto:** al cambiar de hoja y volver a Gráfico se pierde la
   última configuración (activo, dibujos, indicadores).
3. **Escala y precisión insuficientes:** eje Y sin 5 decimales, eje X sin
   hora:minuto, área vertical limitada.
4. **Dibujos rígidos:** una vez colocados no admiten ajustes (hoy solo crear y
   borrar).
5. **Cobertura de activos incompleta:** faltan pares forex habituales y la
   pantalla Abrir aún referencia el timeframe obsoleto de 1 s (deuda del ciclo 02).

**Por qué ahora:** sin fluidez de análisis el producto no cumple su propósito,
aunque los datos ya sean correctos. El orden de prioridad del insumo manda
(Gráfico → Descarga → Abrir).

## 2. Objetivos

### Objetivo general

Mejorar la experiencia de usuario de las pantallas **Gráfico**, **Descarga** y
**Abrir**, haciendo el análisis de activos más fluido y preciso, ampliando la
cobertura de activos y saldando la deuda del timeframe de 1 s.

### Objetivos específicos (SMART)

- **OE-1:** Implementar el 100% de los ítems del insumo, en su orden de prioridad.
- **OE-2:** Hacer que la configuración del gráfico persista en el navegador y
  sobreviva a la recarga.
- **OE-3:** Habilitar edición de dibujos (mover y redimensionar) manteniendo
  60 FPS.
- **OE-4:** Ampliar la lista forex con 5 pares nuevos operativos de punta a punta.
- **OE-5:** Retirar `"1s"` del contrato `Timeframe` (API + espejo TS) y de la UI.
- **OE-6:** Exponer `GET /assets` como fuente única del catálogo y eliminar el
  espejo del frontend.

### KPIs

| KPI | Métrica | Meta | Frecuencia |
|-----|---------|------|------------|
| KPI-201 | Ítems del insumo implementados | 100% | Al cierre |
| KPI-202 | Pantallas aprobadas visualmente por el usuario | 3/3 (Gráfico, Descarga, Abrir) | Al cierre |
| KPI-203 | Regresiones en suites existentes | 0 (backend/frontend en verde) | Por commit |
| KPI-204 | Configuración persistida tras recarga | 100% de escenarios | Al cierre |
| KPI-205 | Activos nuevos descargables end-to-end | 5/5 | Al cierre |

## 3. Alcance

### 3.1 Dentro del alcance (IN)

**Gráfico**
1. Indicadores existentes (RSI, ATR, MM) **sin carga por defecto**; se agregan a
   petición.
2. Eliminar el panel inferior de indicadores; ampliar el área del gráfico a
   pantalla completa horizontal y vertical.
3. Botón de indicadores en el header que abre un **formulario flotante** con la
   lista de indicadores agregados (mostrar/ocultar, configurar, eliminar) y botón
   de cierre que libera el espacio; los indicadores persisten al cerrar.
4. Mantener la última configuración del gráfico (activo, dibujos, indicadores)
   al cambiar de hoja y volver, **persistida en el navegador**.
5. Mover el botón de exportar al header del gráfico, junto al de indicadores.
6. Eje X con fecha + hora:minuto según la apertura de la vela.
7. Eje Y con precisión de 5 decimales.
8. Marcas de compra/venta: triángulo a 10 pips por debajo del mínimo (compra) /
   por encima del máximo (venta), sin solapar la vela de referencia.
9. Colores mate por tipo de dibujo (línea `#4A6572`, rectángulo `#D6C7AE`,
   Fibonacci `#DDB2AC`).
10. `Shift` para restringir líneas a horizontal/vertical.
11. Íconos representativos donde aplique.
12. **Edición de dibujos colocados:** mover y redimensionar/ajustar extremos
    (además de borrar).

**Descarga**

13. Centrar horizontalmente el formulario y la tabla del historial.
14. Incluir el activo en la tabla del historial.
15. Ampliar la lista forex con: GBPJPY, EURJPY, AUDUSD, USDCAD, EURGBP.
16. Ajustes de backend para que los nuevos activos se procesen end-to-end.

**Abrir**

17. Centrar horizontalmente el formulario.
18. Eliminar toda referencia al timeframe de 1 s y sustituirla por 1 m.

**Integración/plataforma**

19. Implementar `GET /assets` y eliminar el espejo de catálogo del frontend.

### 3.2 Fuera del alcance (OUT)

- Deshacer/rehacer de dibujos (salvo que `/sdd-stack` lo declare trivial).
- Persistir dibujos/configuración en backend o compartirlos entre dispositivos.
- Nuevos **tipos** de indicadores (MACD, Bandas de Bollinger, etc.).
- Guardar/exportar estrategias o dibujos como archivos (solo export de imagen).
- Multiusuario, autenticación y roles.
- Tiempo real, backtesting y trading en vivo.
- Fuentes de datos distintas de Dukascopy.

## 4. Stakeholders

| Rol | Interés | Influencia | Expectativa |
|-----|---------|------------|-------------|
| Usuario único (propietario) | Analizar activos con fluidez y precisión | Alta | UI ágil, config que no se pierde, dibujos editables, más activos |
| Mantenedor del código | Cambio acotado, sin regresiones | Alta | Respetar arquitectura y suites existentes |

## 5. Restricciones

| Tipo | Descripción | Origen |
|------|-------------|--------|
| Almacenamiento | Persistencia sujeta a cuota de `localStorage`/IndexedDB | Plataforma (navegador) |
| Librería | La edición de dibujos depende de `lightweight-charts` + capa de dibujo actual | ADR-005 |
| Contrato | Retirar `"1s"` exige sincronizar contrato API y espejo TypeScript | Ciclo 02 |
| Fuente | Los pares nuevos dependen de Dukascopy a 1 m BID | RX-201 |
| Costo | $0 (solo OSS) | RNF-006 (01-mvp) |
| Plazo | 2 semanas (negociable) | RNF-007 (01-mvp) |

## 6. Supuestos

- **S-1:** Dukascopy sirve los 5 pares nuevos con OHLC 1 m BID.
- **S-2:** `lightweight-charts` + la capa de dibujo actual permiten mover/redimensionar sin reescribir la librería.
- **S-3:** El almacenamiento del navegador basta para la configuración; no se requiere backend.
- **S-4:** Retirar `"1s"` no rompe más consumidores que la UI ya identificada.
- **S-5:** Los activos nuevos reutilizan el pipeline de descarga/integridad del ciclo 02 sin cambios estructurales.

## 7. Riesgos

| ID | Descripción | Prob. | Impacto | Exposición | Mitigación |
|----|-------------|-------|---------|------------|------------|
| R-201 | Dukascopy no sirve algún par nuevo o su `instrument_id` difiere | M | M | M×M | Verificar cada par; excluir solo el no soportado |
| R-202 | Editar/redimensionar dibujos exige reescribir la capa de dibujo | M | A | M×A | *Spike* temprano en `/sdd-stack` |
| R-203 | El esquema de configuración se corrompe entre versiones | B | M | B×M | Versionar el esquema de persistencia |
| R-204 | Retirar `"1s"` rompe contrato API, espejo TS y tests | M | A | M×A | Cambio coordinado backend+frontend + tests |
| R-205 | El volumen de mejoras UI excede 2 semanas | M | M | M×M | Respetar el orden de prioridad del insumo |
| R-206 | Clave dibujos↔activo/timeframe ambigua al persistir | M | B | M×B | Definir clave activo+timeframe (RI-201) |

## 8. Matriz de navegación por rol

| Rol | Documentos que debe leer | Frecuencia |
|-----|--------------------------|------------|
| Usuario (sponsor) | plan.md | Al inicio y cierre de iteración |
| Arquitecto | plan.md, requirements.md, ADR nuevos | Continuo |
| Dev | requirements.md, backlog.md, ADR nuevos | Diario |
| QA | requirements.md, traceability.md | Continuo |
