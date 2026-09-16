import json
from datetime import date, datetime
from typing import List, Optional

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

import auth
import database
import models
import schemas
from routes.alunos import _get_motivo_risco

router = APIRouter()
# ============================================
# ENDPOINTS - INTERVENÇÕES
# ============================================


@router.get("/alunos/{matricula}/intervencoes", response_model=List[schemas.IntervencaoResponse])
def list_intervencoes_by_aluno(
    matricula: str,
    status_filter: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Listar intervenções de um aluno específico.

    Filtros disponíveis:
    - status: Filtrar por status (PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA)
    """

    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    # Query base
    query = (
        db.query(models.Intervencao)
        .options(joinedload(models.Intervencao.aluno), joinedload(models.Intervencao.usuario))
        .filter(models.Intervencao.aluno_id == matricula)
    )

    # Filtrar por status se fornecido
    if status_filter:
        query = query.filter(models.Intervencao.status == status_filter)

    # Ordenar por data (mais recente primeiro)
    intervencoes = query.order_by(models.Intervencao.data_intervencao.desc()).all()

    return intervencoes


@router.get("/intervencoes/sugestoes-pendentes")
def listar_sugestoes_pendentes(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Lista rascunhos de intervenções auto-geradas pendentes de aprovação."""

    query = (
        db.query(models.Intervencao)
        .options(joinedload(models.Intervencao.aluno), joinedload(models.Intervencao.usuario))
        .filter(models.Intervencao.status == models.StatusIntervencao.RASCUNHO)
    )

    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.Intervencao.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )

    return query.order_by(models.Intervencao.criado_at.desc()).all()


@router.post("/intervencoes/{intervencao_id}/aprovar")
def aprovar_intervencao(
    intervencao_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Aprova um rascunho de intervenção, atribuindo ao usuário atual e definindo o ciclo de 6 meses."""

    intervencao = (
        db.query(models.Intervencao).filter(models.Intervencao.id == intervencao_id).first()
    )

    if not intervencao:
        raise HTTPException(status_code=404, detail="Intervenção não encontrada")

    if intervencao.status != models.StatusIntervencao.RASCUNHO:
        raise HTTPException(status_code=400, detail="Apenas rascunhos podem ser aprovados")

    hoje = datetime.now().date()

    # Atualiza status e responsáveis
    intervencao.status = models.StatusIntervencao.PENDENTE
    intervencao.usuario_id = current_user.id
    intervencao.data_aprovacao = hoje
    intervencao.auto_gerada = True

    # Define o ciclo de intervenção: 6 meses a partir de hoje
    intervencao.data_limite = hoje + relativedelta(months=6)

    db.commit()
    db.refresh(intervencao)

    return {
        "message": "Intervenção aprovada com sucesso",
        "id": intervencao.id,
        "ciclo_inicio": str(intervencao.data_aprovacao),
        "ciclo_fim": str(intervencao.data_limite),
    }


@router.post("/intervencoes/{intervencao_id}/rejeitar")
def rejeitar_intervencao(
    intervencao_id: int,
    motivo: str = "",
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Rejeita um rascunho de intervenção."""
    intervencao = (
        db.query(models.Intervencao).filter(models.Intervencao.id == intervencao_id).first()
    )

    if not intervencao:
        raise HTTPException(status_code=404, detail="Intervenção não encontrada")

    if intervencao.status != models.StatusIntervencao.RASCUNHO:
        raise HTTPException(status_code=400, detail="Apenas rascunhos podem ser rejeitados")

    intervencao.status = models.StatusIntervencao.CANCELADA
    intervencao.data_rejeicao = datetime.now().date()
    intervencao.motivo_rejeicao = motivo

    db.commit()

    return {"message": "Intervenção rejeitada"}


@router.get("/intervencoes/gerar-sugestoes")
def gerar_sugestoes_automaticas(
    nivel_risco: str = "ALTO",  # Parâmetro para definir qual risco buscar (ALTO ou MEDIO)
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Gera rascunhos de intervenção para alunos com risco específico.
    Padrão: ALTO/MUITO_ALTO. Se nivel_risco='MEDIO', busca risco MÉDIO.
    """

    # 1. Buscar alunos com risco definido
    subq_pred = select(
        models.Predicao.aluno_id,
        models.Predicao.risco_evasao,
        models.Predicao.nivel_risco,
        func.row_number()
        .over(partition_by=models.Predicao.aluno_id, order_by=models.Predicao.data_predicao.desc())
        .label("rn"),
    ).subquery()

    # Lógica de filtro baseada no parâmetro
    niveis_alvo = ["MEDIO"] if nivel_risco.upper() == "MEDIO" else ["ALTO", "MUITO_ALTO"]

    alunos_risco = (
        db.query(subq_pred)
        .filter(subq_pred.c.nivel_risco.in_(niveis_alvo), subq_pred.c.rn == 1)
        .all()
    )

    if not alunos_risco:
        return {
            "message": f"Nenhum aluno com risco {nivel_risco} encontrado",
            "sugestoes_geradas": 0,
        }

    # 2. Alunos que já têm intervenção ativa ou rascunho
    alunos_com_intervencao = (
        db.query(models.Intervencao.aluno_id)
        .filter(models.Intervencao.status.in_(["PENDENTE", "EM_ANDAMENTO", "RASCUNHO"]))
        .distinct()
        .all()
    )
    matriculas_com_intervencao = set(a.aluno_id for a in alunos_com_intervencao)

    # 3. Gerar rascunhos
    sugestoes_geradas = 0

    for p in alunos_risco:
        if p.aluno_id in matriculas_com_intervencao:
            continue

        aluno = db.query(models.Aluno).filter(models.Aluno.matricula == p.aluno_id).first()
        if not aluno:
            continue

        risco = float(p.risco_evasao) if p.risco_evasao else 0
        nivel = p.nivel_risco

        # Determinar tipo de intervenção baseado no perfil
        tipo = "Acompanhamento Pedagógico"
        descricao = ""
        prioridade = "ALTA"

        if nivel == "MUITO_ALTO" or risco >= 80:
            tipo = "Reunião com Responsáveis"
            prioridade = "URGENTE"
            descricao = (
                f"Aluno em risco crítico ({risco:.0f}%). Necessária reunião urgente com família."
            )
        elif nivel == "ALTO" and risco >= 60:
            tipo = "Acompanhamento Pedagógico"
            prioridade = "ALTA"
            descricao = f"Risco elevado ({risco:.0f}%). Monitoramento próximo necessário."
        elif nivel == "MEDIO":
            # Lógica específica para Monitoramento Preventivo (Risco Médio)
            prioridade = "MEDIA"
            if aluno.frequencia and float(aluno.frequencia) < 75:
                tipo = "Orientação Pedagógica"
                descricao = f"Frequência em atenção ({aluno.frequencia}%). Reforçar importância da presença."
            elif aluno.trabalha:
                tipo = "Apoio Social"
                descricao = "Aluno trabalhador. Verificar conciliação estudo/trabalho."
            else:
                tipo = "Acompanhamento Preventivo"
                descricao = f"Risco médio identificado ({risco:.0f}%). Manter monitoramento."
        elif aluno.frequencia and float(aluno.frequencia) < 60:
            tipo = "Reunião com Aluno"
            descricao = f"Frequência crítica ({aluno.frequencia}%). Conversar sobre permanência."
        elif aluno.frequencia and float(aluno.frequencia) < 75:
            tipo = "Acompanhamento Pedagógico"
            descricao = f"Frequência baixa ({aluno.frequencia}%)+média {aluno.media_geral}. Plano de recuperação sugerido."
        elif aluno.media_geral and float(aluno.media_geral) < 5:
            tipo = "Reforço Escolar"
            descricao = f"Média crítica ({aluno.media_geral}). Encaminhar para reforço."
        elif aluno.trabalha:
            tipo = "Orientação Profissional"
            descricao = f"Aluno trabalha + risco {risco:.0f}%. Avaliar conciliação estudo/trabalho."
        else:
            descricao = f"Aluno em risco {nivel} ({risco:.0f}%). Avaliação pedagógica necessária."

        # Criar rascunho
        rascunho = models.Intervencao(
            aluno_id=aluno.matricula,
            usuario_id=None,  # Sem responsável ainda
            data_intervencao=datetime.now().date(),
            tipo=tipo,
            descricao=descricao,
            status=models.StatusIntervencao.RASCUNHO,
            prioridade=prioridade,
            auto_gerada=True,
            motivo_risco=f'{{"nivel":"{nivel}","score":{risco:.0f},"fatores":"{aluno.frequencia}% freq, {aluno.media_geral} media"}}',
        )

        db.add(rascunho)
        sugestoes_geradas += 1
        matriculas_com_intervencao.add(aluno.matricula)

    db.commit()

    return {
        "message": f"{sugestoes_geradas} sugestões geradas",
        "sugestoes_geradas": sugestoes_geradas,
    }


@router.get("/intervencoes", response_model=List[schemas.IntervencaoResponse])
def list_all_intervencoes(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    curso_id: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Listar todas as intervenções do sistema (com filtros).

    Filtros disponíveis:
    - status: Filtrar por status (PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA)
    - curso_id: Filtrar por curso (apenas ADMIN ou COORDENADOR)

    Para COORDENADOR/PEDAGOGO, filtra automaticamente pelo curso do usuário.
    """

    # Query base com joins
    query = db.query(models.Intervencao).options(
        joinedload(models.Intervencao.aluno).joinedload(models.Aluno.curso),
        joinedload(models.Intervencao.usuario),
    )

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.Intervencao.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )

    # Filtro adicional por curso
    if curso_id and current_user.role.nome == "ADMIN":
        query = query.join(models.Intervencao.aluno).filter(models.Aluno.curso_id == curso_id)

    # Filtrar por status se fornecido
    if status_filter:
        query = query.filter(models.Intervencao.status == status_filter)

    # Ordenar por data (mais recente primeiro)
    intervencoes = (
        query.order_by(models.Intervencao.data_intervencao.desc()).offset(skip).limit(limit).all()
    )

    return intervencoes


@router.get("/intervencoes/{intervencao_id}", response_model=schemas.IntervencaoResponse)
def get_intervencao(
    intervencao_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Obter intervenção por ID"""

    intervencao = (
        db.query(models.Intervencao)
        .options(joinedload(models.Intervencao.aluno), joinedload(models.Intervencao.usuario))
        .filter(models.Intervencao.id == intervencao_id)
        .first()
    )

    if not intervencao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Intervenção não encontrada"
        )

    # Verificar permissão (apenas ADMIN ou mesmo curso)
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        if intervencao.aluno.curso_id != current_user.curso_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para visualizar esta intervenção",
            )

    return intervencao


@router.post("/alunos/{matricula}/intervencoes", response_model=schemas.IntervencaoResponse)
def create_intervencao(
    matricula: str,
    intervencao: schemas.IntervencaoCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Criar nova intervenção para um aluno.

    A intervenção é registrada automaticamente com o usuário atual.
    """

    # Verificar se aluno existe
    aluno = (
        db.query(models.Aluno)
        .options(joinedload(models.Aluno.curso))
        .filter(models.Aluno.matricula == matricula)
        .first()
    )

    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    # Verificar permissão (apenas ADMIN ou mesmo curso)
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        if aluno.curso_id != current_user.curso_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para criar intervenção para este aluno",
            )

    # Calcular ciclo de 6 meses
    hoje = datetime.now().date()
    data_limite = hoje + relativedelta(months=6)

    # Buscar última predição do aluno para preencher motivo_risco
    ultima_predicao = (
        db.query(models.Predicao)
        .filter(models.Predicao.aluno_id == matricula)
        .order_by(models.Predicao.data_predicao.desc())
        .first()
    )

    motivo_risco_json = None
    if ultima_predicao:
        score = ultima_predicao.risco_evasao
        motivos = _get_motivo_risco(aluno, score)
        motivo_risco_json = f'{{"nivel":"{ultima_predicao.nivel_risco.value if hasattr(ultima_predicao.nivel_risco, "value") else ultima_predicao.nivel_risco}","score":{score:.0f},"fatores":"{motivos}"}}'
    elif aluno.frequencia or aluno.media_geral:
        # Se não tem predição, cria um motivo básico baseado nos dados do aluno
        score_estimado = 0
        if aluno.frequencia and float(aluno.frequencia) < 75:
            score_estimado += 30
        if aluno.media_geral and float(aluno.media_geral) < 6:
            score_estimado += 40
        if aluno.historico_reprovas and int(aluno.historico_reprovas) > 0:
            score_estimado += 20
        motivos = _get_motivo_risco(aluno, score_estimado)
        nivel = "ALTO" if score_estimado >= 70 else "MEDIO" if score_estimado >= 40 else "BAIXO"
        motivo_risco_json = (
            f'{{"nivel":"{nivel}","score":{score_estimado:.0f},"fatores":"{motivos}"}}'
        )

    # Criar intervenção com ciclo automático
    db_intervencao = models.Intervencao(
        **intervencao.model_dump(),
        aluno_id=matricula,
        usuario_id=current_user.id,  # Usa o ID do usuário autenticado
        data_limite=data_limite,  # Define o prazo de 6 meses
        motivo_risco=motivo_risco_json,  # Preenche com score e fatores do aluno
    )

    db.add(db_intervencao)
    db.commit()
    db.refresh(db_intervencao)

    # Recarregar com relacionamentos
    db_intervencao = (
        db.query(models.Intervencao)
        .options(joinedload(models.Intervencao.aluno), joinedload(models.Intervencao.usuario))
        .filter(models.Intervencao.id == db_intervencao.id)
        .first()
    )

    # Log de auditoria
    audit_log = models.AuditLog(
        usuario_id=current_user.id,
        acao="CRIAR_INTERVENCAO",
        detalhes=f"Intervenção criada para aluno {matricula} ({aluno.nome})",
        ip_address=None,
    )
    db.add(audit_log)
    db.commit()

    return db_intervencao


@router.put("/intervencoes/{intervencao_id}", response_model=schemas.IntervencaoResponse)
def update_intervencao(
    intervencao_id: int,
    intervencao_update: schemas.IntervencaoUpdate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Atualizar intervenção existente.

    Permite atualizar status, descrição, observações e data de conclusão.
    """

    db_intervencao = (
        db.query(models.Intervencao)
        .options(joinedload(models.Intervencao.aluno), joinedload(models.Intervencao.usuario))
        .filter(models.Intervencao.id == intervencao_id)
        .first()
    )

    if not db_intervencao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Intervenção não encontrada"
        )

    # Verificar permissão
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        if db_intervencao.aluno.curso_id != current_user.curso_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para atualizar esta intervenção",
            )

    # Atualizar campos
    update_data = intervencao_update.model_dump(exclude_unset=True)

    # Auto-set data_conclusao se status for CONCLUIDA
    if update_data.get("status") == "CONCLUIDA" and not db_intervencao.data_conclusao:
        update_data["data_conclusao"] = date.today()

    for key, value in update_data.items():
        setattr(db_intervencao, key, value)

    db.commit()
    db.refresh(db_intervencao)

    # Recarregar com relacionamentos
    db_intervencao = (
        db.query(models.Intervencao)
        .options(joinedload(models.Intervencao.aluno), joinedload(models.Intervencao.usuario))
        .filter(models.Intervencao.id == db_intervencao.id)
        .first()
    )

    # Log de auditoria
    audit_log = models.AuditLog(
        usuario_id=current_user.id,
        acao="ATUALIZAR_INTERVENCAO",
        detalhes=f"Intervenção {intervencao_id} atualizada para aluno {db_intervencao.aluno_id}",
        ip_address=None,
    )
    db.add(audit_log)
    db.commit()

    return db_intervencao


@router.delete("/intervencoes/{intervencao_id}")
def delete_intervencao(
    intervencao_id: int,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """
    Excluir intervenção (APENAS ADMIN).
    """
    db_intervencao = (
        db.query(models.Intervencao).filter(models.Intervencao.id == intervencao_id).first()
    )

    if not db_intervencao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Intervenção não encontrada"
        )

    db.delete(db_intervencao)
    db.commit()

    # Log de auditoria
    audit_log = models.AuditLog(
        usuario_id=current_user.id,
        acao="EXCLUIR_INTERVENCAO",
        detalhes=f"Intervenção {intervencao_id} excluída",
        ip_address=None,
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Intervenção excluída com sucesso"}


@router.get("/dashboard/intervencoes-stats")
def get_intervencoes_stats(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Obter estatísticas de intervenções para dashboard.
    """

    # Query base
    query = db.query(models.Intervencao)

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.Intervencao.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )

    # Contar por status
    pendentes = query.filter(models.Intervencao.status == models.StatusIntervencao.PENDENTE).count()
    em_andamento = query.filter(
        models.Intervencao.status == models.StatusIntervencao.EM_ANDAMENTO
    ).count()
    concluidas = query.filter(
        models.Intervencao.status == models.StatusIntervencao.CONCLUIDA
    ).count()
    canceladas = query.filter(
        models.Intervencao.status == models.StatusIntervencao.CANCELADA
    ).count()

    # Contar por prioridade
    urgentes = query.filter(models.Intervencao.prioridade == "URGENTE").count()
    altas = query.filter(models.Intervencao.prioridade == "ALTA").count()

    # Total ativas
    ativas = pendentes + em_andamento

    # Taxa de conclusão
    total = pendentes + em_andamento + concluidas + canceladas
    taxa_conclusao = round((concluidas / total * 100), 1) if total > 0 else 0

    return {
        "total": total,
        "ativas": ativas,
        "pendentes": pendentes,
        "em_andamento": em_andamento,
        "concluidas": concluidas,
        "canceladas": canceladas,
        "urgentes": urgentes,
        "altas": altas,
        "taxa_conclusao": taxa_conclusao,
    }


# ============================================
# INTERVENÇÃO AUTOMÁTICA (SUGESTÕES BASEADAS EM RISCO)
# ============================================


@router.get("/intervencoes/sugerir/{matricula}")
def sugerir_intervencao_automatica(
    matricula: str,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Sugere intervenções automáticas baseadas no risco do aluno.
    """
    # Buscar aluno
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()

    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Buscar última predição
    predicao = (
        db.query(models.Predicao)
        .filter(models.Predicao.aluno_id == matricula)
        .order_by(models.Predicao.data_predicao.desc())
        .first()
    )

    # Buscar último questionário
    questionario = (
        db.query(models.QuestionarioPsicossocial)
        .filter(models.QuestionarioPsicossocial.aluno_matricula == matricula)
        .first()
    )

    intervencoes_sugeridas = []
    fatores_risco = []

    # Regras baseadas em frequência
    if aluno.frequencia and aluno.frequencia < 60:
        intervencoes_sugeridas.append(
            {
                "tipo": "Reunião com Responsáveis",
                "prioridade": "URGENTE",
                "descricao": "Convocar responsáveis para reunião urgente",
                "motivo": f"Frequência crítica ({aluno.frequencia}%)",
            }
        )
        fatores_risco.append("Frequência abaixo de 60%")
    elif aluno.frequencia and aluno.frequencia < 75:
        intervencoes_sugeridas.append(
            {
                "tipo": "Alerta WhatsApp",
                "prioridade": "ALTA",
                "descricao": "Enviar alerta por WhatsApp para aluno e responsáveis",
                "motivo": f"Frequência abaixo de 75% ({aluno.frequencia}%)",
            }
        )
        fatores_risco.append("Frequência abaixo de 75%")

    # Regras baseadas em média
    if aluno.media_geral and float(aluno.media_geral) < 4.0:
        intervencoes_sugeridas.append(
            {
                "tipo": "Monitoria",
                "prioridade": "ALTA",
                "descricao": "Encaminhar para monitoria nas disciplinas críticas",
                "motivo": f"Média muito baixa ({aluno.media_geral})",
            }
        )
        fatores_risco.append("Desempenho acadêmico crítico")
    elif aluno.media_geral and float(aluno.media_geral) < 5.0:
        intervencoes_sugeridas.append(
            {
                "tipo": "Reforço Escolar",
                "prioridade": "MEDIA",
                "descricao": "Agendar reforço escolar",
                "motivo": f"Média baixa ({aluno.media_geral})",
            }
        )
        fatores_risco.append("Desempenho acadêmico instável")

    # Regras baseadas em reprovas
    if aluno.historico_reprovas and aluno.historico_reprovas > 3:
        intervencoes_sugeridas.append(
            {
                "tipo": "Revisão Pedagógica",
                "prioridade": "ALTA",
                "descricao": "Revisar carga horária e dificuldades do aluno",
                "motivo": f"{aluno.historico_reprovas} reprovações",
            }
        )
        fatores_risco.append(f"Múltiplas reprovações ({aluno.historico_reprovas})")

    # Regras baseadas em questionário psicossocial
    if questionario:
        if questionario.nivel_risco_psicossocial in ["ALTO", "MUITO_ALTO"]:
            fatores = (
                json.loads(questionario.fatores_criticos) if questionario.fatores_criticos else []
            )

            if "ansiedade_severa" in fatores or "sintomas_depressivos" in fatores:
                intervencoes_sugeridas.append(
                    {
                        "tipo": "Apoio Psicológico",
                        "prioridade": "URGENTE",
                        "descricao": "Encaminhar para atendimento psicológico",
                        "motivo": "Indicadores de saúde mental",
                    }
                )
                fatores_risco.append("Saúde mental")

            if "isolamento_social" in fatores or "falta_pertencimento" in fatores:
                intervencoes_sugeridas.append(
                    {
                        "tipo": "Integração Social",
                        "prioridade": "MEDIA",
                        "descricao": "Incluir em grupo de estudos ou atividades extracurriculares",
                        "motivo": "Isolamento social detectado",
                    }
                )
                fatores_risco.append("Isolamento social")

            if "conflito_trabalho_estudo" in fatores:
                intervencoes_sugeridas.append(
                    {
                        "tipo": "Apoio Social",
                        "prioridade": "ALTA",
                        "descricao": "Agendar atendimento com assistente social",
                        "motivo": "Conflito trabalho-estudo",
                    }
                )
                fatores_risco.append("Conflito trabalho-estudo")

    # Adicionar fator da predição
    if predicao:
        if predicao.nivel_risco == "ALTO":
            fatores_risco.append(f"Risco de evasão ALTO ({predicao.risco_evasao}%)")
        elif predicao.nivel_risco == "MEDIO":
            fatores_risco.append(f"Risco de evasão MÉDIO ({predicao.risco_evasao}%)")

    return {
        "aluno_matricula": matricula,
        "aluno_nome": aluno.nome,
        "intervencoes_sugeridas": intervencoes_sugeridas,
        "fatores_risco": fatores_risco,
        "total_sugestoes": len(intervencoes_sugeridas),
    }
