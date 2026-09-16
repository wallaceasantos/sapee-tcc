from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas

router = APIRouter()
# ============================================
# ENDPOINTS DE NOTAS POR DISCIPLINA
# ============================================


@router.post("/alunos/{matricula}/notas", response_model=schemas.NotaDisciplinaResponse)
def create_nota_disciplina(
    matricula: str,
    nota_data: schemas.NotaDisciplinaCreate,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PROFESSOR")),
    db: Session = Depends(database.get_db),
):
    """Criar nota de aluno por disciplina"""
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    try:
        db_nota = models.NotaDisciplina(aluno_matricula=matricula, **nota_data.model_dump())
        db.add(db_nota)
        db.commit()
        db.refresh(db_nota)
        return db_nota
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erro ao criar nota: {str(e)}")


@router.get("/alunos/{matricula}/notas", response_model=List[schemas.NotaDisciplinaResponse])
def list_notas_disciplina(
    matricula: str,
    periodo_letivo: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Listar notas de um aluno por disciplina"""
    query = db.query(models.NotaDisciplina).filter(
        models.NotaDisciplina.aluno_matricula == matricula
    )
    if periodo_letivo:
        query = query.filter(models.NotaDisciplina.periodo_letivo == periodo_letivo)
    return query.order_by(
        models.NotaDisciplina.periodo_letivo.desc(), models.NotaDisciplina.bimestre
    ).all()


@router.get("/alunos/{matricula}/notas/{nota_id}", response_model=schemas.NotaDisciplinaResponse)
def get_nota_disciplina(
    matricula: str,
    nota_id: int,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Obter nota específica"""
    nota = (
        db.query(models.NotaDisciplina)
        .filter(
            models.NotaDisciplina.aluno_matricula == matricula, models.NotaDisciplina.id == nota_id
        )
        .first()
    )
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    return nota


@router.put("/alunos/{matricula}/notas/{nota_id}", response_model=schemas.NotaDisciplinaResponse)
def update_nota_disciplina(
    matricula: str,
    nota_id: int,
    nota_update: schemas.NotaDisciplinaUpdate,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PROFESSOR")),
    db: Session = Depends(database.get_db),
):
    """Atualizar nota de aluno por disciplina"""
    nota = (
        db.query(models.NotaDisciplina)
        .filter(
            models.NotaDisciplina.aluno_matricula == matricula, models.NotaDisciplina.id == nota_id
        )
        .first()
    )
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")

    update_data = nota_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(nota, key, value)

    db.commit()
    db.refresh(nota)
    return nota


@router.delete("/alunos/{matricula}/notas/{nota_id}")
def delete_nota_disciplina(
    matricula: str,
    nota_id: int,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PROFESSOR")),
    db: Session = Depends(database.get_db),
):
    """Excluir nota"""
    nota = (
        db.query(models.NotaDisciplina)
        .filter(
            models.NotaDisciplina.aluno_matricula == matricula, models.NotaDisciplina.id == nota_id
        )
        .first()
    )
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")

    db.delete(nota)
    db.commit()
    return {"message": "Nota excluída com sucesso"}


@router.get("/alunos/{matricula}/notas/resumo")
def resumo_notas_disciplina(
    matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Resumo das notas do aluno: média geral, disciplinas com reprovação, etc."""
    notas = (
        db.query(models.NotaDisciplina)
        .filter(models.NotaDisciplina.aluno_matricula == matricula)
        .all()
    )

    if not notas:
        return {
            "total_notas": 0,
            "media_geral": None,
            "disciplinas_reprovacao": [],
            "por_periodo": {},
        }

    # Média geral
    media_geral = sum(n.nota for n in notas) / len(notas)

    # Disciplinas com reprovação
    reprovas = {}
    for nota in notas:
        if nota.situacao == models.SituacaoNota.REPROVADO:
            if nota.disciplina not in reprovas:
                reprovas[nota.disciplina] = 0
            reprovas[nota.disciplina] += 1

    # Por período
    por_periodo = {}
    for nota in notas:
        periodo = nota.periodo_letivo
        if periodo not in por_periodo:
            por_periodo[periodo] = []
        por_periodo[periodo].append(
            {
                "disciplina": nota.disciplina,
                "bimestre": nota.bimestre,
                "nota": float(nota.nota),
                "situacao": (
                    nota.situacao.value if hasattr(nota.situacao, "value") else nota.situacao
                ),
            }
        )

    return {
        "total_notas": len(notas),
        "media_geral": round(media_geral, 2),
        "disciplinas_reprovacao": [{"disciplina": k, "qtd": v} for k, v in reprovas.items()],
        "por_periodo": por_periodo,
    }


# ============================================
# ENDPOINT UNIFICADO - JORNADA DO ALUNO
# ============================================


@router.get("/alunos/{matricula}/jornada")
def get_jornada_aluno(
    matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """
    Timeline unificada da jornada do aluno.
    Agrega todos os eventos cronologicamente:
    - Predições ao longo do tempo
    - Intervenções realizadas
    - Frequência mensal
    - Questionários respondidos
    - Alertas de faltas
    - Notas por disciplina
    """
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    eventos = []

    # 1. Predições
    predicoes = (
        db.query(models.Predicao)
        .filter(models.Predicao.aluno_id == matricula)
        .order_by(models.Predicao.data_predicao.desc())
        .all()
    )
    for p in predicoes:
        eventos.append(
            {
                "tipo": "PREDICAO",
                "data": p.data_predicao.isoformat() if p.data_predicao else None,
                "titulo": f"Predição: {p.nivel_risco.value if hasattr(p.nivel_risco, 'value') else p.nivel_risco}",
                "detalhes": {
                    "risco_evasao": float(p.risco_evasao),
                    "nivel_risco": (
                        p.nivel_risco.value if hasattr(p.nivel_risco, "value") else p.nivel_risco
                    ),
                    "fatores_principais": p.fatores_principais,
                    "modelo_versao": p.modelo_ml_versao,
                },
                "cor": "purple",
                "icone": "trend-up",
            }
        )

    # 2. Intervenções
    intervencoes = (
        db.query(models.Intervencao)
        .filter(models.Intervencao.aluno_id == matricula)
        .order_by(models.Intervencao.data_intervencao.desc())
        .all()
    )
    for i in intervencoes:
        eventos.append(
            {
                "tipo": "INTERVENCAO",
                "data": i.data_intervencao.isoformat() if i.data_intervencao else None,
                "titulo": f"Intervenção: {i.tipo}",
                "detalhes": {
                    "id": i.id,
                    "tipo": i.tipo,
                    "descricao": i.descricao,
                    "status": i.status.value if hasattr(i.status, "value") else i.status,
                    "responsavel": i.usuario_id,
                    "data_conclusao": i.data_conclusao.isoformat() if i.data_conclusao else None,
                    "observacoes": i.observacoes,
                    "prioridade": (
                        i.prioridade.value if hasattr(i.prioridade, "value") else i.prioridade
                    ),
                },
                "cor": "blue",
                "icone": "alert-circle",
            }
        )

    # 3. Frequência mensal
    frequencias = (
        db.query(models.FrequenciaMensal)
        .filter(models.FrequenciaMensal.aluno_id == matricula)
        .order_by(models.FrequenciaMensal.ano.desc(), models.FrequenciaMensal.mes.desc())
        .all()
    )
    for f in frequencias:
        eventos.append(
            {
                "tipo": "FREQUENCIA",
                "data": f.data_registro.isoformat() if f.data_registro else None,
                "titulo": f"Frequência: {float(f.frequencia)}%",
                "detalhes": {
                    "mes": f"{f.mes:02d}/{f.ano}",
                    "frequencia": float(f.frequencia),
                    "faltas_justificadas": f.faltas_justificadas,
                    "faltas_nao_justificadas": f.faltas_nao_justificadas,
                    "total_aulas": f.total_aulas_mes,
                },
                "cor": float(f.frequencia) >= 75 and "green" or "orange",
                "icone": "calendar",
            }
        )

    # 4. Questionários
    questionarios = (
        db.query(models.QuestionarioPsicossocial)
        .filter(models.QuestionarioPsicossocial.aluno_matricula == matricula)
        .order_by(models.QuestionarioPsicossocial.data_resposta.desc())
        .all()
    )
    for q in questionarios:
        eventos.append(
            {
                "tipo": "QUESTIONARIO",
                "data": q.data_resposta.isoformat() if q.data_resposta else None,
                "titulo": f"Questionário respondido (Score: {q.score_total})",
                "detalhes": {
                    "score_total": q.score_total,
                    "score_saude_mental": q.score_saude_mental,
                    "score_integracao_social": q.score_integracao_social,
                    "score_satisfacao_academica": q.score_satisfacao_academica,
                    "score_intencao_evasao": q.score_intencao_evasao,
                    "fator_critico": q.fator_critico,
                },
                "cor": "teal",
                "icone": "help-circle",
            }
        )

    # 5. Alertas de faltas
    alertas = (
        db.query(models.AlertaFaltasConsecutivas)
        .filter(models.AlertaFaltasConsecutivas.aluno_matricula == matricula)
        .order_by(models.AlertaFaltasConsecutivas.criado_at.desc())
        .all()
    )
    for a in alertas:
        eventos.append(
            {
                "tipo": "ALERTA_FALTAS",
                "data": a.criado_at.isoformat() if a.criado_at else None,
                "titulo": f"Alerta de Faltas: {a.tipo_alerta} ({a.quantidade_faltas} faltas)",
                "detalhes": {
                    "id": a.id,
                    "tipo_alerta": a.tipo_alerta,
                    "quantidade_faltas": a.quantidade_faltas,
                    "status": a.status,
                    "data_inicio_faltas": (
                        a.data_inicio_faltas.isoformat() if a.data_inicio_faltas else None
                    ),
                    "disciplinas_afetadas": a.disciplinas_afetadas,
                    "acoes_tomadas": a.acoes_tomadas,
                },
                "cor": a.status == "RESOLVIDO" and "green" or "red",
                "icone": "alert-triangle",
            }
        )

    # 6. Notas por disciplina
    notas = (
        db.query(models.NotaDisciplina)
        .filter(models.NotaDisciplina.aluno_matricula == matricula)
        .order_by(
            models.NotaDisciplina.periodo_letivo.desc(), models.NotaDisciplina.bimestre.desc()
        )
        .all()
    )
    for n in notas:
        situacao_val = n.situacao.value if hasattr(n.situacao, "value") else n.situacao
        cor_nota = (
            "green"
            if situacao_val == "APROVADO"
            else ("red" if situacao_val == "REPROVADO" else "gray")
        )
        eventos.append(
            {
                "tipo": "NOTA",
                "data": n.criado_at.isoformat() if n.criado_at else None,
                "titulo": f"Nota: {n.disciplina} - {n.nota} (Bim. {n.bimestre})",
                "detalhes": {
                    "disciplina": n.disciplina,
                    "nota": float(n.nota),
                    "bimestre": n.bimestre,
                    "periodo_letivo": n.periodo_letivo,
                    "situacao": situacao_val,
                    "faltas_disciplina": n.faltas_disciplina,
                },
                "cor": cor_nota,
                "icone": "book",
            }
        )

    # 7. Atendimentos/Ocorrências
    atendimentos = (
        db.query(models.Atendimento)
        .filter(models.Atendimento.aluno_matricula == matricula)
        .order_by(models.Atendimento.data_atendimento.desc())
        .all()
    )
    for at in atendimentos:
        tipo_val = (
            at.tipo_atendimento.value
            if hasattr(at.tipo_atendimento, "value")
            else at.tipo_atendimento
        )
        status_val = at.status.value if hasattr(at.status, "value") else at.status

        cores_atendimento = {
            "PSICOLOGICO": "purple",
            "SOCIAL": "blue",
            "DISCIPLINAR": "red",
            "ACADEMICO": "green",
            "SAUDE": "teal",
            "ENCAMINHAMENTO_EXTERNO": "orange",
            "CONVERSA_INFORMAL": "gray",
        }

        eventos.append(
            {
                "tipo": "ATENDIMENTO",
                "data": at.data_atendimento.isoformat() if at.data_atendimento else None,
                "titulo": f"Atendimento: {tipo_val} ({status_val})",
                "detalhes": {
                    "id": at.id,
                    "tipo": tipo_val,
                    "status": status_val,
                    "descricao": at.descricao,
                    "observacoes": at.observacoes,
                    "local": at.local,
                    "prioridade": at.prioridade,
                    "necessita_encaminhamento": at.necessita_encaminhamento,
                    "necessita_followup": at.necessita_followup,
                    "data_proximo_atendimento": (
                        at.data_proximo_atendimento.isoformat()
                        if at.data_proximo_atendimento
                        else None
                    ),
                },
                "cor": cores_atendimento.get(tipo_val, "gray"),
                "icone": "users",
            }
        )

    # Ordenar todos os eventos por data (mais recente primeiro)
    eventos.sort(key=lambda x: x["data"] or "", reverse=True)

    return {
        "matricula": matricula,
        "nome": aluno.nome,
        "total_eventos": len(eventos),
        "eventos": eventos,
    }
