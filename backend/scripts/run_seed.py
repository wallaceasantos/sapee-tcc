"""
Executa um arquivo .sql (seed/migracao) no banco configurado em DATABASE_URL.

Uso:
    python scripts/run_seed.py [arquivo.sql]

Sem argumento, executa `migrations_sql/seed_validacao_modelo.sql`.
Os arquivos sao procurados em backend/migrations_sql/ (ou informe um caminho absoluto).
"""

import os
import re
import sys

import pymysql
from dotenv import load_dotenv

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))

MIGRATIONS_DIR = os.path.join(_BACKEND_DIR, "migrations_sql")
DEFAULT_SQL = "seed_validacao_modelo.sql"

nome = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SQL
file_path = nome if os.path.isabs(nome) else os.path.join(MIGRATIONS_DIR, nome)

if not os.path.exists(file_path):
    print(f"Arquivo nao encontrado: {file_path}")
    if os.path.isdir(MIGRATIONS_DIR):
        disponiveis = sorted(f for f in os.listdir(MIGRATIONS_DIR) if f.lower().endswith(".sql"))
        if disponiveis:
            print("Arquivos disponiveis em migrations_sql/:")
            for f in disponiveis:
                print(f"  - {f}")
    sys.exit(1)

db_url = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/sapee_dewas")
parts = db_url.replace("mysql+pymysql://", "").split("@")
user_pass = parts[0].split(":")
host_db = parts[1].split("/") if len(parts) > 1 else ["localhost:3306", "sapee_dewas"]

config = {
    "host": host_db[0].split(":")[0],
    "user": user_pass[0],
    "password": user_pass[1] if len(user_pass) > 1 else "",
    "database": host_db[1] if len(host_db) > 1 else "sapee_dewas",
    "cursorclass": pymysql.cursors.DictCursor,
}

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove comentarios de linha para evitar problemas na execucao em lote
content = re.sub(r"--.*$", "", content, flags=re.MULTILINE)
statements = [s.strip() for s in content.split(";") if s.strip()]

connection = None
try:
    connection = pymysql.connect(**config)
    with connection.cursor() as cursor:
        for stmt in statements:
            cursor.execute(stmt)
    connection.commit()
    print(f"Seed executado com sucesso: {os.path.basename(file_path)} ({len(statements)} comandos)")
except Exception as e:
    print(f"Erro ao executar seed: {e}")
    sys.exit(1)
finally:
    if connection:
        connection.close()
