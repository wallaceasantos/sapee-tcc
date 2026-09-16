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
Script para marcar atendimentos existentes como necessitando encaminhamento.
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
        print("🔄 Atualizando atendimentos para testar encaminhamentos...")

        # Vamos marcar alguns atendimentos específicos
        updates = [
            ("2024101001", "PSICOLOGICO", "CAPS (Centro de Atenção Psicossocial)"),
            ("2024101023", "SAUDE", "UBS Central - Oftalmologia"),
            ("2024101038", "ENCAMINHAMENTO_EXTERNO", "Conselho Tutelar"),
        ]

        for matricula, tipo, destino in updates:
            cursor.execute(
                """
                UPDATE atendimentos 
                SET necessita_encaminhamento = 1, 
                    tipo_encaminhamento = %s,
                    status_encaminhamento = 'SOLICITADO'
                WHERE aluno_matricula = %s AND tipo_atendimento = %s
            """,
                (destino, matricula, tipo),
            )
            print(f"   ✅ {matricula} -> {destino}")

        connection.commit()
        print("✅ Dados atualizados com sucesso!")

except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    connection.close()
