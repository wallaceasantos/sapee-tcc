import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import auth
import database
import ml_logic
import models
import schemas
from email_utils import enviar_email, enviar_token_questionario as email_enviar_token, is_configured as email_configured
from ml_logic import get_perguntas_questionario
from notificacoes import notifier

logger = logging.getLogger(__name__)

router = APIRouter()
# ============================================
# QUESTIONÁRIO PSICOSSOCIAL
# ============================================


@router.get("/questionario/perguntas")
def get_perguntas_questionario_route():
    """
    Retorna a lista completa de perguntas do questionário psicossocial.
    """
    return {
        "perguntas": get_perguntas_questionario(),
        "escalas": {
            "1": "Discordo Totalmente",
            "2": "Discordo Parcialmente",
            "3": "Neutro",
            "4": "Concordo Parcialmente",
            "5": "Concordo Totalmente",
        },
        "instrucoes": "Responda cada questão de 1 a 5, onde 1 significa 'Discordo Totalmente' e 5 significa 'Concordo Totalmente'.",
    }


@router.post("/questionario/responder", response_model=schemas.QuestionarioPsicossocialResponse)
def responder_questionario(
    questionario: schemas.QuestionarioPsicossocialCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Registra as respostas do questionário psicossocial de um aluno.
    Calcula automaticamente os scores e identifica fatores críticos.
    """
    # Verificar se aluno existe
    aluno = (
        db.query(models.Aluno)
        .filter(models.Aluno.matricula == questionario.aluno_matricula)
        .first()
    )

    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Calcular risco psicossocial
    respostas_dict = questionario.model_dump()
    resultado = ml_logic.calcular_risco_psicossocial(respostas_dict)

    # Verificar se já existe questionário para este aluno
    existente = (
        db.query(models.QuestionarioPsicossocial)
        .filter(models.QuestionarioPsicossocial.aluno_matricula == questionario.aluno_matricula)
        .first()
    )

    if existente:
        # Atualizar questionário existente
        for key, value in questionario.model_dump().items():
            if value is not None and hasattr(existente, key):
                setattr(existente, key, value)

        # Atualizar campos calculados
        existente.score_saude_mental = resultado["score_saude_mental"]
        existente.score_integracao_social = resultado["score_integracao_social"]
        existente.score_satisfacao_curso = resultado["score_satisfacao_curso"]
        existente.score_conflitos = resultado["score_conflitos"]
        existente.score_intencao_evasao = resultado["score_intencao_evasao"]
        existente.score_psicossocial_total = resultado["score_psicossocial_total"]
        existente.nivel_risco_psicossocial = resultado["nivel_risco_psicossocial"]
        existente.fatores_criticos = json.dumps(resultado["fatores_criticos"])

        db.commit()
        db.refresh(existente)

        # Atualizar aluno
        aluno.questionario_respondido = True
        aluno.data_ultimo_questionario = datetime.now()
        db.commit()

        return existente
    else:
        # Criar novo questionário
        novo_questionario = models.QuestionarioPsicossocial(
            aluno_matricula=questionario.aluno_matricula,
            score_saude_mental=resultado["score_saude_mental"],
            score_integracao_social=resultado["score_integracao_social"],
            score_satisfacao_curso=resultado["score_satisfacao_curso"],
            score_conflitos=resultado["score_conflitos"],
            score_intencao_evasao=resultado["score_intencao_evasao"],
            score_psicossocial_total=resultado["score_psicossocial_total"],
            nivel_risco_psicossocial=resultado["nivel_risco_psicossocial"],
            fatores_criticos=json.dumps(resultado["fatores_criticos"]),
            termo_consentimento=questionario.termo_consentimento,
            ip_address=questionario.ip_address,
            dispositivo=questionario.dispositivo,
            tempo_resposta_segundos=questionario.tempo_resposta_segundos,
        )

        # Copiar respostas
        for key, value in questionario.model_dump().items():
            if key not in [
                "aluno_matricula",
                "ip_address",
                "dispositivo",
                "tempo_resposta_segundos",
                "termo_consentimento",
            ]:
                setattr(novo_questionario, key, value)

        db.add(novo_questionario)
        db.commit()
        db.refresh(novo_questionario)

        # Atualizar aluno
        aluno.questionario_respondido = True
        aluno.data_ultimo_questionario = datetime.now()
        db.commit()

        return novo_questionario


@router.get("/questionario/{matricula}", response_model=schemas.QuestionarioPsicossocialResponse)
def get_questionario_aluno(
    matricula: str,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Obtém as respostas do questionário psicossocial de um aluno.
    """
    questionario = (
        db.query(models.QuestionarioPsicossocial)
        .filter(models.QuestionarioPsicossocial.aluno_matricula == matricula)
        .first()
    )

    if not questionario:
        raise HTTPException(status_code=404, detail="Questionário não encontrado para este aluno")

    return questionario


@router.get("/questionario/{matricula}/historico")
def get_historico_questionario(
    matricula: str,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Obtém histórico de questionários respondidos pelo aluno.
    """
    questionarios = (
        db.query(models.QuestionarioPsicossocial)
        .filter(models.QuestionarioPsicossocial.aluno_matricula == matricula)
        .order_by(models.QuestionarioPsicossocial.data_resposta.desc())
        .all()
    )

    return {
        "matricula": matricula,
        "total_respostas": len(questionarios),
        "historico": [
            {
                "id": q.id,
                "data_resposta": q.data_resposta.isoformat(),
                "score_total": q.score_psicossocial_total,
                "nivel_risco": q.nivel_risco_psicossocial,
            }
            for q in questionarios
        ],
    }


@router.get("/questionario/dashboard/stats")
def get_questionario_dashboard(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Estatísticas do questionário psicossocial para dashboard.
    """

    # Total de respostas
    total_respostas = db.query(models.QuestionarioPsicossocial).count()

    # Alunos com questionário
    alunos_com_questionario = (
        db.query(models.QuestionarioPsicossocial.aluno_matricula).distinct().count()
    )

    # Total de alunos
    total_alunos = db.query(models.Aluno).count()

    # Distribuição por nível de risco
    risco_baixo = (
        db.query(models.QuestionarioPsicossocial)
        .filter(models.QuestionarioPsicossocial.nivel_risco_psicossocial == "BAIXO")
        .count()
    )

    risco_medio = (
        db.query(models.QuestionarioPsicossocial)
        .filter(models.QuestionarioPsicossocial.nivel_risco_psicossocial == "MEDIO")
        .count()
    )

    risco_alto = (
        db.query(models.QuestionarioPsicossocial)
        .filter(models.QuestionarioPsicossocial.nivel_risco_psicossocial == "ALTO")
        .count()
    )

    risco_muito_alto = (
        db.query(models.QuestionarioPsicossocial)
        .filter(models.QuestionarioPsicossocial.nivel_risco_psicossocial == "MUITO_ALTO")
        .count()
    )

    # Médias por dimensão
    medias = db.query(
        func.avg(models.QuestionarioPsicossocial.score_saude_mental).label("saude_mental"),
        func.avg(models.QuestionarioPsicossocial.score_integracao_social).label("integracao"),
        func.avg(models.QuestionarioPsicossocial.score_satisfacao_curso).label("satisfacao"),
        func.avg(models.QuestionarioPsicossocial.score_conflitos).label("conflitos"),
        func.avg(models.QuestionarioPsicossocial.score_intencao_evasao).label("intencao"),
        func.avg(models.QuestionarioPsicossocial.score_psicossocial_total).label("total"),
    ).first()

    # Fatores críticos mais frequentes
    todos_questionarios = db.query(models.QuestionarioPsicossocial).all()
    fatores_contagem = {}

    for q in todos_questionarios:
        if q.fatores_criticos:
            try:
                fatores = json.loads(q.fatores_criticos)
                for fator in fatores:
                    fatores_contagem[fator] = fatores_contagem.get(fator, 0) + 1
            except (json.JSONDecodeError, TypeError):
                pass

    # Ordenar por frequência
    fatores_frequentes = sorted(fatores_contagem.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "total_respostas": total_respostas,
        "alunos_com_questionario": alunos_com_questionario,
        "alunos_sem_questionario": total_alunos - alunos_com_questionario,
        "percentual_respostas": round(
            (alunos_com_questionario / total_alunos * 100) if total_alunos > 0 else 0, 2
        ),
        "distribuicao_risco": {
            "risco_baixo": risco_baixo,
            "risco_medio": risco_medio,
            "risco_alto": risco_alto,
            "risco_muito_alto": risco_muito_alto,
        },
        "medias_dimensoes": {
            "media_saude_mental": float(medias.saude_mental) if medias.saude_mental else None,
            "media_integracao_social": float(medias.integracao) if medias.integracao else None,
            "media_satisfacao_curso": float(medias.satisfacao) if medias.satisfacao else None,
            "media_conflitos": float(medias.conflitos) if medias.conflitos else None,
            "media_intencao_evasao": float(medias.intencao) if medias.intencao else None,
            "media_score_total": float(medias.total) if medias.total else None,
        },
        "fatores_criticos_frequentes": [
            {"fator": fator, "quantidade": qtd} for fator, qtd in fatores_frequentes
        ],
    }


@router.get("/questionario/alunos/sem-responder")
def get_alunos_sem_questionario(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Lista alunos que ainda não responderam o questionário psicossocial.
    """
    # Subquery para alunos com questionário
    subquery = select(models.QuestionarioPsicossocial.aluno_matricula).distinct()

    # Alunos sem questionário
    alunos_sem = (
        db.query(models.Aluno)
        .filter(~models.Aluno.matricula.in_(subquery))
        .order_by(models.Aluno.nome)
        .limit(100)
        .all()
    )

    return {
        "total": len(alunos_sem),
        "alunos": [
            {
                "matricula": a.matricula,
                "nome": a.nome,
                "curso": a.curso.nome if a.curso else None,
                "email": a.email,
            }
            for a in alunos_sem
        ],
    }


@router.get("/questionario/alunos/responderam")
def get_alunos_que_responderam(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Lista alunos que já responderam o questionário psicossocial,
    com data da resposta e nível de risco.
    """
    alunos_com = (
        db.query(models.QuestionarioPsicossocial)
        .order_by(models.QuestionarioPsicossocial.data_resposta.desc())
        .limit(100)
        .all()
    )

    return {
        "total": len(alunos_com),
        "alunos": [
            {
                "matricula": q.aluno_matricula,
                "nome": q.aluno.nome if q.aluno else None,
                "curso": q.aluno.curso.nome if q.aluno and q.aluno.curso else None,
                "nivel_risco": q.nivel_risco_psicossocial,
                "score_total": float(q.score_psicossocial_total) if q.score_psicossocial_total else None,
                "data_resposta": q.data_resposta.isoformat() if q.data_resposta else None,
            }
            for q in alunos_com
        ],
    }


# ============================================
# TOKENS DE ACESSO - QUESTIONÁRIO PÚBLICO (SEM LOGIN)
# ============================================


@router.post("/tokens/questionario/gerar", response_model=schemas.TokenQuestionarioResponse)
def gerar_token_questionario(
    token_data: schemas.TokenQuestionarioCreate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
):
    """
    Gera um token de acesso temporário para aluno responder questionário sem login.
    Coordenador pode gerar tokens para distribuir aos alunos.
    """
    # Verificar se aluno existe
    aluno = (
        db.query(models.Aluno).filter(models.Aluno.matricula == token_data.aluno_matricula).first()
    )

    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Gerar token único
    token = str(uuid.uuid4())
    valido_ate = datetime.now() + timedelta(hours=token_data.horas_validade)

    # Criar token no banco
    novo_token = models.TokenQuestionario(
        aluno_matricula=token_data.aluno_matricula,
        token=token,
        valido_ate=valido_ate,
        ip_criacao=request.client.host if request.client else None,
        usado=False,
        ativo=True,
    )

    db.add(novo_token)
    db.commit()
    db.refresh(novo_token)

    # Gerar link de acesso usando HOST do frontend via header ou padrão
    frontend_url = request.headers.get("x-frontend-url", "http://localhost:3000")
    link_acesso = f"{frontend_url}/questionario-publico?token={token}"

    return {
        "token": token,
        "valido_ate": valido_ate,
        "link_acesso": link_acesso,
        "aluno_nome": aluno.nome,
        "aluno_matricula": token_data.aluno_matricula,
    }


@router.post("/tokens/questionario/enviar", response_model=schemas.TokenQuestionarioEnviarResponse)
def enviar_token_questionario(
    envio_data: schemas.TokenQuestionarioEnviarRequest,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
):
    """
    Envia o token de questionário existente para o aluno ou responsável por email ou WhatsApp.
    Também registra a comunicação no sistema.
    """
    # Verificar se aluno existe
    aluno = (
        db.query(models.Aluno)
        .filter(models.Aluno.matricula == envio_data.aluno_matricula)
        .first()
    )

    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Verificar se token existe e pertence ao aluno
    token_obj = (
        db.query(models.TokenQuestionario)
        .filter(
            models.TokenQuestionario.token == envio_data.token,
            models.TokenQuestionario.aluno_matricula == envio_data.aluno_matricula,
            models.TokenQuestionario.ativo == True,
        )
        .first()
    )

    if not token_obj:
        raise HTTPException(status_code=404, detail="Token não encontrado ou inativo")

    canal = envio_data.canal.upper()
    if canal != "EMAIL":
        raise HTTPException(status_code=400, detail="Canal deve ser EMAIL")

    # Link do questionário - usa PUBLIC_URL ou FRONTEND_URL do .env
    frontend_url = os.getenv("PUBLIC_URL") or os.getenv("FRONTEND_URL", "http://localhost:3000")
    link = f"{frontend_url}/questionario-publico?token={envio_data.token}"
    validade = token_obj.valido_ate.strftime("%d/%m/%Y %H:%M")

    mensagem = f"""
Olá! 👋

Você recebeu um convite para responder o Questionário Psicossocial do SAPEE DEWAS.

👤 Aluno: {aluno.nome}
📚 Curso: {aluno.curso.nome if aluno.curso else 'N/A'}
⏰ Válido até: {validade}

🔗 Link de acesso (não precisa de login):
{link}

Por favor, responda com atenção. Suas respostas são confidenciais.

Atenciosamente,
Equipe SAPEE DEWAS
""".strip()

    return _enviar_mensagem_token(
        db=db,
        aluno=aluno,
        canal=canal,
        mensagem=mensagem,
        current_user=current_user,
        link=link,
        validade=validade,
    )


def _enviar_mensagem_token(
    db: Session,
    aluno: models.Aluno,
    canal: str,
    mensagem: str,
    current_user: models.Usuario,
    link: str = "",
    validade: str = "",
) -> dict:
    """
    Envia a mensagem do token por email e registra a comunicação.
    Usa o módulo email_utils com proteção anti-spam e template HTML.
    """
    destinatario_nome = aluno.nome
    destinatario_contato: Optional[str] = None

    if canal == "EMAIL":
        destinatario_contato = aluno.email or aluno.email_responsavel_1
        destinatario_nome = aluno.nome if aluno.email else (aluno.nome_responsavel_1 or aluno.nome)

        if not destinatario_contato:
            raise HTTPException(status_code=400, detail="Aluno não possui email cadastrado")

        curso_nome = aluno.curso.nome if aluno.curso else "N/A"

        # Envia com template HTML profissional (anti-spam) ou fallback texto puro
        if link and validade:
            resultado = email_enviar_token(
                destinatario=destinatario_contato,
                aluno_nome=aluno.nome,
                curso_nome=curso_nome,
                link_acesso=link,
                validade=validade,
                token="",
            )
        else:
            resultado = enviar_email(
                destinatario=destinatario_contato,
                assunto="Questionário Psicossocial - SAPEE DEWAS",
                corpo_texto=mensagem,
            )

        if not resultado["sucesso"]:
            raise HTTPException(status_code=500, detail=resultado["mensagem"])

    else:
        raise HTTPException(status_code=400, detail="Canal deve ser EMAIL")

    # Registrar comunicação no sistema
    comunicacao = models.Comunicacao(
        aluno_matricula=aluno.matricula,
        usuario_id=current_user.id,
        tipo_comunicacao=models.TipoComunicacao.MANUAL,
        canal=models.CanalComunicacao.EMAIL,
        destinatario_tipo=models.DestinatarioTipo.ALUNO if aluno.email else models.DestinatarioTipo.RESPONSAVEL,
        destinatario_nome=destinatario_nome,
        destinatario_contato=destinatario_contato,
        assunto="Token para Questionário Psicossocial",
        mensagem=mensagem,
        status=models.StatusComunicacao.ENVIADA,
        data_envio=datetime.now(),
    )
    db.add(comunicacao)
    db.commit()

    return {
        "sucesso": True,
        "mensagem": f"Token enviado com sucesso por EMAIL para {destinatario_nome} ({destinatario_contato})",
        "canal": "EMAIL",
    }


def _enviar_token_para_aluno(
    db: Session,
    aluno: models.Aluno,
    canal: str,
    horas_validade: int,
    current_user: models.Usuario,
    ip_criacao: Optional[str] = None,
) -> dict:
    """
    Gera e envia um token de questionário para um aluno.
    Retorna dicionário com sucesso, mensagem e token.
    """
    # Gerar token único
    token = str(uuid.uuid4())
    valido_ate = datetime.now() + timedelta(hours=horas_validade)

    # Criar token no banco
    novo_token = models.TokenQuestionario(
        aluno_matricula=aluno.matricula,
        token=token,
        valido_ate=valido_ate,
        ip_criacao=ip_criacao,
        usado=False,
        ativo=True,
    )
    db.add(novo_token)
    db.commit()
    db.refresh(novo_token)

    # Link do questionário - usa PUBLIC_URL ou FRONTEND_URL do .env
    frontend_url = os.getenv("PUBLIC_URL") or os.getenv("FRONTEND_URL", "http://localhost:3000")
    link = f"{frontend_url}/questionario-publico?token={token}"
    validade = valido_ate.strftime("%d/%m/%Y %H:%M")

    mensagem = f"""
Olá! 👋

Você recebeu um convite para responder o Questionário Psicossocial do SAPEE DEWAS.

👤 Aluno: {aluno.nome}
📚 Curso: {aluno.curso.nome if aluno.curso else 'N/A'}
⏰ Válido até: {validade}

🔗 Link de acesso (não precisa de login):
{link}

Por favor, responda com atenção. Suas respostas são confidenciais.

Atenciosamente,
Equipe SAPEE DEWAS
""".strip()

    try:
        _enviar_mensagem_token(
            db=db,
            aluno=aluno,
            canal=canal,
            mensagem=mensagem,
            current_user=current_user,
            link=link,
            validade=validade,
        )
    except HTTPException as e:
        return {
            "sucesso": False,
            "mensagem": e.detail,
            "token": token,
        }

    return {
        "sucesso": True,
        "mensagem": f"Token enviado com sucesso por {canal} para {aluno.nome}",
        "token": token,
    }


@router.post("/tokens/questionario/enviar-em-massa", response_model=schemas.TokenQuestionarioEnviarEmMassaResponse)
def enviar_tokens_em_massa(
    massa_data: schemas.TokenQuestionarioEnviarEmMassaRequest,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
):
    """
    Gera e envia tokens de questionário para múltiplos alunos de uma só vez.
    Ideal para campanhas de coleta do questionário psicossocial.
    """


    if not massa_data.alunos_matriculas:
        raise HTTPException(status_code=400, detail="Nenhuma matrícula informada")

    canal = massa_data.canal or "EMAIL"

    # Buscar alunos existentes
    alunos = (
        db.query(models.Aluno)
        .filter(models.Aluno.matricula.in_(massa_data.alunos_matriculas))
        .all()
    )

    alunos_dict = {a.matricula: a for a in alunos}
    ip_criacao = request.client.host if request.client else None

    detalhes = []
    sucessos = 0
    falhas = 0

    for matricula in massa_data.alunos_matriculas:
        aluno = alunos_dict.get(matricula)
        if not aluno:
            detalhes.append({
                "matricula": matricula,
                "nome": "N/A",
                "sucesso": False,
                "mensagem": "Aluno não encontrado",
            })
            falhas += 1
            continue

        resultado = _enviar_token_para_aluno(
            db=db,
            aluno=aluno,
            canal=canal,
            horas_validade=massa_data.horas_validade,
            current_user=current_user,
            ip_criacao=ip_criacao,
        )

        detalhes.append({
            "matricula": matricula,
            "nome": aluno.nome,
            "sucesso": resultado["sucesso"],
            "mensagem": resultado["mensagem"],
        })

        if resultado["sucesso"]:
            sucessos += 1
        else:
            falhas += 1

    return {
        "total": len(massa_data.alunos_matriculas),
        "sucessos": sucessos,
        "falhas": falhas,
        "canal": canal,
        "detalhes": detalhes,
    }


@router.delete("/tokens/questionario/limpar-expirados", response_model=schemas.TokenQuestionarioLimparExpiradosResponse)
def limpar_tokens_expirados(
    dias: int = 30,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
):
    """
    Remove tokens de questionário expirados há mais de N dias.
    Use dias=0 para remover TODOS os tokens (útil em desenvolvimento).

    - dias=0  → remove todos os tokens (sem restrição de data)
    - dias=1  → remove tokens expirados há mais de 1 dia
    - dias=30 → remove tokens expirados há mais de 30 dias (padrão)
    """
    if dias < 0:
        raise HTTPException(status_code=400, detail="O parâmetro 'dias' deve ser maior ou igual a 0")

    if dias == 0:
        tokens_para_remover = db.query(models.TokenQuestionario).all()
        data_limite = datetime.now()  # todos
    else:
        data_limite = datetime.now() - timedelta(days=dias)
        tokens_para_remover = (
            db.query(models.TokenQuestionario)
            .filter(models.TokenQuestionario.valido_ate < data_limite)
            .all()
        )

    removidos = len(tokens_para_remover)

    for token in tokens_para_remover:
        db.delete(token)

    db.commit()

    return {
        "removidos": removidos,
        "dias_limite": dias,
        "data_limite": data_limite,
    }







@router.post("/tokens/questionario/validar")
def validar_token_questionario(
    validate_data: schemas.TokenQuestionarioValidateRequest, db: Session = Depends(database.get_db)
):
    """
    Valida um token de acesso ao questionário.
    Usado pelo frontend antes de carregar o questionário.
    """
    # Buscar token
    token_obj = (
        db.query(models.TokenQuestionario)
        .filter(
            models.TokenQuestionario.token == validate_data.token,
            models.TokenQuestionario.ativo == True,
        )
        .first()
    )

    if not token_obj:
        return {"valido": False, "mensagem": "Token não encontrado ou inativo"}

    # Verificar validade
    if token_obj.valido_ate < datetime.now():
        return {"valido": False, "mensagem": "Token expirado"}

    # Verificar se já foi usado
    if token_obj.usado:
        return {"valido": False, "mensagem": "Token já foi utilizado"}

    # Buscar dados do aluno (apenas para exibir nome)
    aluno = (
        db.query(models.Aluno).filter(models.Aluno.matricula == token_obj.aluno_matricula).first()
    )

    # NÃO marcar como usado aqui - o token só é consumido quando o questionário é enviado
    # Se marcarmos agora e o aluno fechar a página, o token será perdido

    return {
        "valido": True,
        "mensagem": "Token válido",
        "aluno_matricula": token_obj.aluno_matricula,
        "aluno_nome": aluno.nome if aluno else None,
    }


@router.post("/questionario-publico/responder")
def responder_questionario_publico(
    request: Request,
    token: str,
    respostas: schemas.QuestionarioPsicossocialCreate,
    db: Session = Depends(database.get_db),
):
    """
    Endpoint público para aluno responder questionário sem login.
    Usa token de acesso para validar.
    """
    # Validar token
    token_obj = (
        db.query(models.TokenQuestionario)
        .filter(models.TokenQuestionario.token == token, models.TokenQuestionario.ativo == True)
        .first()
    )

    if not token_obj:
        raise HTTPException(status_code=400, detail="Token inválido")

    if token_obj.valido_ate < datetime.now():
        raise HTTPException(status_code=400, detail="Token expirado")

    if token_obj.usado:
        raise HTTPException(status_code=400, detail="Token já utilizado")

    # Verificar se aluno existe
    aluno = (
        db.query(models.Aluno).filter(models.Aluno.matricula == token_obj.aluno_matricula).first()
    )

    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Calcular risco psicossocial
    respostas_dict = respostas.model_dump()
    resultado = ml_logic.calcular_risco_psicossocial(respostas_dict)

    # Criar registro do questionário
    questionario = models.QuestionarioPsicossocial(
        aluno_matricula=token_obj.aluno_matricula,
        score_saude_mental=resultado["score_saude_mental"],
        score_integracao_social=resultado["score_integracao_social"],
        score_satisfacao_curso=resultado["score_satisfacao_curso"],
        score_conflitos=resultado["score_conflitos"],
        score_intencao_evasao=resultado["score_intencao_evasao"],
        score_psicossocial_total=resultado["score_psicossocial_total"],
        nivel_risco_psicossocial=resultado["nivel_risco_psicossocial"],
        fatores_criticos=json.dumps(resultado["fatores_criticos"]),
        termo_consentimento=respostas.termo_consentimento,
        ip_address=request.client.host if request.client else None,
        tempo_resposta_segundos=respostas.tempo_resposta_segundos,
    )

    # Copiar respostas
    for key, value in respostas.model_dump().items():
        if key not in [
            "aluno_matricula",
            "ip_address",
            "dispositivo",
            "tempo_resposta_segundos",
            "termo_consentimento",
        ]:
            setattr(questionario, key, value)

    db.add(questionario)

    # Atualizar token e aluno
    token_obj.usado = True
    token_obj.data_uso = datetime.now()
    token_obj.ip_uso = request.client.host if request.client else None

    aluno.questionario_respondido = True
    aluno.data_ultimo_questionario = datetime.now()

    db.commit()

    # ============================================
    # GATILHO AUTOMÁTICO: Recalcular predição do aluno
    # O questionário psicossocial agora influencia o risco de evasão
    # ============================================
    try:
        from ml_logic_v2 import calcular_risco_evasao as calcular_risco_v2

        resultado_predicao = calcular_risco_v2(aluno, db)

        # Buscar predição existente ou criar nova
        predicao_existente = (
            db.query(models.Predicao)
            .filter(models.Predicao.aluno_id == aluno.matricula)
            .first()
        )

        if predicao_existente:
            predicao_existente.risco_evasao = resultado_predicao["risco_evasao"]
            predicao_existente.nivel_risco = resultado_predicao["nivel_risco"]
            predicao_existente.fatores_principais = resultado_predicao["fatores_principais"]
            predicao_existente.modelo_ml_versao = resultado_predicao.get("modelo_ml_versao", "2.0.0")
            predicao_existente.data_predicao = datetime.now()
            db.commit()
            predicao_id = predicao_existente.id
        else:
            nova_predicao = models.Predicao(
                aluno_id=aluno.matricula,
                risco_evasao=resultado_predicao["risco_evasao"],
                nivel_risco=resultado_predicao["nivel_risco"],
                fatores_principais=resultado_predicao["fatores_principais"],
                modelo_ml_versao=resultado_predicao.get("modelo_ml_versao", "2.0.0"),
            )
            db.add(nova_predicao)
            db.commit()
            db.refresh(nova_predicao)
            predicao_id = nova_predicao.id

        # Salvar no histórico de predições
        historico = models.PredicaoHistorico(
            aluno_matricula=aluno.matricula,
            predicao_id=predicao_id,
            risco_evasao=resultado_predicao["risco_evasao"],
            nivel_risco=resultado_predicao["nivel_risco"].value,
            fatores_principais=resultado_predicao["fatores_principais"],
            modelo_ml_versao=resultado_predicao.get("modelo_ml_versao", "2.0.0"),
            data_predicao=datetime.now(),
        )
        db.add(historico)
        db.commit()

        logger.info("[GATILHO] Predição recalculada para %s (%s): risco=%s%%, nível=%s",
                    aluno.nome, aluno.matricula,
                    resultado_predicao['risco_evasao'],
                    resultado_predicao['nivel_risco'].value)

    except Exception as e:
        logger.warning("[GATILHO] Falha ao recalcular predição para %s: %s", aluno.matricula, e)

    return {
        "message": "Questionário respondido com sucesso!",
        "score_total": resultado["score_psicossocial_total"],
        "nivel_risco": resultado["nivel_risco_psicossocial"],
    }


@router.get("/tokens/questionario/listar")
def listar_tokens_questionario(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR", "PEDAGOGO")),
):
    """
    Lista todos os tokens de acesso ao questionário.
    Apenas para coordenadores/administradores.
    """
    tokens = (
        db.query(models.TokenQuestionario)
        .order_by(models.TokenQuestionario.criado_at.desc())
        .limit(100)
        .all()
    )

    return {
        "total": len(tokens),
        "tokens": [
            {
                "id": t.id,
                "token": t.token[:8] + "..." + t.token[-4:],  # Mostrar parcial
                "aluno_matricula": t.aluno_matricula,
                "aluno_nome": t.aluno.nome if t.aluno else "N/A",
                "valido_ate": t.valido_ate.isoformat() if t.valido_ate else None,
                "usado": t.usado,
                "data_uso": t.data_uso.isoformat() if t.data_uso else None,
                "ativo": t.ativo,
                "criado_at": t.criado_at.isoformat() if t.criado_at else None,
            }
            for t in tokens
        ],
    }
