"""
Script para criar cursos no banco
SAPEE DEWAS Backend
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base
import os
from dotenv import load_dotenv
import sys
sys.path.append(os.path.dirname(__file__))

# Carregar .env
load_dotenv()

# Criar engine e base
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
Base = declarative_base()

# Importar models
import models

def criar_cursos():
    """Cria cursos no banco"""
    
    db = Session(bind=engine)
    
    try:
        # Criar cursos
        cursos_data = [
            ("Informática", "INTEGRADO"),
            ("Edificações", "INTEGRADO"),
            ("Mecânica", "INTEGRADO"),
            ("Química", "INTEGRADO"),
            ("Eletrotécnica", "INTEGRADO"),
            ("Administração", "SUBSEQUENTE"),
            ("Contabilidade", "SUBSEQUENTE"),
        ]
        
        print("Criando cursos...")
        
        for nome_curso, modalidade in cursos_data:
            existing = db.query(models.Curso).filter(
                models.Curso.nome.ilike(f"%{nome_curso}%")
            ).first()
            
            if not existing:
                curso = models.Curso(nome=nome_curso, modalidade=modalidade)
                db.add(curso)
                print(f"   [OK] Curso adicionado: {nome_curso}")
            else:
                print(f"   [INFO] Curso ja existe: {nome_curso}")
        
        db.commit()
        
        # Listar todos os cursos
        print("\nCursos no banco:")
        cursos = db.query(models.Curso).all()
        for curso in cursos:
            print(f"   ID {curso.id}: {curso.nome} ({curso.modalidade})")
        
        print("\n[OK] Cursos criados com sucesso!")
        print("\nAgora voce pode cadastrar alunos!")
        
    except Exception as e:
        print(f"\n[ERRO] {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    criar_cursos()
