"""Backend de la Plataforma de Análisis Técnico (estilo TradingView).

Package raíz del monolito modular (ADR-001). Los módulos `ingest`, `pipeline`,
`storage`, `api` y `contracts` exponen su interfaz pública en sus respectivos
`__init__` (ver `_docs/module-interfaces.md`); `logging_config` es transversal y
aplica a todos (ADR-008).
"""

__version__ = "0.1.0"
