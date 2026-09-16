import logging

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import auth
import database
import models
from ml_logic_v2 import calcular_risco_evasao

logger = logging.getLogger(__name__)

router = APIRouter()
# ============================================
# ENDPOINTS - PREDIÇÕES EM LOTE
# ============================================


@router.post("/predicoes/gerar-todas")
def gerar_predicoes_em_lote(
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """
    Gerar predições para todos os alunos sem predição.
    Útil após importação de CSV ou para corrigir dados.
    Apenas ADMIN pode executar.
    """

    # Buscar alunos SEM predição
    alunos_com_predicao = select(models.Predicao.aluno_id).distinct()
    alunos_sem_predicao = (
        db.query(models.Aluno)
        .filter(~models.Aluno.matricula.in_(alunos_com_predicao))
        .all()
    )

    if not alunos_sem_predicao:
        return {"message": "Todos os alunos já possuem predições!", "alunos_processados": 0}

    predicoes_geradas = 0
    erros = 0

    for aluno in alunos_sem_predicao:
        try:
            resultado = calcular_risco_evasao(aluno, db)

            predicao = models.Predicao(
                aluno_id=aluno.matricula,
                risco_evasao=resultado["risco_evasao"],
                nivel_risco=resultado["nivel_risco"],
                fatores_principais=resultado["fatores_principais"],
                modelo_ml_versao="1.0.0",
            )
            db.add(predicao)
            predicoes_geradas += 1

        except Exception as e:
            logger.warning("Erro ao gerar predição para %s: %s", aluno.matricula, e)
            erros += 1

    db.commit()

    return {
        "message": f"{predicoes_geradas} predições geradas com sucesso!",
        "alunos_processados": predicoes_geradas,
        "erros": erros,
        "total_alunos_sem_predicao": len(alunos_sem_predicao),
    }


@router.get("/predicoes/resumo")
def get_resumo_predicoes(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Obter resumo das predições"""
    total_alunos = db.query(models.Aluno).count()

    # Subquery para última predição
    subq = (
        select(
            models.Predicao.aluno_id,
            func.max(models.Predicao.data_predicao).label("max_data"),
        )
        .group_by(models.Predicao.aluno_id)
        .subquery()
    )

    ultimas_predicoes = (
        db.query(models.Predicao)
        .join(subq, models.Predicao.aluno_id == subq.c.aluno_id)
        .filter(models.Predicao.data_predicao == subq.c.max_data)
    )

    # Contar por nível
    alunos_com_predicao = ultimas_predicoes.count()
    risco_alto = ultimas_predicoes.filter(models.Predicao.nivel_risco == "ALTO").count()
    risco_medio = ultimas_predicoes.filter(models.Predicao.nivel_risco == "MEDIO").count()
    risco_baixo = ultimas_predicoes.filter(models.Predicao.nivel_risco == "BAIXO").count()
    sem_predicao = total_alunos - alunos_com_predicao

    return {
        "total_alunos": total_alunos,
        "alunos_com_predicao": alunos_com_predicao,
        "alunos_sem_predicao": sem_predicao,
        "risco_alto": risco_alto,
        "risco_medio": risco_medio,
        "risco_baixo": risco_baixo,
        "percentual_com_predicao": (
            round((alunos_com_predicao / total_alunos * 100), 2) if total_alunos > 0 else 0
        ),
    }
