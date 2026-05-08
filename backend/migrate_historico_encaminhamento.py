"""
Script para criar a tabela de histórico de mudanças de encaminhamento.
"""
import pymysql

config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'S@nx5497',
    'database': 'sapee_dewas',
    'cursorclass': pymysql.cursors.DictCursor
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
        
        if result['count'] == 0:
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
