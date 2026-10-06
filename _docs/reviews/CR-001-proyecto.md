# CR-001 — Auditoría de solo lectura del proyecto `fxtrad`

> Fecha: 2026-10-06 · Modo: `--sdd` (forzado) · Profundidad: `standard`
> Alcance: proyecto completo (ciclo 04 cerrado + deuda heredada al ciclo 05)
> Veredicto informativo: **CHANGES_REQUESTED** (ningún CRITICAL; 6 WARNING sin waiver)

```yaml
code_audit:
  scope: proyecto
  mode: sdd
  revision: "ed7b64c"
  files_reviewed: 86
  ruleset_version: "rules-sdd v1"
  metrics:
    tests: "PASS 546/546 backend (2 skipped) + 458/458 frontend (55 archivos)"
    build: "PASS (vite build, 370.08 kB / 119.02 kB gzip)"
    coverage: "not_measured"
    line_violations: 2
    functions_over_50: 7
    max_complexity: 11
    secrets_found: 0
  findings:
    - id: WARNING-001
      dimension: contract
      file: "_docs/quality-profile.toml"
      line: 0
      severity: WARNING
      rule: "S-12 / manual §9.4 / AGENTS.md §7"
      evidence: "python3 _shared/quality_gate.py --root . --level gate -> 'ERROR: Falta el perfil de calidad. Genera _docs/quality-profile.toml (lo produce /sdd-stack) o ejecuta con --defaults.' (exit 3). El perfil no existe en el repo (`find` no lo encuentra) ni se cita su salida en `_docs/status.md` ni en ningún AUDIT LOG."
      issue: "El gate de calidad del sistema SDD no puede ejecutarse con la política del proyecto: sin `_docs/quality-profile.toml` no hay umbrales, niveles `gate/review/off`, `language.allow_terms` ni waivers. El contrato de cierre exige ejecutar el gate con el perfil del proyecto y pegar su salida antes de ✅ Done; no hay evidencia de que se hiciera en ninguna de las 20 tareas del ciclo 04."
      recommendation: "Ejecutar `/sdd-stack` para generar `_docs/quality-profile.toml` (thresholds, `language.allow_terms` con los sustantivos de dominio, nivel de cada Q-XX y waivers justificados), registrar la salida del gate en el AUDIT LOG y volver a auditar con `--delta`."
      blocks_release: true
    - id: WARNING-002
      dimension: contract
      file: "_docs/git-profile.toml"
      line: 0
      severity: WARNING
      rule: "S-12 / AGENTS.md (Control de versiones, ADR-006)"
      evidence: "El artefacto `_docs/git-profile.toml` declarado en AGENTS.md (tabla de artefactos) no existe; solo hay `backend/pyproject.toml` como TOML en el repo. La política de ramas/commits/push solo vive en prosa en AGENTS.md y ADR-006."
      issue: "Falta el perfil de control de versiones que la convención SDD exige como fuente de verdad; no es verificable mecánicamente el modelo de ramas, el formato de commit ni la prohibición de push automático."
      recommendation: "Generar `_docs/git-profile.toml` con `/sdd-stack` (o declararlo explícitamente como fuera de alcance en ADR-006) y enlazarlo desde `_docs/architecture.md`."
      blocks_release: false
    - id: WARNING-003
      dimension: contract
      file: "_docs/architecture.md"
      line: 3
      severity: WARNING
      rule: "S-12"
      evidence: "`_docs/plan.md` no existe en la raíz (archivado en `iterations/04-…/plan.md`), pero se referencia en `_docs/architecture.md:3` y en las 25 fichas ADR (p. ej. `ADR-001:39`, `ADR-005:43`, `ADR-010:73`, `ADR-022:93`, `ADR-025:93`): >12 referencias directas a `_docs/plan.md` §N."
      issue: "Referencias colgantes: el documento vigente de arquitectura y todo el cuerpo de ADRs apuntan a un `_docs/plan.md` que ya no está en la raíz. `_docs/status.md` §6 lo reconoce como advertencia («El ciclo 05 no tiene plan.md»), pero la deriva no se corrigió."
      recommendation: "Regenerar `_docs/plan.md` para el ciclo 05 (o restaurar el del ciclo 04 en la raíz) antes de cualquier nueva iteración; mientras no exista, las citas `plan.md §N` no son verificables."
      blocks_release: false
    - id: WARNING-004
      dimension: maintainability
      file: "backend/src/fxtrad/ingest/tasks.py"
      line: 164
      severity: WARNING
      rule: "S-11 / Q-LIM-01, Q-LIM-02, Q-LIM-03"
      evidence: "quality_gate.py --defaults: 40 incumplimientos de nivel `gate`; entre ellos 7 funciones >50 líneas (`run_download_range` 110, `resume_download` 85, `resample_ohlc` 91, `persist` 65, `clean_candles` 58, `plan_blocks` 56, `compute_indicators` 55), complejidad 11 en `clean.py:91` y `normalize.py:36` (límite 10), y 2 líneas de 106 caracteres (`test_base_timeframe_regression.py:49`, `test_utc_ohlc.py:47`)."
      issue: "La deuda de límites duros del manual §9.3 es previa al ciclo 04 y no está ni corregida ni declarada: con la política por defecto todas estas reglas son `gate` y bloquearían. Sin `quality-profile.toml` no hay waiver que las ampare."
      recommendation: "Declarar en el perfil las reglas que el proyecto considera `review` con justificación, o refactorizar las funciones de ingest/pipeline y las dos líneas largas. Crear `TECH-XXX` para lo que no se aborde ya (no se crean aquí)."
      blocks_release: true
    - id: WARNING-005
      dimension: contract
      file: "backend/src/fxtrad/storage/metadata.py"
      line: 131
      severity: WARNING
      rule: "S-09 / _docs/logging-contract.md §Reglas"
      evidence: "`logger.info(\"metadatos_descarga_guardados\", activo=record.activo, inicio=record.inicio, fin=record.fin, estado=record.estado, filas=record.filas)` (metadata.py:131-138); `logger.warning(\"imputacion_aplicada\", filas_afectadas=filled)` (clean.py:147); eventos en español (`serie_consultada`, `descarga_persistida_sin_datos`). El contrato dice «Nombres de campo en inglés» (logging-contract.md:32) mientras sus propios ejemplos usan campos en español (`activo`, `filas`, logging-contract.md:54-61): el contrato se contradice."
      issue: "El contrato de logging es incoherente consigo mismo y el código sigue la versión en español. `correlation_id` sí se propaga (app.py:67-75, logging_config.py:104-106) y no hay `print` en `src/`."
      recommendation: "Decidir una convención (mantener dominio en español vía `language.allow_terms` y renombrar eventos a inglés, o corregir logging-contract.md) y alinear código y contrato en el mismo commit."
      blocks_release: false
    - id: WARNING-006
      dimension: security
      file: "backend/src/fxtrad/storage/series.py"
      line: 321
      severity: WARNING
      rule: "Q-SEC-04"
      evidence: "6 marcas `Q-SEC-04` del gate (metadata.py:154,172; series.py:271,321,329; tests/pipeline/test_schema.py:50). Auditoría manual: todas interpolan constantes internas (`_COLUMNS`, `_CREATE_TABLE`) o el número de placeholders (`series.py:321`), y los valores van siempre parametrizados (`connection.execute(query, params)`). Ninguna interpola entrada de usuario; `COPY … TO '{tmp_path}'` (series.py:306) usa un `Path` interno."
      issue: "Incumplimiento literal de «SQL siempre parametrizado, nunca f-string» según el heurístico del gate, sin explotabilidad demostrada. Al ser `gate` por defecto, bloquea el cierre aunque el riesgo real sea nulo."
      recommendation: "Añadir un pragma `# quality:ignore=Q-SEC-04` justificado en cada sitio (el catálogo lo soporta) o declarar la regla como `review` en el perfil; no requiere refactor de SQL."
      blocks_release: false
  waivers: []
  verdict: CHANGES_REQUESTED
  next_action: "Generar `_docs/quality-profile.toml` (y `_docs/git-profile.toml`) con /sdd-stack, restaurar `_docs/plan.md`, alinear el contrato de logging y resolver/waivear los límites duros de ingest/pipeline; después re-auditar con `/sdd-audit --sdd --delta`."
```

## Resumen (5 líneas)

1. **El código está sano y sus gates reales pasan**: backend 546 tests + 2 skipped, frontend 458 tests en 55 archivos, ruff/black/mypy, eslint/tsc/prettier y build de producción en verde, con el árbol limpio en `ed7b64c`.
2. **Seguridad y arquitectura sin hallazgos**: 0 secretos embebidos, 0 `eval`/`exec`/`os.system`/`shell=True`, capa de persistencia intacta (ningún módulo fuera de `storage/` importa `duckdb` ni contiene SQL → S-01 cumplido) y `_docs/` coherente con los ADR-001…025 vigentes.
3. **El bloqueo es de contrato SDD**: falta `_docs/quality-profile.toml` (el gate devuelve exit 3 «Falta el perfil») y `_docs/git-profile.toml`, y `_docs/plan.md` —referenciado por `architecture.md:3` y las 25 ADRs— no existe en la raíz: 3 WARNING `S-12`.
4. **Deuda medible heredada**: 40 incumplimientos de nivel `gate` con la política por defecto (7 funciones >50 líneas, complejidad 11 ×2, 2 líneas >100) más la incoherencia del contrato de logging (campos en español, `logging-contract.md:32` vs `:54`); sin perfil no hay waiver que las cubra.
5. **Cobertura `not_measured`**: `pytest-cov` no está instalado y el perfil que fijaría el umbral no existe; el frontend sí tiene `@vitest/coverage-v8` pero sin umbral declarado — nunca se reporta como PASS.

## Evidencia cruda de los gates (FASE 2)

```
$ python3 /home/carlos/.dsh/skills/_shared/quality_gate.py --root . --level gate
ERROR: Falta el perfil de calidad. Genera _docs/quality-profile.toml (lo produce /sdd-stack) o ejecuta con --defaults.

$ python3 /home/carlos/.dsh/skills/_shared/quality_gate.py --root . --defaults
Verificador de calidad SDD · perfil: (por defecto)
  archivos=86  líneas=12527  funciones=818  max_complejidad=11
  gates incumplidos: 40 · waivers: 0 · no medibles: 0
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_download.py:51  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_download.py:55  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_download.py:56  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_download.py:57  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_download.py:58  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_download.py:59  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_download.py:60  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_download.py:61  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_download.py:63  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_download.py:65  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_parquet.py:95  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_parquet.py:96  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_parquet.py:97  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_parquet.py:101  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_parquet.py:102  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_parquet.py:103  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_parquet.py:104  print en lógica
  [GATE  ] Q-LOG-01    backend/scripts/benchmark_parquet.py:109  print en lógica
  [GATE  ] Q-LANG-01   backend/src/fxtrad/ingest/batches.py:47  Identificador 'total_blocks' con términos en español: ['total']
  [GATE  ] Q-LIM-02    backend/src/fxtrad/ingest/benchmark.py:52  Función 'benchmark_download' de 51 líneas (límite 50)
  [GATE  ] Q-LIM-02    backend/src/fxtrad/ingest/planner.py:110  Función 'plan_blocks' de 56 líneas (límite 50)
  [GATE  ] Q-LIM-02    backend/src/fxtrad/ingest/tasks.py:164  Función 'run_download_range' de 110 líneas (límite 50)
  [GATE  ] Q-LIM-02    backend/src/fxtrad/ingest/tasks.py:276  Función 'resume_download' de 85 líneas (límite 50)
  [GATE  ] Q-LIM-02    backend/src/fxtrad/pipeline/clean.py:91  Función 'clean_candles' de 58 líneas (límite 50)
  [GATE  ] Q-LIM-03    backend/src/fxtrad/pipeline/clean.py:91  Función 'clean_candles' con complejidad 11 (límite 10)
  [GATE  ] Q-LIM-02    backend/src/fxtrad/pipeline/indicators.py:169  Función 'compute_indicators' de 55 líneas (límite 50)
  [GATE  ] Q-LIM-03    backend/src/fxtrad/pipeline/normalize.py:36  Función 'normalize_time' con complejidad 11 (límite 10)
  [GATE  ] Q-LIM-02    backend/src/fxtrad/pipeline/persist.py:77  Función 'persist' de 65 líneas (límite 50)
  [GATE  ] Q-LIM-02    backend/src/fxtrad/pipeline/resample.py:73  Función 'resample_ohlc' de 91 líneas (límite 50)
  [GATE  ] Q-SEC-04    backend/src/fxtrad/storage/metadata.py:154  SQL construido por f-string o concatenación
  [GATE  ] Q-SEC-04    backend/src/fxtrad/storage/metadata.py:172  SQL construido por f-string o concatenación
  [GATE  ] Q-SEC-04    backend/src/fxtrad/storage/series.py:271  SQL construido por f-string o concatenación
  [GATE  ] Q-SEC-04    backend/src/fxtrad/storage/series.py:321  SQL construido por f-string o concatenación
  [GATE  ] Q-SEC-04    backend/src/fxtrad/storage/series.py:329  SQL construido por f-string o concatenación
  [GATE  ] Q-LANG-01   backend/tests/api/test_download_status.py:69  Identificador 'test_estado_comes_from_the_query' con términos en español: ['estado']
  [GATE  ] Q-LANG-01   backend/tests/ingest/test_batches.py:88  Identificador 'test_each_batch_reports_its_total_blocks' con términos en español: ['total']
  [GATE  ] Q-LANG-01   backend/tests/ingest/test_batches.py:95  Identificador 'test_two_years_total_blocks_matches_calendar_estimate' con términos en español: ['total']
  [REVIEW] Q-STR-03    backend/tests/ingest/test_catalog.py:72  marca pendiente sin resolver
  [GATE  ] Q-SEC-04    backend/tests/pipeline/test_schema.py:50  SQL construido por f-string o concatenación
  [GATE  ] Q-LIM-01    backend/tests/test_base_timeframe_regression.py:49  Línea de 106 caracteres (límite 100)
  [GATE  ] Q-LIM-01    backend/tests/test_utc_ohlc.py:47  Línea de 106 caracteres (límite 100)
VEREDICTO: FAIL
```

Gates del proyecto (§9.4), ejecutados con los entornos locales (el `uv run` del Makefile no
pudo usarse por caché de solo lectura; se invocó el `.venv` del repo, mismos binarios):

```
$ backend/.venv/bin/python -m pytest           -> 546 passed, 2 skipped in 39.26s
$ frontend: npm test                           -> Test Files 55 passed · Tests 458 passed
$ backend/.venv/bin/ruff check .               -> All checks passed!
$ backend/.venv/bin/black --check .            -> 86 files would be left unchanged.
$ backend/.venv/bin/mypy src                   -> Success: no issues found in 40 source files
$ frontend: npm run lint                       -> eslint . --max-warnings=0 (sin salida)
$ frontend: npm run typecheck                  -> tsc --noEmit && tsc -p tsconfig.node.json (sin errores)
$ frontend: npm run format:check               -> All matched files use Prettier code style!
$ frontend: npm run build                      -> ✓ built in 2.65s (index-DjxK23gX.js 370.08 kB / 119.02 kB gzip)
```

## Detalle por dimensión

| Dimensión | Resultado | Evidencia clave |
|---|---|---|
| Seguridad | 0 CRITICAL · 1 WARNING (Q-SEC-04, no explotable) | 0 secretos rastreados ni en disco; sin `eval`/`exec`/`os.system`/`shell=True` en `src/`; `.env*` en `.gitignore:192-195` |
| Arquitectura | Sin hallazgos | S-01 verificado: ningún módulo fuera de `storage/` importa `duckdb`/`sqlite3` ni contiene SQL; `charting/operation-geometry.ts` existe y está justificado en `architecture.md` §4 |
| Mantenibilidad | 1 WARNING | 7 funciones >50 líneas, complejidad máx. 11, 2 líneas >100; 40 incumplimientos `gate` con la política por defecto |
| Contrato SDD | 4 WARNING | `quality-profile.toml` y `git-profile.toml` ausentes; `plan.md` colgante; inconsistencia del contrato de logging |
| Razonabilidad | Sin hallazgos con evidencia | Sin plan vigente contra el que medir scope creep (`Q-JUD-04`); la caché Karst (ADR-007) está justificada por RNF-001/002 y la geometría de la operación por RX-301 |

### INFO (no bloquean, documentados por rigor)

- **INFO-001 — falsos positivos del heurístico del gate** (no son hallazgos de código):
  `Q-LOG-01` marca 18 `print` que están dentro de `main()` en `backend/scripts/benchmark_*.py`
  (el propio catálogo lo permite como contrato de salida del CLI); `Q-SEC-04` marca f-strings
  que interpolan `_COLUMNS`/`_CREATE_TABLE`/nº de placeholders
  (`quality_checks.py:32`); `Q-LANG-01` marca `total`, que está en `SPANISH_WORDS`
  (`quality_checks.py:26`) siendo palabra inglesa; `Q-STR-03` marca el literal `"XXX"` de
  `test_catalog.py:72` (`quality_checks.py:38`). Recomendación: pragmas `# quality:ignore=`
  justificados o nivel `review`/waiver en el perfil.
- **INFO-002 — trazabilidad delegada**: `_docs/traceability.md` marca 19 requisitos 🟢 sin
  columna de prueba; la matriz completa (requisito → tarea → prueba) vive en
  `_docs/iterations/04-dibujo-referencia-operacion/traceability.md` y está referenciada. La
  indirección es verificable, pero el artefacto vigente de la raíz no es autocontenido (S-07).
- **INFO-003 — verificabilidad del entorno**: `make ci` no se puede ejecutar tal cual en este
  host (`uv` no puede crear su caché en un FS de solo lectura); conviene documentar
  `UV_CACHE_DIR` o un target alternativo para que la réplica local del pipeline no dependa del
  estado global del usuario.
