# --- Bootstrap de execucao (injetado): garante imports do backend e carrega o .env ---
import os as _os
import sys as _sys

_BACKEND_DIR = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _BACKEND_DIR not in _sys.path:
    _sys.path.insert(0, _BACKEND_DIR)
try:
    from dotenv import load_dotenv as _load_dotenv

    _load_dotenv(_os.path.join(_BACKEND_DIR, ".env"))
except Exception:
    pass
# --- fim do bootstrap ---

import os

import pymysql
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/sapee_dewas")
# Parse DATABASE_URL: mysql+pymysql://user:password@host:port/database
parts = db_url.replace("mysql+pymysql://", "").split("@")
user_pass = parts[0].split(":")
host_db = parts[1].split("/")

config = {
    "host": host_db[0].split(":")[0],
    "user": user_pass[0],
    "password": user_pass[1] if len(user_pass) > 1 else "",
    "database": host_db[1] if len(host_db) > 1 else "sapee_dewas",
    "cursorclass": pymysql.cursors.DictCursor,
}

connection = pymysql.connect(**config)
with connection.cursor() as cursor:
    # Check predicao_historico
    cursor.execute("SELECT COUNT(*) as total FROM predicao_historico")
    total = cursor.fetchone()
    print(f"Total predicao_historico: {total['total']}")

    # Check by tipo_erro
    cursor.execute("SELECT tipo_erro, COUNT(*) as qtd FROM predicao_historico GROUP BY tipo_erro")
    for row in cursor.fetchall():
        print(f"  {row['tipo_erro']}: {row['qtd']}")

    # Check egressos
    cursor.execute("SELECT COUNT(*) as total FROM egressos")
    total = cursor.fetchone()
    print(f"Total egressos: {total['total']}")

connection.close()
