from datetime import datetime, time as dt_time, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas

router = APIRouter()


def _parse_hora(valor):
    """Converte 'HH:MM' / 'HH:MM:SS' em datetime.time (None se vazio ou inválido)."""
    if valor is None or valor == "":
        return None
    if isinstance(valor, dt_time):
        return valor
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(str(valor), fmt).time()
        except ValueError:
            continue
    return None


def _converter_horas(dados: dict) -> dict:
    """Converte os campos de hora (string) em objetos time antes de persistir."""
    for campo in ("hora_inicio", "hora_fim"):
        if campo in dados:
            dados[campo] = _parse_hora(dados[campo])
    return dados
# ============================================
# ENDPOINTS DE ATENDIMENTOS / OCORRÊNCIAS
# ============================================


@router.post(
    "/alunos/{matricula}/atendimentos",
    response_model=schemas.AtendimentoResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_atendimento(
    matricula: str,
    atendimento_data: schemas.AtendimentoCreate,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
    db: Session = Depends(database.get_db),
):
    """Registrar atendimento/ocorrência para aluno"""
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Segurança: Usa o ID do usuário autenticado, ignorando o enviado no body
    dados_atendimento = _converter_horas(atendimento_data.model_dump())
    dados_atendimento["usuario_id"] = current_user.id

    db_atendimento = models.Atendimento(aluno_matricula=matricula, **dados_atendimento)
    db.add(db_atendimento)
    db.commit()
    db.refresh(db_atendimento)
    return db_atendimento


@router.get("/alunos/{matricula}/atendimentos", response_model=List[schemas.AtendimentoResponse])
def list_atendimentos(
    matricula: str,
    tipo: Optional[str] = None,
    status: Optional[str] = None,
    prioridade: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Listar atendimentos de um aluno com filtros"""
    query = db.query(models.Atendimento).filter(models.Atendimento.aluno_matricula == matricula)
    if tipo:
        query = query.filter(models.Atendimento.tipo_atendimento == tipo)
    if status:
        query = query.filter(models.Atendimento.status == status)
    if prioridade:
        query = query.filter(models.Atendimento.prioridade == prioridade)
    if data_inicio:
        query = query.filter(models.Atendimento.data_atendimento >= data_inicio)
    if data_fim:
        query = query.filter(models.Atendimento.data_atendimento <= data_fim)
    return query.order_by(models.Atendimento.data_atendimento.desc()).all()


@router.get(
    "/alunos/{matricula}/atendimentos/{atendimento_id}", response_model=schemas.AtendimentoResponse
)
def get_atendimento(
    matricula: str,
    atendimento_id: int,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Obter atendimento específico"""
    atendimento = (
        db.query(models.Atendimento)
        .filter(
            models.Atendimento.aluno_matricula == matricula, models.Atendimento.id == atendimento_id
        )
        .first()
    )
    if not atendimento:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado")
    return atendimento


@router.put(
    "/alunos/{matricula}/atendimentos/{atendimento_id}", response_model=schemas.AtendimentoResponse
)
def update_atendimento(
    matricula: str,
    atendimento_id: int,
    atendimento_update: schemas.AtendimentoUpdate,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
    db: Session = Depends(database.get_db),
):
    """Atualizar atendimento"""
    atendimento = (
        db.query(models.Atendimento)
        .filter(
            models.Atendimento.aluno_matricula == matricula, models.Atendimento.id == atendimento_id
        )
        .first()
    )
    if not atendimento:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado")

    update_data = _converter_horas(atendimento_update.model_dump(exclude_unset=True))

    # Se houver mudança de status_encaminhamento, registrar no histórico
    if "status_encaminhamento" in update_data and atendimento.necessita_encaminhamento:
        status_anterior = atendimento.status_encaminhamento
        status_novo = update_data["status_encaminhamento"]

        if status_anterior != status_novo:
            historico = models.HistoricoEncaminhamento(
                atendimento_id=atendimento_id,
                usuario_id=current_user.id,
                status_anterior=status_anterior,
                status_novo=status_novo,
            )
            db.add(historico)

    for key, value in update_data.items():
        setattr(atendimento, key, value)

    db.commit()
    db.refresh(atendimento)
    return atendimento


@router.delete("/alunos/{matricula}/atendimentos/{atendimento_id}")
def delete_atendimento(
    matricula: str,
    atendimento_id: int,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
    db: Session = Depends(database.get_db),
):
    """Excluir atendimento"""
    atendimento = (
        db.query(models.Atendimento)
        .filter(
            models.Atendimento.aluno_matricula == matricula, models.Atendimento.id == atendimento_id
        )
        .first()
    )
    if not atendimento:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado")

    db.delete(atendimento)
    db.commit()
    return {"message": "Atendimento excluído com sucesso"}


@router.get("/atendimentos", response_model=List[schemas.AtendimentoResponse])
def list_all_atendimentos(
    tipo: Optional[str] = None,
    status: Optional[str] = None,
    prioridade: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    limit: int = 100,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Listar todos os atendimentos do sistema com filtros"""
    query = db.query(models.Atendimento)
    if tipo:
        query = query.filter(models.Atendimento.tipo_atendimento == tipo)
    if status:
        query = query.filter(models.Atendimento.status == status)
    if prioridade:
        query = query.filter(models.Atendimento.prioridade == prioridade)
    if data_inicio:
        query = query.filter(models.Atendimento.data_atendimento >= data_inicio)
    if data_fim:
        query = query.filter(models.Atendimento.data_atendimento <= data_fim)
    return query.order_by(models.Atendimento.data_atendimento.desc()).limit(limit).all()


@router.get("/atendimentos/stats")
def stats_atendimentos(
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Estatísticas gerais de atendimentos"""

    total = db.query(models.Atendimento).count()
    com_encaminhamento = (
        db.query(models.Atendimento)
        .filter(models.Atendimento.necessita_encaminhamento == True)
        .count()
    )
    com_followup = (
        db.query(models.Atendimento).filter(models.Atendimento.necessita_followup == True).count()
    )

    # Por tipo
    por_tipo = {}
    for tipo, count in (
        db.query(models.Atendimento.tipo_atendimento, func.count(models.Atendimento.id))
        .group_by(models.Atendimento.tipo_atendimento)
        .all()
    ):
        por_tipo[tipo.value if hasattr(tipo, "value") else tipo] = count

    # Por status
    por_status = {}
    for s, count in (
        db.query(models.Atendimento.status, func.count(models.Atendimento.id))
        .group_by(models.Atendimento.status)
        .all()
    ):
        por_status[s.value if hasattr(s, "value") else s] = count

    # Por prioridade
    por_prioridade = {}
    for p, count in (
        db.query(models.Atendimento.prioridade, func.count(models.Atendimento.id))
        .group_by(models.Atendimento.prioridade)
        .all()
    ):
        por_prioridade[p] = count

    return {
        "total": total,
        "por_tipo": por_tipo,
        "por_status": por_status,
        "por_prioridade": por_prioridade,
        "com_encaminhamento": com_encaminhamento,
        "com_followup": com_followup,
    }


@router.get(
    "/atendimentos/{atendimento_id}/historico",
    response_model=List[schemas.HistoricoEncaminhamentoResponse],
)
def get_historico_encaminhamento(
    atendimento_id: int,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Obter histórico de mudanças de status de um encaminhamento"""
    historico = (
        db.query(models.HistoricoEncaminhamento)
        .filter(models.HistoricoEncaminhamento.atendimento_id == atendimento_id)
        .order_by(
            models.HistoricoEncaminhamento.data_mudanca.desc(),
            models.HistoricoEncaminhamento.id.desc(),
        )
        .all()
    )

    # Enriquecer com nome do usuário
    resultado = []
    for h in historico:
        usuario = db.query(models.Usuario).filter(models.Usuario.id == h.usuario_id).first()
        resultado.append({**h.__dict__, "usuario": usuario.nome if usuario else "Desconhecido"})

    return resultado


@router.get("/atendimentos/alertas-demora")
def get_alertas_demora_encaminhamento(
    dias_limite: int = 30,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Obter encaminhamentos que estão há mais de X dias no mesmo status.
    Útil para identificar casos que precisam de atenção.
    """

    # Buscar encaminhamentos com status SOLICITADO ou EM_ATENDIMENTO há mais de X dias
    data_limite = datetime.now() - timedelta(days=dias_limite)

    alertas = (
        db.query(models.Atendimento)
        .join(models.Aluno, models.Aluno.matricula == models.Atendimento.aluno_matricula)
        .filter(
            models.Atendimento.necessita_encaminhamento == True,
            models.Atendimento.status_encaminhamento.in_(["SOLICITADO", "EM_ATENDIMENTO"]),
            models.Atendimento.data_atendimento <= data_limite,
        )
        .all()
    )

    resultado = []
    for at in alertas:
        # Calcular dias em espera
        dias_espera = (
            (datetime.now().date() - at.data_atendimento).days if at.data_atendimento else 0
        )

        resultado.append(
            {
                "id": at.id,
                "aluno_matricula": at.aluno_matricula,
                "aluno_nome": at.aluno.nome if at.aluno else "N/A",
                "tipo_encaminhamento": at.tipo_encaminhamento,
                "status_encaminhamento": at.status_encaminhamento,
                "data_atendimento": (
                    at.data_atendimento.isoformat() if at.data_atendimento else None
                ),
                "dias_espera": dias_espera,
                "prioridade": at.prioridade,
            }
        )

    return {
        "total_alertas": len(resultado),
        "dias_limite": dias_limite,
        "alertas": resultado,
    }
