"""
🔄 Migração: Adicionar ciclo de intervenção (6 meses)
Adiciona campo `data_limite` para controle automático de vencimento.
"""

from sqlalchemy import create_engine, text, inspect
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    """Adiciona coluna data_limite na tabela intervencoes"""
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('intervencoes')]
        
        if 'data_limite' in columns:
            print("✅ Coluna `data_limite` já existe. Nada a fazer.")
            return
        
        # Adiciona a coluna (NULL por padrão para registros antigos)
        conn.execute(text("ALTER TABLE intervencoes ADD COLUMN data_limite DATE DEFAULT NULL COMMENT 'Data de vencimento do ciclo (6 meses)'"))
        
        # Atualiza registros existentes que já estão EM_ANDAMENTO ou CONCLUIDA
        # Define data_limite como 6 meses após a data_intervencao
        conn.execute(text("""
            UPDATE intervencoes 
            SET data_limite = DATE_ADD(data_intervencao, INTERVAL 6 MONTH)
            WHERE data_limite IS NULL AND data_intervencao IS NOT NULL
        """))
        
        conn.commit()
        print("✅ Coluna `data_limite` adicionada e registros atualizados!")

if __name__ == "__main__":
    run_migration()
