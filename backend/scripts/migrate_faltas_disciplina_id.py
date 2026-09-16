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
Script para adicionar a coluna disciplina_id na tabela registro_faltas_diarias.
Necessário para vincular faltas diárias a disciplinas padronizadas.
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
            AND TABLE_NAME = 'registro_faltas_diarias' 
            AND COLUMN_NAME = 'disciplina_id'
        """)
        result = cursor.fetchone()

        if result["count"] == 0:
            print("🔄 Adicionando coluna disciplina_id na tabela registro_faltas_diarias...")
            cursor.execute("""
                ALTER TABLE registro_faltas_diarias 
                ADD COLUMN disciplina_id INT NULL COMMENT 'ID da disciplina padronizada' AFTER disciplina,
                ADD INDEX idx_faltas_disciplina_id (disciplina_id),
                ADD CONSTRAINT fk_faltas_disciplina FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE SET NULL
            """)
            connection.commit()
            print("✅ Coluna adicionada com sucesso!")
        else:
            print("ℹ️ Coluna disciplina_id já existe na tabela registro_faltas_diarias.")

except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    connection.close()
