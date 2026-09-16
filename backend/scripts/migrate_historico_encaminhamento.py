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
Script para criar a tabela de histórico de mudanças de encaminhamento.
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
        # Verificar se a tabela já existe
        cursor.execute("""
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'sapee_dewas' 
            AND TABLE_NAME = 'historico_encaminhamento'
        """)
        result = cursor.fetchone()

        if result["count"] == 0:
            print("🔄 Criando tabela historico_encaminhamento...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS `historico_encaminhamento` (
                    `id` INT NOT NULL AUTO_INCREMENT,
                    `atendimento_id` INT NOT NULL,
                    `usuario_id` INT NOT NULL COMMENT 'Profissional que realizou a mudança',
                    `status_anterior` ENUM('SOLICITADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO') NULL,
                    `status_novo` ENUM('SOLICITADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO') NOT NULL,
                    `observacoes` TEXT NULL COMMENT 'Motivo ou observação sobre a mudança',
                    `data_mudanca` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    
                    PRIMARY KEY (`id`),
                    INDEX `idx_hist_enc_atendimento` (`atendimento_id`),
                    INDEX `idx_hist_enc_usuario` (`usuario_id`),
                    INDEX `idx_hist_enc_data` (`data_mudanca`),
                    
                    CONSTRAINT `fk_hist_enc_atendimento` FOREIGN KEY (`atendimento_id`) REFERENCES `atendimentos` (`id`) ON DELETE CASCADE,
                    CONSTRAINT `fk_hist_enc_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de mudanças de status em encaminhamentos externos'
            """)
            connection.commit()
            print("✅ Tabela criada com sucesso!")
        else:
            print("ℹ️ Tabela historico_encaminhamento já existe.")

except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    connection.close()
