# CR-002 — Auditoría delta (`--delta`) del proyecto `fxtrad`

> Fecha: 2026-10-06 · Modo: `--sdd` (forzado) · Profundidad: `standard` · Alcance: **delta** desde `CR-001`
> Base comparada: `CR-001-proyecto.md` (revisión `ed7b64c`, árbol limpio)
> Delta: 4 artefactos nuevos/modificados, **0 líneas de código**
> Veredicto informativo: **CHANGES_REQUESTED** (0 CRITICAL; 4 WARNING, 1 de ellos nuevo)

```yaml
code_audit:
  scope: proyecto (delta)
  mode: sdd
  revision: "ed7b64c + árbol de trabajo sin commitear (delta documental)"
  files_reviewed: 5
  ruleset_version: "rules-sdd v1"
  metrics:
    tests: "PASS 546/546 backend (2 skipped) + 458/458 frontend (55 archivos)"
    build: "PASS (vite build, 2.29 s, 370.08 kB / 119.02 kB gzip)"
    coverage: "not_measured"
    line_violations: 2
    functions_over_50: 8
    max_complexity: 11
    secrets_found: 0
  findings:
    - id: WARNING-001
      dimension: contract
      file: "_docs/quality-profile.toml"
      line: 57
      severity: WARNING
      rule: "S-12 / quality-rules.md §Reglas de uso 3"
      evidence: "Dos motivos de waiver no superan la verificación. (a) `Q-LOG-01:backend/scripts/benchmark_parquet.py` dice «print dentro de main()», pero `main()` ocupa las líneas 114-126 y los 8 `print` están en `_run()` (líneas 95-109; único llamador `_run` en `benchmark_parquet.py:126`). (b) `Q-SEC-04:backend/tests/pipeline/test_schema.py` dice «interpola constantes internas», pero interpola el parámetro `path` en `f\"DESCRIBE SELECT * FROM read_parquet('{path}')\"` (test_schema.py:50), invocado con `tmp_path / \"EURUSD.1m.parquet\"` (test_schema.py:83); es una fixture, no una constante."
      issue: "El perfil registra 6 waivers; dos alegan un motivo que la evidencia desmiente. El efecto (silenciar el hallazgo) puede seguir siendo correcto —los prints son la salida del benchmark y la ruta es una fixture de test—, pero el motivo es lo que hace auditable un waiver: sin él, la excepción es indistinguible de un falso verde."
      recommendation: "Corregir los dos motivos en `_docs/quality-profile.toml` (mantener el waiver): `benchmark_parquet.py` → «los prints son el informe del benchmark, invocado solo desde `main()`»; `test_schema.py` → «interpola una ruta de fixture (`tmp_path`), no entrada de usuario». Lo decide el humano; la auditoría no edita artefactos."
      blocks_release: true
    - id: WARNING-002
      dimension: contract
      file: "_docs/architecture.md"
      line: 3
      severity: WARNING
      rule: "S-12"
      evidence: "`_docs/plan.md` sigue sin existir en la raíz (`ls _docs/plan.md` → no such file), pero se cita en `architecture.md:3` y en las 25 ADRs (`ADR-001:39`, `ADR-005:43`, `ADR-010:73`, `ADR-022:93`, `ADR-025:93`). Persiste sin cambios desde `CR-001` WARNING-003; el delta no lo toca."
      issue: "Referencias colgantes del documento de arquitectura vigente y de todo el cuerpo de ADRs a un plan que no está en la raíz."
      recommendation: "Restaurar `_docs/plan.md` del archivo del ciclo 04 o regenerarlo para el ciclo 05 con `/sdd-brainstorm`; hasta entonces las citas `plan.md §N` no son verificables."
      blocks_release: false
    - id: WARNING-003
      dimension: maintainability
      file: "backend/src/fxtrad/ingest/tasks.py"
      line: 164
      severity: WARNING
      rule: "S-11 / Q-LIM-01, Q-LIM-02, Q-LIM-03, Q-LIM-05"
      evidence: "`quality_gate.py --level all` con el perfil del proyecto: 15 hallazgos `REVIEW`, de los que 14 son límites — 8 funciones >50 líneas (`run_download_range` 110, `resample_ohlc` 91, `resume_download` 85, `persist` 65, `clean_candles` 58, `plan_blocks` 56, `compute_indicators` 55, `benchmark_download` 51), complejidad 11 en `clean.py:91` y `normalize.py:36`, 2 líneas de 106 (`test_base_timeframe_regression.py:49`, `test_utc_ohlc.py:47`) y 2 archivos >500 (`ChartPane.tsx` 874, `ChartPane.test.tsx` 1243). **Corrección de CR-001:** eran 8 funciones >50, no 7 (`benchmark_download` no se contó en el resumen)."
      issue: "La deuda de límites sigue intacta; el perfil la declaró `review`, de modo que ya no bloquea el gate, pero el juicio de la auditoría es que sigue siendo riesgo de mantenibilidad (la función de 110 líneas concentra planificación, reintentos y persistencia)."
      recommendation: "Promover `TECH-XXX` en el backlog para partir `run_download_range`/`resample_ohlc` y dividir `ChartPane.tsx`; si se decide convivir con ello, registrarlo como waiver con motivo y fecha en vez de solo bajar el nivel."
      blocks_release: false
    - id: WARNING-004
      dimension: contract
      file: "_docs/logging-contract.md"
      line: 32
      severity: WARNING
      rule: "S-09"
      evidence: "Persiste sin cambios: el contrato dice «Nombres de campo en inglés» (`logging-contract.md:32`) y sus propios ejemplos usan campos en español (`:54-61`); el código también (`backend/src/fxtrad/storage/metadata.py:131-138` → `logger.info(\"metadatos_descarga_guardados\", activo=…, inicio=…, filas=…)`; `clean.py:147`). El perfil declara `language.log_fields = \"english\"` (`quality-profile.toml:31`), de modo que la deriva sigue visible y medible. `correlation_id` sí se propaga (`api/app.py:67-75`)."
      issue: "Contrato de logging autocontradictorio y código alineado con la versión en español; sin cambios en el delta."
      recommendation: "Alinear contrato y código en el mismo commit y decidir si los sustantivos de dominio (`activo`, `filas`) van a `language.allow_terms`."
      blocks_release: false
  waivers:
    - finding: Q-LOG-01 (10 marcas) · backend/scripts/benchmark_download.py
      justification: "print dentro de main() (48-66): contrato de salida del CLI, permitido por el catálogo — verificado: los 10 prints caen dentro de main()"
      approved_by: "usuario"
      date: "2026-10-06"
    - finding: Q-LOG-01 (8 marcas) · backend/scripts/benchmark_parquet.py
      justification: "print dentro de main() — **motivo impreciso**: los prints están en _run() (95-109), llamado solo desde main() (126). Ver WARNING-001"
      approved_by: "usuario"
      date: "2026-10-06"
    - finding: Q-SEC-04 (2 marcas) · backend/src/fxtrad/storage/metadata.py
      justification: "interpola la constante _COLUMNS (metadata.py:35); valores parametrizados, sin entrada de usuario — verificado"
      approved_by: "usuario"
      date: "2026-10-06"
    - finding: Q-SEC-04 (3 marcas) · backend/src/fxtrad/storage/series.py
      justification: "interpola _COLUMNS/_CREATE_TABLE (series.py:32-33) y el nº de placeholders (321); valores parametrizados — verificado"
      approved_by: "usuario"
      date: "2026-10-06"
    - finding: Q-SEC-04 (1 marca) · backend/tests/pipeline/test_schema.py
      justification: "interpola constantes internas — **motivo impreciso**: interpola el parámetro `path` (fixture `tmp_path`). Ver WARNING-001"
      approved_by: "usuario"
      date: "2026-10-06"
    - finding: Q-SEC-01 (1 marca) · frontend/src/styles/contrast.ts
      justification: "es RegExp.exec() en parseHex (contrast.ts:12), no eval/exec global; `hex` llega de relativeLuminance/contrastRatio (tokens del design system). Verificado"
      approved_by: "usuario"
      date: "2026-10-06"
  verdict: CHANGES_REQUESTED
  next_action: "Corregir los dos motivos de waiver en _docs/quality-profile.toml (TECH-XXX o edición directa), decidir sobre _docs/plan.md y promover la deuda de límites; después re-auditar con --delta."
```

## Resumen (5 líneas)

1. **El delta cierra los dos bloqueos de contrato que abrió CR-001**: `_docs/quality-profile.toml` existe y `--check-profile` = `OK`, y `_docs/git-profile.toml` existe y **sus afirmaciones se verificaron contra git** (`init=true` ✓, `default_branch="master"` = `git branch --show-current` ✓, remoto `origin` = `git remote get-url origin` ✓, `master...origin/master` al día ✓, sin hooks ✓).
2. **Gates en verde con la política del proyecto**: `--level gate` → **PASS** (0 gate incumplidos · 25 marcas waived · 0 `not_measured`); tests 546/546 backend + 458/458 frontend, ruff/black/mypy, eslint/tsc/prettier y build PASS — sin regresiones, aunque el delta no toca código.
3. **Hallazgo nuevo (WARNING-001)**: 2 de los 6 waivers del perfil alegan un motivo que la evidencia desmiente — los `print` de `benchmark_parquet.py` están en `_run()`, no en `main()`, y el `Q-SEC-04` de `test_schema.py:50` interpola una ruta de fixture, no una constante.
4. **Persisten tres WARNING de CR-001**: `_docs/plan.md` colgante (WARNING-003 de CR-001), la deuda de límites —ahora `review`, y **son 8 funciones >50, no 7** (corrección de la métrica de CR-001)— y la contradicción del contrato de logging.
5. **Sin CRITICAL y sin secretos**: 0 secretos, 0 `eval`/`exec`/`os.system`/`shell=True`; S-01 (`storage/` como única capa SQL) intacto. Cobertura sigue `not_measured` (sin `pytest-cov`).

## Evidencia cruda (FASE 2)

```
$ python3 _shared/quality_gate.py --check-profile
Perfil: _docs/quality-profile.toml · reglas declaradas: 4/34
VEREDICTO del perfil: OK                      (exit 0)

$ python3 _shared/quality_gate.py --root . --level gate
Verificador de calidad SDD · perfil: _docs/quality-profile.toml
  archivos=205  líneas=26778  funciones=818  max_complejidad=11
  gates incumplidos: 0 · waivers: 25 · no medibles: 0
  [WAIVED] Q-LOG-01  backend/scripts/benchmark_download.py:51,55,56,57,58,59,60,61,63,65
  [WAIVED] Q-LOG-01  backend/scripts/benchmark_parquet.py:95,96,97,101,102,103,104,109
  [WAIVED] Q-SEC-04  backend/src/fxtrad/storage/metadata.py:154,172
  [WAIVED] Q-SEC-04  backend/src/fxtrad/storage/series.py:271,321,329
  [WAIVED] Q-SEC-04  backend/tests/pipeline/test_schema.py:50
  [WAIVED] Q-SEC-01  frontend/src/styles/contrast.ts:12
VEREDICTO: PASS                               (exit 0)

$ python3 _shared/quality_gate.py --root . --level all | grep REVIEW   (15 hallazgos)
  Q-LIM-02  backend/src/fxtrad/ingest/benchmark.py:52   'benchmark_download' de 51 líneas
  Q-LIM-02  backend/src/fxtrad/ingest/planner.py:110    'plan_blocks' de 56 líneas
  Q-LIM-02  backend/src/fxtrad/ingest/tasks.py:164      'run_download_range' de 110 líneas
  Q-LIM-02  backend/src/fxtrad/ingest/tasks.py:276      'resume_download' de 85 líneas
  Q-LIM-02  backend/src/fxtrad/pipeline/clean.py:91     'clean_candles' de 58 líneas
  Q-LIM-03  backend/src/fxtrad/pipeline/clean.py:91     'clean_candles' complejidad 11
  Q-LIM-02  backend/src/fxtrad/pipeline/indicators.py:169 'compute_indicators' de 55 líneas
  Q-LIM-03  backend/src/fxtrad/pipeline/normalize.py:36 'normalize_time' complejidad 11
  Q-LIM-02  backend/src/fxtrad/pipeline/persist.py:77   'persist' de 65 líneas
  Q-LIM-02  backend/src/fxtrad/pipeline/resample.py:73  'resample_ohlc' de 91 líneas
  Q-STR-03  backend/tests/ingest/test_catalog.py:72     marca pendiente sin resolver
  Q-LIM-01  backend/tests/test_base_timeframe_regression.py:49  Línea de 106 (límite 100)
  Q-LIM-01  backend/tests/test_utc_ohlc.py:47           Línea de 106 (límite 100)
  Q-LIM-05  frontend/src/components/ChartPane/ChartPane.test.tsx:1  Archivo de 1243 líneas
  Q-LIM-05  frontend/src/components/ChartPane/ChartPane.tsx:1       Archivo de 874 líneas

$ backend/.venv/bin/python -m pytest      -> 546 passed, 2 skipped in 55.02s
$ frontend: npm test                      -> Test Files 55 passed · Tests 458 passed
$ ruff / black / mypy                     -> PASS / PASS / PASS
$ eslint / tsc / prettier                 -> PASS / PASS / PASS
$ frontend: npm run build                 -> ✓ built in 2.29s
```

## Alcance del delta (qué cambió desde CR-001)

| Artefacto | Estado | Verificación |
|---|---|---|
| `_docs/quality-profile.toml` | nuevo | TOML válido; `--check-profile` = OK; 4 reglas declaradas, 6 waivers |
| `_docs/git-profile.toml` | nuevo | TOML válido; afirmaciones contrastadas con git (WARNING/INFO arriba) |
| `_docs/adr/ADR-026-politica-de-versionado.md` | nuevo | Sin referencias colgantes nuevas; cita CR-001 y `git-profile.toml`, ambos existentes |
| `_docs/architecture.md` | modificado (+1 línea) | `git diff --stat` → 1 insertion; añade ADR-026 al índice §11, que existe |
| **Código, tests, backlog, status** | **sin cambios** | `git status --porcelain` solo muestra rutas de `_docs/` |

## Dimensiones (FASE 3)

| Dimensión | Resultado | Evidencia |
|---|---|---|
| Seguridad | Sin hallazgos nuevos | 0 secretos; `Q-SEC-01`…`Q-SEC-06` evaluadas por el perfil; los 6 avisos de `Q-SEC-04`/`Q-SEC-01` son falsos positivos verificados uno a uno |
| Arquitectura | Sin hallazgos | S-01 intacto; ADR-026 no contradice ADR-001…025; el perfil declara `stack` real (python + typescript) |
| Mantenibilidad | WARNING-003 | 14 incumplimientos de límites visibles como `REVIEW`; corregida la métrica de CR-001 (8 funciones >50) |
| Contrato SDD | WARNING-001, 002, 004 | 2 bloqueos de CR-001 resueltos; `plan.md` y logging persisten; 2 motivos de waiver inexactos |
| Razonabilidad | Sin hallazgos con evidencia | Sin `plan.md` contra el que medir scope creep (`Q-JUD-04`); el delta no añade dependencias ni abstracciones |

## INFO

- **INFO-001 — resuelto: `CR-001` WARNING-001.** `_docs/quality-profile.toml` existe, es válido y `--check-profile` devuelve `VEREDICTO del perfil: OK` (exit 0). El gate ya se ejecuta con la política del proyecto en vez de `--defaults`.
- **INFO-002 — resuelto: `CR-001` WARNING-002.** `_docs/git-profile.toml` existe y declara la realidad del repositorio: `git branch --show-current` → `master`; `git remote get-url origin` → `git@github.com:villarrealfx/fx_trad.git`; `git status -sb` → `## master...origin/master` (sin commits locales pendientes); `.git/hooks` sin hooks. Documenta la divergencia con la prosa «se trabaja en main» en vez de renombrar historia publicada.
- **INFO-003 — falsos positivos del heurístico que siguen apareciendo.** `Q-STR-03` marca el literal `"XXX"` de `test_catalog.py:72` (`quality_checks.py:38` casa `\b(TODO|FIXME|XXX)\b`); `Q-LANG-01` ya no reporta nada tras declarar `allow_terms = [activo, estado, fecha, filas, total]` (los 4 hallazgos de CR-001 desaparecieron).
- **INFO-004 — cobertura `not_measured`.** `pytest-cov` no está instalado en `backend/.venv` y el umbral (`thresholds.coverage = 80`) no tiene instrumento; el frontend tiene `@vitest/coverage-v8` pero sin umbral declarado. Nunca se reporta PASS.
- **INFO-005 — corrección de una métrica de CR-001.** `functions_over_50 = 8` (no 7): el resumen de CR-001 omitió `benchmark_download` (`ingest/benchmark.py:52`, 51 líneas). El listado de evidencia sí lo incluía.
