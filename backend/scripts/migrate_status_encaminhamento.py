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

"""
Script para aplicar a migração da coluna status_encaminhamento na tabela atendimentos.
Executar uma única vez após a criação da tabela atendimentos.
"""

import os

import pymysql
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost:3306/sapee_dewas")
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

try:
    connection = pymysql.connect(**config)
    with connection.cursor() as cursor:
        # Verificar se a coluna já existe
        cursor.execute("""
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'sapee_dewas' 
            AND TABLE_NAME = 'atendimentos' 
            AND COLUMN_NAME = 'status_encaminhamento'
        """)
        result = cursor.fetchone()

        if result["count"] == 0:
            print("🔄 Adicionando coluna status_encaminhamento...")
            cursor.execute("""
                ALTER TABLE atendimentos 
                ADD COLUMN status_encaminhamento ENUM('SOLICITADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO') NULL COMMENT 'Status do fluxo de encaminhamento externo'
            """)
            cursor.execute("""
                CREATE INDEX idx_atendimentos_status_enc ON atendimentos(status_encaminhamento)
            """)
            connection.commit()
            print("✅ Coluna adicionada com sucesso!")
        else:
            print("ℹ️ Coluna status_encaminhamento já existe.")

except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    connection.close()
