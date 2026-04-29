"""
Script para verificar e corrigir cursos dos alunos
"""

from sqlalchemy import create_engine, update
from sqlalchemy.orm import Session, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
Base = declarative_base()

import models

def verificar_cursos():
    db = Session(bind=engine)
    
    try:
        # Verificar cursos existentes
        print("📚 CURSOS EXISTENTES:")
        cursos = db.query(models.Curso).all()
        for curso in cursos:
            print(f"   ID {curso.id}: {curso.nome}")
        
        print("\n👥 ALUNOS SEM CURSO:")
        alunos_sem_curso = db.query(models.Aluno).filter(
            models.Aluno.curso_id == None
        ).all()
        
        print(f"   Total: {len(alunos_sem_curso)} alunos")
        for aluno in alunos_sem_curso[:10]:
            print(f"   - {aluno.nome} ({aluno.matricula})")
        
        # Verificar alunos com curso_id inválido
        print("\n🔍 VERIFICANDO CURSO_ID DOS ALUNOS:")
        todos_alunos = db.query(models.Aluno).limit(10).all()
        for aluno in todos_alunos:
            curso = db.query(models.Curso).filter(models.Curso.id == aluno.curso_id).first()
            if curso:
                print(f"   ✅ {aluno.nome}: curso_id={aluno.curso_id} → {curso.nome}")
            else:
                print(f"   ❌ {aluno.nome}: curso_id={aluno.curso_id} → CURSO NÃO ENCONTRADO!")
        
    finally:
        db.close()

if __name__ == "__main__":
    verificar_cursos()
