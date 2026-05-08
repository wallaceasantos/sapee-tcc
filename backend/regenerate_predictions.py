"""
Script para regenerar todas as predições com os novos parâmetros otimizados.
Executar após ajustes no modelo para melhorar Recall.
"""
import pymysql
import sys
import os

# Adicionar backend ao path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from models import Aluno, Predicao, Base
from ml_logic_v2 import calcular_risco_evasao

# Configuração do banco
DB_URL = "mysql+pymysql://root:S%40nx5497@localhost:3306/sapee_dewas"
engine = create_engine(DB_URL)

print("=" * 60)
print("🔄 Regenerando predições com modelo otimizado (v2.1)")
print("=" * 60)

with Session(engine) as db:
    alunos = db.query(Aluno).all()
    print(f"📊 Total de alunos: {len(alunos)}")

    # Limpar predições antigas
    db.query(Predicao).delete()
    db.commit()
    print("🗑️ Predições antigas removidas")

    # Regenerar predições
    for i, aluno in enumerate(alunos, 1):
        resultado = calcular_risco_evasao(aluno, db)

        nova_predicao = Predicao(
            aluno_id=aluno.matricula,
            risco_evasao=resultado['risco_evasao'],
            nivel_risco=resultado['nivel_risco'],
            fatores_principais=resultado.get('fatores_principais', ''),
            modelo_ml_versao=resultado.get('modelo_ml_versao', '2.0.0-fallback-v2.1')
        )
        db.add(nova_predicao)

        if i % 10 == 0:
            print(f"  Processados {i}/{len(alunos)} alunos...")

    db.commit()
    print(f"✅ {len(alunos)} predições regeneradas com sucesso!")

    # Resumo por nível
    from sqlalchemy import func
    resumo = db.query(
        Predicao.nivel_risco,
        func.count(Predicao.id).label('total')
    ).group_by(Predicao.nivel_risco).all()

    print("\n📈 Resumo por nível de risco:")
    for nivel, total in resumo:
        print(f"  {nivel}: {total}")

print("\n" + "=" * 60)
print("✅ Processo concluído! Agora execute o seed de validação.")
print("=" * 60)
