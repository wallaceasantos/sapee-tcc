"""
Script de Diagnóstico - Verificar Cálculo de Risco
SAPEE DEWAS Backend

Este script mostra como o risco está sendo calculado para cada aluno
"""

from sqlalchemy import create_engine
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

print("=" * 80)
print("🔍 DIAGNÓSTICO DE CÁLCULO DE RISCO")
print("=" * 80)

with Session(engine) as db:
    # Buscar 10 primeiros alunos
    alunos = db.query(models.Aluno).limit(10).all()
    
    print(f"\n📊 Analisando {len(alunos)} alunos...\n")
    
    for aluno in alunos:
        # Calcular risco
        resultado = fallback_logic(aluno, db=db)
        
        print(f"👤 {aluno.matricula} - {aluno.nome}")
        print(f"   📊 Curso: {aluno.curso.nome if aluno.curso else 'N/A'}")
        print(f"   📈 Frequência: {aluno.frequencia}%")
        print(f"   📚 Média: {aluno.media_geral}")
        print(f"   ⚠️  Reprovas: {aluno.historico_reprovas}")
        print(f"   💼 Trabalha: {'Sim' if aluno.trabalha else 'Não'}")
        if aluno.trabalha:
            print(f"      Carga horária: {aluno.carga_horaria_trabalho}h/semana")
        print(f"   💰 Renda: R$ {aluno.renda_familiar:.2f}")
        print(f"   🚌 Tempo deslocamento: {aluno.tempo_deslocamento} min")
        print(f"   💻 Computador: {'Sim' if aluno.possui_computador else 'Não'}")
        print(f"   🌐 Internet: {'Sim' if aluno.possui_internet else 'Não'}")
        print(f"\n   🎯 RISCO CALCULADO: {resultado['risco_evasao']:.1f}% - {resultado['nivel_risco']}")
        print(f"   📋 Fatores:")
        for fator in resultado['fatores_principais'].split(', '):
            print(f"      • {fator}")
        print()
        print("-" * 80)
        print()

print("=" * 80)
print("✅ DIAGNÓSTICO CONCLUÍDO!")
print("=" * 80)
