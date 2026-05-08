"""
Script para adicionar a coluna disciplina_id na tabela registro_faltas_diarias.
Necessário para vincular faltas diárias a disciplinas padronizadas.
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
            AND TABLE_NAME = 'registro_faltas_diarias' 
            AND COLUMN_NAME = 'disciplina_id'
        """)
        result = cursor.fetchone()
        
        if result['count'] == 0:
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
