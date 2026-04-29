"""
Script para Recalcular Predições com Fatores Detalhados
SAPEE DEWAS Backend

Este script recalcula todas as predições usando a lógica de fallback melhorada
que mostra fatores específicos e detalhados!
"""

from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
import sys

# Carregar variáveis de ambiente
load_dotenv()

# Importar models
sys.path.append(os.path.dirname(__file__))
import models
from ml_logic import fallback_logic

# Criar engine
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

print("=" * 60)
print("🔄 RECALCULANDO PREDIÇÕES COM FATORES DETALHADOS")
print("=" * 60)

with Session(engine) as db:
    # Buscar todos os alunos
    alunos = db.query(models.Aluno).all()
    
    print(f"\n📊 Total de alunos: {len(alunos)}")
    print("\n♻️  Recalculando predições...\n")
    
    atualizados = 0
    erros = 0
    
    for aluno in alunos:
        try:
            # Calcular nova predição com fallback melhorado
            resultado = fallback_logic(aluno, db=db)
            
            # Deletar predição antiga
            db.query(models.Predicao).filter(
                models.Predicao.aluno_id == aluno.matricula
            ).delete()
            
            # Criar nova predição
            nova_predicao = models.Predicao(
                aluno_id=aluno.matricula,
                risco_evasao=resultado['risco_evasao'],
                nivel_risco=resultado['nivel_risco'],
                fatores_principais=resultado['fatores_principais'],
                modelo_ml_versao='2.0.0-fallback'
            )
            
            db.add(nova_predicao)
            db.commit()
            
            atualizados += 1
            
            # Mostrar resumo
            print(f"✅ {aluno.matricula} - {aluno.nome}")
            print(f"   Risco: {resultado['risco_evasao']:.1f}% - {resultado['nivel_risco']}")
            print(f"   Fatores: {resultado['fatores_principais'][:80]}...")
            print()
            
        except Exception as e:
            print(f"❌ {aluno.matricula} - {aluno.nome}: {str(e)}")
            erros += 1
            db.rollback()
    
    print("=" * 60)
    print("✅ RECALCULO CONCLUÍDO!")
    print("=" * 60)
    print(f"\n📊 Resumo:")
    print(f"   ✅ Atualizados: {atualizados}")
    print(f"   ❌ Erros: {erros}")
    print(f"\n📱 Agora os alertas no Telegram mostrarão fatores detalhados!")
    print("=" * 60)
