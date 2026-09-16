from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas

router = APIRouter()
# ============================================
# ENDPOINTS - DASHBOARD
# ============================================


@router.get("/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Obter estatísticas do dashboard"""
    # Query base
    query = db.query(models.Aluno)

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)

    total = query.count()

    # Contar por nível de risco (última predição)

    # Subquery para pegar última predição de cada aluno
    subq = (
        select(
            models.Predicao.aluno_id, func.max(models.Predicao.data_predicao).label("max_data")
        )
        .group_by(models.Predicao.aluno_id)
        .subquery()
    )

    ultimas_predicoes = (
        db.query(models.Predicao)
        .join(subq, models.Predicao.aluno_id == subq.c.aluno_id)
        .filter(models.Predicao.data_predicao == subq.c.max_data)
    )

    # Filtrar por curso se necessário
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        ultimas_predicoes = ultimas_predicoes.join(models.Aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )

    risco_alto = ultimas_predicoes.filter(
        models.Predicao.nivel_risco == models.NivelRisco.ALTO
    ).count()

    risco_medio = ultimas_predicoes.filter(
        models.Predicao.nivel_risco == models.NivelRisco.MEDIO
    ).count()

    risco_muito_alto = ultimas_predicoes.filter(
        models.Predicao.nivel_risco == models.NivelRisco.MUITO_ALTO
    ).count()

    risco_baixo = total - risco_alto - risco_medio - risco_muito_alto

    # Média geral
    media_result = query.with_entities(func.avg(models.Aluno.media_geral)).scalar()
    media_geral = float(media_result) if media_result else 0.0

    # Intervenções ativas
    intervencoes_ativas = (
        db.query(models.Intervencao)
        .filter(
            models.Intervencao.status.in_(
                [models.StatusIntervencao.PENDENTE, models.StatusIntervencao.EM_ANDAMENTO]
            )
        )
        .count()
    )

    return {
        "total_alunos": total,
        "risco_muito_alto": risco_muito_alto,
        "risco_alto": risco_alto,
        "risco_medio": risco_medio,
        "risco_baixo": risco_baixo,
        "media_geral_campus": round(media_geral, 2),
        "intervencoes_ativas": intervencoes_ativas,
    }


@router.get("/dashboard/frequencia-stats", response_model=schemas.FrequenciaStats)
def get_frequencia_stats(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Obter estatísticas de frequência para o dashboard"""
    # Buscar todas as frequências mensais (mais recentes por aluno)
    subq = (
        select(
            models.FrequenciaMensal.aluno_id,
            func.max(models.FrequenciaMensal.data_registro).label("max_data"),
        )
        .group_by(models.FrequenciaMensal.aluno_id)
        .subquery()
    )

    query = (
        db.query(models.FrequenciaMensal)
        .join(subq, models.FrequenciaMensal.aluno_id == subq.c.aluno_id)
        .filter(models.FrequenciaMensal.data_registro == subq.c.max_data)
    )

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.Aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )

    total = query.count()
    abaixo_75 = query.filter(models.FrequenciaMensal.frequencia < 75.0).count()
    abaixo_50 = query.filter(models.FrequenciaMensal.frequencia < 50.0).count()

    return {
        "total": total,
        "abaixo_75_pct": abaixo_75,
        "abaixo_50_pct": abaixo_50,
    }