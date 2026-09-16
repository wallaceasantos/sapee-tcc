import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas

logger = logging.getLogger(__name__)

router = APIRouter()
# ============================================
# ENDPOINTS - FREQUÊNCIA MENSAL
# ============================================


@router.post("/frequencias/lancar", response_model=schemas.FrequenciaLancamentoResponse)
def lancar_frequencia_mensal(
    data: schemas.FrequenciaLancamento,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Lançar frequência mensal de um ou mais alunos.
    Apenas ADMIN e COORDENADOR podem lançar.
    """
    # Verificar permissão
    if current_user.role.nome not in ["ADMIN", "COORDENADOR"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada. Apenas ADMIN e COORDENADOR podem lançar frequência.",
        )

    registros_criados = 0
    erros = []

    for item in data.alunos:
        try:
            # Verificar se aluno existe
            aluno = db.query(models.Aluno).filter(models.Aluno.matricula == item.aluno_id).first()

            if not aluno:
                erros.append(f"Aluno {item.aluno_id} não encontrado")
                continue

            # Verificar se já existe registro
            existing = (
                db.query(models.FrequenciaMensal)
                .filter(
                    models.FrequenciaMensal.aluno_id == item.aluno_id,
                    models.FrequenciaMensal.mes == data.mes,
                    models.FrequenciaMensal.ano == data.ano,
                )
                .first()
            )

            if existing:
                # Atualizar
                existing.frequencia = item.frequencia
                existing.faltas_justificadas = item.faltas_justificadas
                existing.faltas_nao_justificadas = item.faltas_nao_justificadas
                existing.total_aulas_mes = item.total_aulas_mes
                existing.observacoes = data.observacoes or existing.observacoes

                # Atualizar frequência atual do aluno
                aluno.frequencia = item.frequencia

                logger.info(
                    "Frequência atualizada: %s - %s/%s = %s%%", item.aluno_id, data.mes, data.ano, item.frequencia
                )
            else:
                # Criar
                frequencia = models.FrequenciaMensal(
                    aluno_id=item.aluno_id,
                    mes=data.mes,
                    ano=data.ano,
                    frequencia=item.frequencia,
                    faltas_justificadas=item.faltas_justificadas,
                    faltas_nao_justificadas=item.faltas_nao_justificadas,
                    total_aulas_mes=item.total_aulas_mes,
                    observacoes=data.observacoes,
                )
                db.add(frequencia)

                # Atualizar frequência atual do aluno
                aluno.frequencia = item.frequencia

                logger.info(
                    "Frequência criada: %s - %s/%s = %s%%", item.aluno_id, data.mes, data.ano, item.frequencia
                )

            registros_criados += 1

        except Exception as e:
            erros.append(f"Erro ao processar aluno {item.aluno_id}: {str(e)}")
            logger.error("%s", erros[-1])

    db.commit()

    mensagem = f"{registros_criados} registro(s) criado(s) com sucesso!"
    if erros:
        mensagem += f" {len(erros)} erro(s)."

    return {
        "registros_criados": registros_criados,
        "mes": data.mes,
        "ano": data.ano,
        "mensagem": mensagem,
    }


@router.post("/alunos/{matricula}/frequencia", response_model=schemas.FrequenciaMensalResponse)
def registrar_frequencia_mensal(
    matricula: str,
    frequencia_data: schemas.FrequenciaMensalCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Registrar frequência mensal de um aluno"""

    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()

    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    # Verificar se já existe registro para este mês/ano
    existing = (
        db.query(models.FrequenciaMensal)
        .filter(
            models.FrequenciaMensal.aluno_id == matricula,
            models.FrequenciaMensal.mes == frequencia_data.mes,
            models.FrequenciaMensal.ano == frequencia_data.ano,
        )
        .first()
    )

    if existing:
        # Atualizar registro existente
        existing.frequencia = frequencia_data.frequencia
        existing.faltas_justificadas = frequencia_data.faltas_justificadas
        existing.faltas_nao_justificadas = frequencia_data.faltas_nao_justificadas
        existing.total_aulas_mes = frequencia_data.total_aulas_mes
        existing.observacoes = frequencia_data.observacoes

        db.commit()
        db.refresh(existing)

        return existing
    else:
        # Criar novo registro
        db_frequencia = models.FrequenciaMensal(
            **frequencia_data.model_dump(exclude={"aluno_id"}), aluno_id=matricula
        )

        db.add(db_frequencia)
        db.commit()
        db.refresh(db_frequencia)

        return db_frequencia


@router.get(
    "/alunos/{matricula}/frequencia-historico",
    response_model=List[schemas.FrequenciaMensalResponse],
)
def get_historico_frequencia(
    matricula: str,
    meses: int = 4,  # ✅ Padrão: 4 meses (ideal para evasão)
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Obter histórico de frequência dos últimos meses.
    Padrão: 4 meses (ideal para detecção de evasão)
    """

    historico = (
        db.query(models.FrequenciaMensal)
        .filter(models.FrequenciaMensal.aluno_id == matricula)
        .order_by(desc(models.FrequenciaMensal.ano), desc(models.FrequenciaMensal.mes))
        .limit(meses)
        .all()
    )

    # Retornar em ordem cronológica (mais antigo primeiro)
    return list(reversed(historico))


@router.get("/alunos/{matricula}/frequencia-tendencia")
def get_tendencia_frequencia(
    matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Calcular tendência de frequência (últimos 4 meses).

    Retorna:
    - tendencia: "SUBINDO", "ESTAVEL", "DESCENDO"
    - variacao: diferença em pontos percentuais
    - alerta: True se queda brusca (>10%)

    Regras (baseadas em 4 meses):
    - Compara último mês com média dos 3 anteriores
    - Alerta se queda > 10%
    """

    # Buscar últimos 4 meses
    historico = (
        db.query(models.FrequenciaMensal)
        .filter(models.FrequenciaMensal.aluno_id == matricula)
        .order_by(desc(models.FrequenciaMensal.ano), desc(models.FrequenciaMensal.mes))
        .limit(4)
        .all()
    )

    # Precisa de pelo menos 2 meses para calcular tendência
    if not historico or len(historico) < 2:
        return {
            "tendencia": "INSUFICIENTE",
            "variacao": 0,
            "alerta": False,
            "mensagem": "Dados insuficientes para calcular tendência (mínimo 2 meses)",
        }

    # Calcular média dos últimos 3 meses vs. anteriores
    # Com 4 meses: compara mês 4 com média dos meses 1-3
    if len(historico) >= 4:
        recentes = historico[:1]  # Mês mais recente (mês 4)
        antigas = historico[1:4]  # 3 meses anteriores (meses 1-3)
    else:
        # Com 2-3 meses: compara último com média dos anteriores
        recentes = historico[:1]
        antigas = historico[1:]

    media_recente = sum(f.frequencia for f in recentes) / len(recentes)
    media_antiga = sum(f.frequencia for f in antigas) / len(antigas)

    variacao = media_recente - media_antiga

    # Classificar tendência (regras para 4 meses)
    if variacao > 5:
        tendencia = "SUBINDO"  # ✅ Melhoria significativa
    elif variacao < -5:
        tendencia = "DESCENDO"  # ⚠️ Queda preocupante
    else:
        tendencia = "ESTAVEL"  # ➡️ Estável

    # Alerta de queda brusca (>10% em 4 meses)
    alerta = variacao < -10

    return {
        "tendencia": tendencia,
        "variacao": round(variacao, 2),
        "alerta": alerta,
        "media_recente": round(media_recente, 2),
        "media_antiga": round(media_antiga, 2),
        "mensagem": f"Frequência {tendencia.lower()} {abs(variacao):.1f}%",
    }
