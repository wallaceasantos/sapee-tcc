from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas
from servico_comunicacao import disparar_mensagem_unificado

router = APIRouter()
# ============================================
# ENDPOINTS DE COMUNICAÇÕES
# ============================================


@router.post(
    "/comunicacoes", response_model=schemas.ComunicacaoResponse, status_code=status.HTTP_201_CREATED
)
def create_comunicacao(
    comunicacao_data: schemas.ComunicacaoCreate,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
    db: Session = Depends(database.get_db),
):
    """Registrar e enviar comunicação/notificação"""
    aluno = (
        db.query(models.Aluno)
        .filter(models.Aluno.matricula == comunicacao_data.aluno_matricula)
        .first()
    )
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Usar serviço unificado

    return disparar_mensagem_unificado(
        db=db,
        aluno_matricula=comunicacao_data.aluno_matricula,
        usuario_id=current_user.id,
        destinatario_tipo=comunicacao_data.destinatario_tipo,
        destinatario_nome=comunicacao_data.destinatario_nome,
        destinatario_contato=comunicacao_data.destinatario_contato,
        canal=comunicacao_data.canal,
        template_id=comunicacao_data.template_id or "MANUAL",
        eh_lembrete=comunicacao_data.eh_lembrete,
        data_agendada=comunicacao_data.data_agendada,
        modulo_origem="COMUNICACOES",
        contexto={
            "nome_aluno": aluno.nome,
            "nome_responsavel": comunicacao_data.destinatario_nome or "Responsável",
            "mensagem": comunicacao_data.mensagem,
            "assunto": comunicacao_data.assunto,
        },
    )


@router.post(
    "/comunicacoes/disparar",
    response_model=schemas.ComunicacaoResponse,
    status_code=status.HTTP_201_CREATED,
)
def disparar_comunicacao(
    payload: dict,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
    db: Session = Depends(database.get_db),
):
    """
    Endpoint unificado para gerar mensagem, enviar e registrar no histórico.
    """

    aluno_matricula = payload.get("aluno_matricula")
    template_id = payload.get("template_id", "MANUAL")
    contexto = payload.get("contexto", {})
    canal = payload.get("canal", "SISTEMA")
    destinatario_tipo = payload.get("destinatario_tipo", "RESPONSAVEL")
    destinatario_nome = payload.get("destinatario_nome")
    destinatario_contato = payload.get("destinatario_contato")
    modulo_origem = payload.get("modulo_origem")
    eh_lembrete = payload.get("eh_lembrete", False)
    data_agendada_str = payload.get("data_agendada")

    data_agendada = None
    if data_agendada_str:
        try:
            data_agendada = datetime.fromisoformat(data_agendada_str)
        except (ValueError, TypeError):
            pass

    try:
        comunicacao = disparar_mensagem_unificado(
            db=db,
            aluno_matricula=aluno_matricula,
            usuario_id=current_user.id,
            template_id=template_id,
            contexto=contexto,
            canal=canal,
            destinatario_tipo=destinatario_tipo,
            destinatario_nome=destinatario_nome,
            destinatario_contato=destinatario_contato,
            modulo_origem=modulo_origem,
            eh_lembrete=eh_lembrete,
            data_agendada=data_agendada,
        )
        return comunicacao
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao disparar comunicação: {str(e)}")


@router.get("/alunos/{matricula}/comunicacoes", response_model=List[schemas.ComunicacaoResponse])
def list_comunicacoes_aluno(
    matricula: str,
    tipo: Optional[str] = None,
    canal: Optional[str] = None,
    status: Optional[str] = None,
    eh_lembrete: Optional[bool] = None,
    limit: int = 100,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Listar comunicações de um aluno"""
    query = db.query(models.Comunicacao).filter(models.Comunicacao.aluno_matricula == matricula)
    if tipo:
        query = query.filter(models.Comunicacao.tipo_comunicacao == tipo)
    if canal:
        query = query.filter(models.Comunicacao.canal == canal)
    if status:
        query = query.filter(models.Comunicacao.status == status)
    if eh_lembrete is not None:
        query = query.filter(models.Comunicacao.eh_lembrete == eh_lembrete)
    return query.order_by(models.Comunicacao.criado_at.desc()).limit(limit).all()


@router.get("/comunicacoes", response_model=List[schemas.ComunicacaoResponse])
def list_all_comunicacoes(
    tipo: Optional[str] = None,
    canal: Optional[str] = None,
    status: Optional[str] = None,
    eh_lembrete: Optional[bool] = None,
    limit: int = 200,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Listar todas as comunicações do sistema com filtros"""
    query = db.query(models.Comunicacao)
    if tipo:
        query = query.filter(models.Comunicacao.tipo_comunicacao == tipo)
    if canal:
        query = query.filter(models.Comunicacao.canal == canal)
    if status:
        query = query.filter(models.Comunicacao.status == status)
    if eh_lembrete is not None:
        query = query.filter(models.Comunicacao.eh_lembrete == eh_lembrete)
    return query.order_by(models.Comunicacao.criado_at.desc()).limit(limit).all()


@router.put("/comunicacoes/{comunicacao_id}", response_model=schemas.ComunicacaoResponse)
def update_comunicacao(
    comunicacao_id: int,
    comunicacao_update: schemas.ComunicacaoUpdate,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
    db: Session = Depends(database.get_db),
):
    """Atualizar status ou resposta de comunicação"""
    comunicacao = (
        db.query(models.Comunicacao).filter(models.Comunicacao.id == comunicacao_id).first()
    )
    if not comunicacao:
        raise HTTPException(status_code=404, detail="Comunicação não encontrada")

    update_data = comunicacao_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(comunicacao, key, value)

    # Auto-update timestamps
    if comunicacao_update.status and comunicacao_update.status in ["ENVIADA", "ENTREGUE", "LIDA"]:
        comunicacao.data_envio_efetivo = comunicacao.data_envio_efetivo or datetime.now()
    if comunicacao_update.data_leitura:
        comunicacao.status = "LIDA"

    db.commit()
    db.refresh(comunicacao)
    return comunicacao


@router.delete("/comunicacoes/{comunicacao_id}")
def delete_comunicacao(
    comunicacao_id: int,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
    db: Session = Depends(database.get_db),
):
    """Excluir comunicação"""
    comunicacao = (
        db.query(models.Comunicacao).filter(models.Comunicacao.id == comunicacao_id).first()
    )
    if not comunicacao:
        raise HTTPException(status_code=404, detail="Comunicação não encontrada")

    db.delete(comunicacao)
    db.commit()
    return {"message": "Comunicação excluída com sucesso"}


@router.get("/comunicacoes/stats")
def stats_comunicacoes(
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Estatísticas gerais de comunicações"""

    total = db.query(models.Comunicacao).count()
    pendentes = db.query(models.Comunicacao).filter(models.Comunicacao.status == "PENDENTE").count()
    falhas = db.query(models.Comunicacao).filter(models.Comunicacao.status == "FALHA").count()

    hoje = datetime.now().date()
    lembretes_hoje = (
        db.query(models.Comunicacao)
        .filter(
            models.Comunicacao.eh_lembrete == True,
            func.date(models.Comunicacao.data_agendada) == hoje,
        )
        .count()
    )

    # Por tipo
    por_tipo = {}
    for t, count in (
        db.query(models.Comunicacao.tipo_comunicacao, func.count(models.Comunicacao.id))
        .group_by(models.Comunicacao.tipo_comunicacao)
        .all()
    ):
        por_tipo[t.value if hasattr(t, "value") else t] = count

    # Por canal
    por_canal = {}
    for c, count in (
        db.query(models.Comunicacao.canal, func.count(models.Comunicacao.id))
        .group_by(models.Comunicacao.canal)
        .all()
    ):
        por_canal[c.value if hasattr(c, "value") else c] = count

    # Por status
    por_status = {}
    for s, count in (
        db.query(models.Comunicacao.status, func.count(models.Comunicacao.id))
        .group_by(models.Comunicacao.status)
        .all()
    ):
        por_status[s.value if hasattr(s, "value") else s] = count

    return {
        "total": total,
        "por_tipo": por_tipo,
        "por_canal": por_canal,
        "por_status": por_status,
        "pendentes": pendentes,
        "falhas": falhas,
        "lembretes_hoje": lembretes_hoje,
    }


# ============================================
# ENDPOINTS DE TEMPLATES DE COMUNICAÇÃO
# ============================================


@router.get("/templates-comunicacao", response_model=List[schemas.TemplateComunicacaoResponse])
def list_templates(
    tipo: Optional[str] = None,
    canal: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Listar templates de comunicação"""
    query = db.query(models.TemplateComunicacao).filter(models.TemplateComunicacao.ativo == True)
    if tipo:
        query = query.filter(models.TemplateComunicacao.tipo_comunicacao == tipo)
    if canal:
        query = query.filter(models.TemplateComunicacao.canal == canal)
    return query.order_by(models.TemplateComunicacao.nome).all()


@router.post(
    "/templates-comunicacao",
    response_model=schemas.TemplateComunicacaoResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_template(
    template_data: schemas.TemplateComunicacaoCreate,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
    db: Session = Depends(database.get_db),
):
    """Criar novo template de comunicação"""
    existing = (
        db.query(models.TemplateComunicacao)
        .filter(models.TemplateComunicacao.codigo == template_data.codigo)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Template com este código já existe")

    db_template = models.TemplateComunicacao(**template_data.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.put(
    "/templates-comunicacao/{template_id}", response_model=schemas.TemplateComunicacaoResponse
)
def update_template(
    template_id: int,
    template_update: schemas.TemplateComunicacaoUpdate,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
    db: Session = Depends(database.get_db),
):
    """Atualizar template de comunicação"""
    template = (
        db.query(models.TemplateComunicacao)
        .filter(models.TemplateComunicacao.id == template_id)
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    update_data = template_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    db.commit()
    db.refresh(template)
    return template
