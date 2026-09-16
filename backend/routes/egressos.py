import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas

logger = logging.getLogger(__name__)

router = APIRouter()
# ============================================
# EGRESSOS - CRUD COMPLETO
# ============================================


@router.post(
    "/egressos", response_model=schemas.EgressoResponse, status_code=status.HTTP_201_CREATED
)
def criar_egresso(
    egresso_data: schemas.EgressoCreate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR")),
):
    """
    Cadastra um novo egresso (aluno que saiu do curso).
    """
    try:
        # Verificar se aluno existe
        aluno = (
            db.query(models.Aluno)
            .filter(models.Aluno.matricula == egresso_data.aluno_matricula)
            .first()
        )

        if not aluno:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado"
            )

        # Buscar última predição de risco do aluno
        ultima_predicao = (
            db.query(models.Predicao)
            .filter(models.Predicao.aluno_id == egresso_data.aluno_matricula)
            .order_by(models.Predicao.data_predicao.desc())
            .first()
        )

        # Buscar intervenções recebidas
        intervencoes = (
            db.query(models.Intervencao)
            .filter(models.Intervencao.aluno_id == egresso_data.aluno_matricula)
            .all()
        )

        # Criar egresso
        novo_egresso = models.Egresso(
            aluno_matricula=egresso_data.aluno_matricula,
            data_saida=egresso_data.data_saida,
            motivo_saida=egresso_data.motivo_saida,
            motivo_detalhes=egresso_data.motivo_detalhes,
            motivo_abandono_principal=egresso_data.motivo_abandono_principal,
            instituicao_destino=egresso_data.instituicao_destino,
            curso_destino=egresso_data.curso_destino,
            situacao_atual=egresso_data.situacao_atual,
            esta_estudando=egresso_data.esta_estudando,
            esta_trabalhando=egresso_data.esta_trabalhando,
            observacoes=egresso_data.observacoes,
            # Dados do SAPEE
            tinha_predicao_risco=ultima_predicao is not None,
            nivel_risco_predito=ultima_predicao.nivel_risco.value if ultima_predicao else None,
            recebeu_intervencao=len(intervencoes) > 0,
            tipo_intervencao=json.dumps([i.tipo for i in intervencoes]) if intervencoes else None,
            cadastrado_por=current_user.id,
        )

        db.add(novo_egresso)

        # Atualizar status do aluno para "egresso" (se houver campo)
        # Ou remover da lista de alunos ativos

        db.commit()
        db.refresh(novo_egresso)

        # ============================================
        # FEEDBACK LOOP: Registrar no histórico de predições
        # ============================================
        try:
            if ultima_predicao:
                # Determinar se é evasão (abandono)
                is_evasao = egresso_data.motivo_saida == "ABANDONO"

                # Determinar se a predição foi "correta"
                # Regra: Se predição era ALTO/MUITO_ALTO e evadiu = acertou
                #        Se predição era BAIXO e evadiu = errou (falso negativo)
                predicao_correta = None
                tipo_erro = None

                if is_evasao:
                    if ultima_predicao.nivel_risco in [
                        models.NivelRisco.ALTO,
                        models.NivelRisco.MUITO_ALTO,
                    ]:
                        predicao_correta = True
                        tipo_erro = "VERDADEIRO_POSITIVO"
                    elif ultima_predicao.nivel_risco == models.NivelRisco.MEDIO:
                        predicao_correta = True  # Parcialmente correto
                        tipo_erro = "VERDADEIRO_POSITIVO_PARCIAL"
                    else:
                        predicao_correta = False
                        tipo_erro = "FALSO_NEGATIVO"  # Predição baixa mas evadiu
                else:
                    # Transferência, conclusão, etc - não é evasão
                    if ultima_predicao.nivel_risco in [
                        models.NivelRisco.BAIXO,
                        models.NivelRisco.MEDIO,
                    ]:
                        predicao_correta = True
                        tipo_erro = "VERDADEIRO_NEGATIVO"
                    else:
                        predicao_correta = False
                        tipo_erro = "FALSO_POSITIVO"  # Predição alta mas não evadiu

                # Registrar no histórico
                hist_registro = models.PredicaoHistorico(
                    aluno_matricula=egresso_data.aluno_matricula,
                    predicao_id=ultima_predicao.id,
                    risco_evasao=ultima_predicao.risco_evasao,
                    nivel_risco=(
                        ultima_predicao.nivel_risco.value
                        if hasattr(ultima_predicao.nivel_risco, "value")
                        else str(ultima_predicao.nivel_risco)
                    ),
                    fatores_principais=ultima_predicao.fatores_principais,
                    modelo_ml_versao=ultima_predicao.modelo_ml_versao,
                    data_predicao=ultima_predicao.data_predicao,
                    aluno_evasao=is_evasao,
                    data_evasao=datetime.now(),
                    motivo_saida=egresso_data.motivo_saida,
                    predicao_correta=predicao_correta,
                    tipo_erro=tipo_erro,
                )
                db.add(hist_registro)
                db.commit()

                logger.info("Feedback Loop registrado: %s", aluno.nome)
                logger.info(
                    "   Predição: %s%% - %s", ultima_predicao.risco_evasao, ultima_predicao.nivel_risco
                )
                logger.info(
                    "   Resultado: %s (%s)", 'Evasão' if is_evasao else 'Não evasão', egresso_data.motivo_saida
                )
                logger.info("   Avaliação: %s", tipo_erro)

        except Exception as e:
            logger.warning("Erro ao registrar feedback loop: %s", e)
            # Não falhar o cadastro do egresso por causa disso
            db.rollback()

        # Preparar resposta
        resposta = {
            "id": novo_egresso.id,
            "aluno_matricula": novo_egresso.aluno_matricula,
            "data_saida": novo_egresso.data_saida.isoformat() if novo_egresso.data_saida else None,
            "motivo_saida": novo_egresso.motivo_saida,
            "motivo_detalhes": novo_egresso.motivo_detalhes,
            "motivo_abandono_principal": novo_egresso.motivo_abandono_principal,
            "instituicao_destino": novo_egresso.instituicao_destino,
            "curso_destino": novo_egresso.curso_destino,
            "situacao_atual": novo_egresso.situacao_atual,
            "esta_estudando": novo_egresso.esta_estudando,
            "esta_trabalhando": novo_egresso.esta_trabalhando,
            "observacoes": novo_egresso.observacoes,
            "aluno_nome": aluno.nome,
            "curso": aluno.curso.nome if aluno.curso else "N/A",
            "tinha_predicao_risco": novo_egresso.tinha_predicao_risco,
            "nivel_risco_predito": novo_egresso.nivel_risco_predito,
            "recebeu_intervencao": novo_egresso.recebeu_intervencao,
            "tipo_intervencao": novo_egresso.tipo_intervencao,
            "data_cadastro": (
                novo_egresso.data_cadastro.isoformat() if novo_egresso.data_cadastro else None
            ),
        }

        # Log de auditoria
        audit_log = models.AuditLog(
            usuario_id=current_user.id,
            acao="CRIAR_EGRESSO",
            detalhes=f"Egresso cadastrado: {aluno.nome} - {egresso_data.motivo_saida}",
            ip_address=request.client.host if request.client else None,
        )
        db.add(audit_log)
        db.commit()

        return resposta

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao cadastrar egresso: {str(e)}",
        )


@router.get("/egressos")
def listar_egressos(
    motivo_saida: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Lista todos os egressos com filtros opcionais.
    """
    try:
        query = (
            db.query(models.Egresso)
            .join(models.Aluno, models.Egresso.aluno_matricula == models.Aluno.matricula)
            .outerjoin(models.Curso, models.Aluno.curso_id == models.Curso.id)
        )

        # Aplicar filtro de motivo
        if motivo_saida and motivo_saida != "todos":
            query = query.filter(models.Egresso.motivo_saida == motivo_saida)

        # Ordenar por data de saída mais recente
        query = query.order_by(models.Egresso.data_saida.desc())

        _total = query.count()
        egressos = query.offset(skip).limit(limit).all()

        # Formatar resposta
        egressos_list = []
        for egresso in egressos:
            egressos_list.append(
                {
                    "id": egresso.id,
                    "aluno_matricula": egresso.aluno_matricula,
                    "aluno_nome": egresso.aluno.nome if egresso.aluno else "N/A",
                    "curso": (
                        egresso.aluno.curso.nome if egresso.aluno and egresso.aluno.curso else "N/A"
                    ),
                    "data_saida": egresso.data_saida.isoformat() if egresso.data_saida else None,
                    "motivo_saida": egresso.motivo_saida,
                    "motivo_abandono_principal": egresso.motivo_abandono_principal,
                    "motivo_detalhes": egresso.motivo_detalhes,
                    "tinham_predicao_risco": egresso.tinha_predicao_risco,
                    "nivel_risco_predito": egresso.nivel_risco_predito,
                    "recebeu_intervencao": egresso.recebeu_intervencao,
                    "data_cadastro": (
                        egresso.data_cadastro.isoformat() if egresso.data_cadastro else None
                    ),
                }
            )

        # Estatísticas
        total_egressos = db.query(models.Egresso).count()
        total_abandonos = (
            db.query(models.Egresso).filter(models.Egresso.motivo_saida == "ABANDONO").count()
        )
        total_transferencias = (
            db.query(models.Egresso).filter(models.Egresso.motivo_saida == "TRANSFERENCIA").count()
        )
        total_conclusoes = (
            db.query(models.Egresso).filter(models.Egresso.motivo_saida == "CONCLUSAO").count()
        )
        abandonos_preditos = (
            db.query(models.Egresso)
            .filter(
                models.Egresso.motivo_saida == "ABANDONO",
                models.Egresso.tinha_predicao_risco == True,
            )
            .count()
        )

        percentual_predicao_correta = (
            round((abandonos_preditos / total_abandonos * 100), 2) if total_abandonos > 0 else 0
        )

        return {
            "egressos": egressos_list,
            "total": total_egressos,
            "estatisticas": {
                "total_egressos": total_egressos,
                "total_abandonos": total_abandonos,
                "total_transferencias": total_transferencias,
                "total_conclusoes": total_conclusoes,
                "abandonos_preditos": abandonos_preditos,
                "percentual_predicao_correta": percentual_predicao_correta,
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar egressos: {str(e)}",
        )



@router.get("/egressos/estatisticas", response_model=schemas.EgressoStatsResponse)
def estatisticas_egressos(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Obtém estatísticas gerais de egressos.
    """
    try:
        total_egressos = db.query(models.Egresso).count()
        total_abandonos = (
            db.query(models.Egresso).filter(models.Egresso.motivo_saida == "ABANDONO").count()
        )
        total_transferencias = (
            db.query(models.Egresso).filter(models.Egresso.motivo_saida == "TRANSFERENCIA").count()
        )
        total_conclusoes = (
            db.query(models.Egresso).filter(models.Egresso.motivo_saida == "CONCLUSAO").count()
        )
        abandonos_preditos = (
            db.query(models.Egresso)
            .filter(
                models.Egresso.motivo_saida == "ABANDONO",
                models.Egresso.tinha_predicao_risco == True,
            )
            .count()
        )

        percentual_predicao_correta = (
            round((abandonos_preditos / total_abandonos * 100), 2) if total_abandonos > 0 else 0
        )

        return {
            "total_egressos": total_egressos,
            "total_abandonos": total_abandonos,
            "total_transferencias": total_transferencias,
            "total_conclusoes": total_conclusoes,
            "abandonos_preditos": abandonos_preditos,
            "percentual_predicao_correta": percentual_predicao_correta,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter estatísticas: {str(e)}",
        )


@router.get("/egressos/{egresso_id}", response_model=schemas.EgressoResponse)
def obter_egresso(
    egresso_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Obtém detalhes de um egresso específico.
    """
    try:
        egresso = db.query(models.Egresso).filter(models.Egresso.id == egresso_id).first()

        if not egresso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Egresso não encontrado"
            )

        # Buscar dados do aluno
        aluno = (
            db.query(models.Aluno).filter(models.Aluno.matricula == egresso.aluno_matricula).first()
        )

        resposta = {
            **egresso.__dict__,
            "aluno_nome": aluno.nome if aluno else "N/A",
            "curso": aluno.curso.nome if aluno and aluno.curso else "N/A",
        }

        return resposta

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter egresso: {str(e)}",
        )


@router.put("/egressos/{egresso_id}", response_model=schemas.EgressoResponse)
def atualizar_egresso(
    egresso_id: int,
    egresso_data: schemas.EgressoUpdate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR")),
):
    """
    Atualiza dados de um egresso existente.
    """
    try:
        egresso = db.query(models.Egresso).filter(models.Egresso.id == egresso_id).first()

        if not egresso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Egresso não encontrado"
            )

        # Atualizar campos
        update_data = egresso_data.dict(exclude_unset=True)

        for key, value in update_data.items():
            setattr(egresso, key, value)

        egresso.data_atualizacao = datetime.now()
        egresso.atualizado_por = current_user.id

        db.commit()
        db.refresh(egresso)

        # Buscar dados do aluno para resposta
        aluno = (
            db.query(models.Aluno).filter(models.Aluno.matricula == egresso.aluno_matricula).first()
        )

        resposta = {
            **egresso.__dict__,
            "aluno_nome": aluno.nome if aluno else "N/A",
            "curso": aluno.curso.nome if aluno and aluno.curso else "N/A",
        }

        # Log de auditoria
        audit_log = models.AuditLog(
            usuario_id=current_user.id,
            acao="ATUALIZAR_EGRESSO",
            detalhes=f"Egresso atualizado: {egresso.id}",
            ip_address=request.client.host if request.client else None,
        )
        db.add(audit_log)
        db.commit()

        return resposta

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar egresso: {str(e)}",
        )


@router.delete("/egressos/{egresso_id}", status_code=status.HTTP_200_OK)
def excluir_egresso(
    egresso_id: int,
    request: Request,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_active_user),
):
    """
    Exclui um egresso (APENAS ADMIN).
    """
    # Verificar se é admin
    if current_user.role.nome != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem excluir egressos",
        )

    try:
        egresso = db.query(models.Egresso).filter(models.Egresso.id == egresso_id).first()

        if not egresso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Egresso não encontrado"
            )

        aluno_nome = egresso.aluno.nome if egresso.aluno else "Desconhecido"

        db.delete(egresso)
        db.commit()

        # Log de auditoria
        audit_log = models.AuditLog(
            usuario_id=current_user.id,
            acao="EXCLUIR_EGRESSO",
            detalhes=f"Egresso excluído: {aluno_nome} (ID: {egresso_id})",
            ip_address=request.client.host if request.client else None,
        )
        db.add(audit_log)
        db.commit()

        return {"message": "Egresso excluído com sucesso", "egresso_id": egresso_id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir egresso: {str(e)}",
        )


