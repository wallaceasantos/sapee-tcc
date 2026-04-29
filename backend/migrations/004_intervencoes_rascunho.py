"""
🔄 Migração: Adicionar suporte a rascunhos automáticos de intervenção
Adiciona colunas e enum para intervenções auto-geradas.
"""

from sqlalchemy import create_engine, text, inspect
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    """Adiciona colunas e enum para rascunhos de intervenção"""
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Verificar se colunas já existem
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('intervencoes')]
        
        # Adicionar colunas se não existirem
        new_columns = [
            ('auto_gerada', "ALTER TABLE intervencoes ADD COLUMN auto_gerada BOOLEAN DEFAULT FALSE"),
            ('motivo_risco', "ALTER TABLE intervencoes ADD COLUMN motivo_risco TEXT"),
            ('data_aprovacao', "ALTER TABLE intervencoes ADD COLUMN data_aprovacao DATE"),
            ('data_rejeicao', "ALTER TABLE intervencoes ADD COLUMN data_rejeicao DATE"),
            ('motivo_rejeicao', "ALTER TABLE intervencoes ADD COLUMN motivo_rejeicao TEXT"),
        ]
        
        added = 0
        for col_name, sql in new_columns:
            if col_name not in columns:
                conn.execute(text(sql))
                added += 1
        
        # Tornar usuario_id NULLABLE para rascunhos automáticos
        conn.execute(text("ALTER TABLE intervencoes MODIFY COLUMN usuario_id INT NULL"))
        
        # Adicionar RASCUNHO ao enum se não existir
        try:
            conn.execute(text("""
                ALTER TABLE intervencoes 
                MODIFY COLUMN status ENUM('RASCUNHO','PENDENTE','EM_ANDAMENTO','CONCLUIDA','CANCELADA') 
                DEFAULT 'PENDENTE'
            """))
        except:
            pass  # Já pode existir
        
        conn.commit()
        
        if added > 0:
            print(f"✅ {added} colunas adicionadas à tabela intervencoes!")
        else:
            print("✅ Colunas já existem. Nada a fazer.")
        
        print("✅ Migration concluída!")

if __name__ == "__main__":
    run_migration()
