"""
Script para aplicar a migração da coluna status_encaminhamento na tabela atendimentos.
Executar uma única vez após a criação da tabela atendimentos.
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
        # Verificar se a coluna já existe
        cursor.execute("""
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'sapee_dewas' 
            AND TABLE_NAME = 'atendimentos' 
            AND COLUMN_NAME = 'status_encaminhamento'
        """)
        result = cursor.fetchone()
        
        if result['count'] == 0:
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
