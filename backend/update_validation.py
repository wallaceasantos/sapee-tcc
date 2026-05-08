"""
Script para atualizar a validacao do modelo com as novas predicoes.
Executar após regenerate_predictions.py
"""
import pymysql
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from models import Predicao, PredicaoHistorico, Egresso, NivelRisco
from datetime import datetime, timedelta

DB_URL = "mysql+pymysql://root:S%40nx5497@localhost:3306/sapee_dewas"
engine = create_engine(DB_URL)

print("=" * 60)
print("🔄 Atualizando validação com novas predições")
print("=" * 60)

with Session(engine) as db:
    # Limpar historico antigo
    db.query(PredicaoHistorico).delete()
    db.commit()
    print("🗑️ Histórico antigo removido")

    # Buscar egressos
    egressos = db.query(Egresso).all()
    print(f"📊 Total de egressos: {len(egressos)}")

    novos_registros = 0

    for egresso in egressos:
        # Buscar predicao mais recente do aluno
        predicao = db.query(Predicao).filter(
            Predicao.aluno_id == egresso.aluno_matricula
        ).order_by(Predicao.data_predicao.desc()).first()

        if not predicao:
            continue

        # Determinar tipo de erro
        motivo = egresso.motivo_saida
        nivel = predicao.nivel_risco

        if motivo == 'ABANDONO':
            if nivel in [NivelRisco.ALTO, NivelRisco.MUITO_ALTO]:
                tipo_erro = 'VERDADEIRO_POSITIVO'
                predicao_correta = 1
            elif nivel == NivelRisco.MEDIO:
                tipo_erro = 'VERDADEIRO_POSITIVO_PARCIAL'
                predicao_correta = 1
            else:  # BAIXO
                tipo_erro = 'FALSO_NEGATIVO'
                predicao_correta = 0
        elif motivo == 'TRANSFERENCIA':
            if nivel in [NivelRisco.ALTO, NivelRisco.MUITO_ALTO]:
                tipo_erro = 'FALSO_POSITIVO'
                predicao_correta = 0
            else:
                tipo_erro = 'VERDADEIRO_NEGATIVO'
                predicao_correta = 1
        elif motivo == 'CONCLUSAO':
            if nivel in [NivelRisco.ALTO, NivelRisco.MUITO_ALTO]:
                tipo_erro = 'FALSO_POSITIVO'
                predicao_correta = 0
            else:
                tipo_erro = 'VERDADEIRO_NEGATIVO'
                predicao_correta = 1
        else:
            continue

        # Criar registro
        hist = PredicaoHistorico(
            aluno_matricula=egresso.aluno_matricula,
            predicao_id=predicao.id,
            nivel_risco=nivel.value if hasattr(nivel, 'value') else nivel,
            risco_evasao=predicao.risco_evasao,
            fatores_principais=predicao.fatores_principais,
            modelo_ml_versao=predicao.modelo_ml_versao,
            data_predicao=predicao.data_predicao,
            data_evasao=datetime.now() - timedelta(days=30),
            motivo_saida=motivo,
            tipo_erro=tipo_erro,
            predicao_correta=predicao_correta
        )
        db.add(hist)
        novos_registros += 1

    db.commit()
    print(f"✅ {novos_registros} registros de validação criados")

    # Resumo
    from sqlalchemy import func
    resumo = db.query(
        PredicaoHistorico.tipo_erro,
        func.count(PredicaoHistorico.id).label('total')
    ).group_by(PredicaoHistorico.tipo_erro).all()

    print("\n📈 Resumo por tipo de erro:")
    for tipo, total in resumo:
        print(f"  {tipo}: {total}")

    # Calcular métricas rápidas
    total = db.query(PredicaoHistorico).count()
    vp = db.query(PredicaoHistorico).filter(
        PredicaoHistorico.tipo_erro.in_(['VERDADEIRO_POSITIVO', 'VERDADEIRO_POSITIVO_PARCIAL'])
    ).count()
    vn = db.query(PredicaoHistorico).filter(
        PredicaoHistorico.tipo_erro == 'VERDADEIRO_NEGATIVO'
    ).count()
    fp = db.query(PredicaoHistorico).filter(
        PredicaoHistorico.tipo_erro == 'FALSO_POSITIVO'
    ).count()
    fn = db.query(PredicaoHistorico).filter(
        PredicaoHistorico.tipo_erro == 'FALSO_NEGATIVO'
    ).count()

    acuracia = ((vp + vn) / total * 100) if total > 0 else 0
    precisao = (vp / (vp + fp) * 100) if (vp + fp) > 0 else 0
    recall = (vp / (vp + fn) * 100) if (vp + fn) > 0 else 0

    print(f"\n📊 Métricas calculadas:")
    print(f"  Acurácia: {acuracia:.1f}%")
    print(f"  Precisão: {precisao:.1f}%")
    print(f"  Recall: {recall:.1f}%")

print("\n" + "=" * 60)
print("✅ Validação atualizada! Verifique no frontend.")
print("=" * 60)
