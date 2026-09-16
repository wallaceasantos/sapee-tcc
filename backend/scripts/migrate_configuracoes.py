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
Script para criar a tabela de configurações e popular dados iniciais.
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
        # Verificar se tabela existe
        cursor.execute("""
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'sapee_dewas' AND TABLE_NAME = 'configuracoes_sistema'
        """)
        result = cursor.fetchone()

        if result["count"] == 0:
            print("🔄 Criando tabela configuracoes_sistema...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS `configuracoes_sistema` (
                    `id` INT NOT NULL AUTO_INCREMENT,
                    `chave` VARCHAR(50) NOT NULL UNIQUE,
                    `valor` TEXT NULL,
                    `descricao` VARCHAR(255) NULL,
                    `criado_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                    `atualizado_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    INDEX `idx_config_chave` (`chave`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)

            # Inserir dados iniciais
            print("📝 Inserindo configurações iniciais...")
            valores_iniciais = [
                ("instituicao_nome", "Instituto Federal do Amazonas", "Nome da instituição"),
                ("instituicao_email", "contato@ifam.edu.br", "Email padrão"),
                ("instituicao_telefone", "(92) 99999-9999", "Telefone padrão"),
                ("alerta_faltas_3_ativo", "true", "Ativar alerta de 3 faltas"),
                ("alerta_faltas_5_ativo", "true", "Ativar alerta de 5 faltas"),
                ("alerta_faltas_10_ativo", "true", "Ativar alerta de 10 faltas"),
                ("risco_baixo_max", "30", "Score máximo risco BAIXO"),
                ("risco_medio_max", "60", "Score máximo risco MEDIO"),
                ("risco_alto_max", "85", "Score máximo risco ALTO"),
            ]

            for chave, valor, descricao in valores_iniciais:
                cursor.execute(
                    "INSERT INTO configuracoes_sistema (chave, valor, descricao) VALUES (%s, %s, %s)",
                    (chave, valor, descricao),
                )

            connection.commit()
            print("✅ Tabela criada e configurada com sucesso!")
        else:
            print("ℹ️ Tabela configuracoes_sistema já existe.")

except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    connection.close()
