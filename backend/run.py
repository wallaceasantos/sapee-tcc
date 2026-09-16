"""
Ponto de entrada de producao do backend SAPEE.

Executa o bootstrap (valida envs, garante schema e usuario admin) e inicia o
uvicorn lendo a porta de PORT via Python.

Assim o comando de start nao depende de expansao de shell (`$PORT`), o que
evita o erro "Invalid value for '--port': '$PORT' is not a valid integer".
"""

import os
import sys

from bootstrap import main as bootstrap_main


def main() -> int:
    if bootstrap_main() != 0:
        return 1

    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    print(f"[run] iniciando uvicorn em 0.0.0.0:{port}")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
