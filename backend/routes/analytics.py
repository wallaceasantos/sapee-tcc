from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import auth
import database
import models

router = APIRouter()
# ============================================
# ENDPOINTS - ANALYTICS DE CORRELAÇÃO
# ============================================


@router.get("/analytics/correlacao-intervencao")
def get_correlacao_intervencao(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Analytics de correlação entre tipo de intervenção e resultado.

    Mostra quais tipos de intervenção têm maior taxa de sucesso
    na redução do risco de evasão.
    """

    # Buscar todas as intervenções concluídas com seus alunos
    intervencoes = (
        db.query(models.Intervencao)
        .join(models.Aluno, models.Intervencao.aluno_id == models.Aluno.matricula)
        .filter(models.Intervencao.status == models.StatusIntervencao.CONCLUIDA)
        .all()
    )

    # Agrupar por tipo de intervenção
    resultados_por_tipo = {}

    for intervencao in intervencoes:
        tipo = intervencao.tipo

        # Buscar evolução do risco do aluno
        predicoes = (
            db.query(models.Predicao)
            .filter(models.Predicao.aluno_id == intervencao.aluno_id)
            .order_by(models.Predicao.data_predicao)
            .all()
        )

        if len(predicoes) >= 2:
            risco_inicial = float(predicoes[0].risco_evasao)
            risco_final = float(predicoes[-1].risco_evasao)
            variacao = risco_final - risco_inicial

            if tipo not in resultados_por_tipo:
                resultados_por_tipo[tipo] = {
                    "total": 0,
                    "variacao_total": 0,
                    "sucessos": 0,  # Redução > 10%
                    "falhas": 0,  # Aumento ou redução < 5%
                    "neutros": 0,  # Redução 5-10%
                }

            resultados_por_tipo[tipo]["total"] += 1
            resultados_por_tipo[tipo]["variacao_total"] += variacao

            if variacao < -10:
                resultados_por_tipo[tipo]["sucessos"] += 1
            elif variacao > 5:
                resultados_por_tipo[tipo]["falhas"] += 1
            else:
                resultados_por_tipo[tipo]["neutros"] += 1

    # Calcular médias e taxas
    correlacao = []
    for tipo, dados in resultados_por_tipo.items():
        if dados["total"] > 0:
            correlacao.append(
                {
                    "tipo": tipo,
                    "total_intervencoes": dados["total"],
                    "variacao_media_risco": round(dados["variacao_total"] / dados["total"], 2),
                    "taxa_sucesso": round((dados["sucessos"] / dados["total"]) * 100, 1),
                    "taxa_falha": round((dados["falhas"] / dados["total"]) * 100, 1),
                    "sucessos": dados["sucessos"],
                    "falhas": dados["falhas"],
                    "neutros": dados["neutros"],
                }
            )

    # Ordenar por taxa de sucesso
    correlacao.sort(key=lambda x: x["taxa_sucesso"], reverse=True)

    return {
        "correlacao": correlacao,
        "total_intervencoes_analisadas": sum(d["total"] for d in resultados_por_tipo.values()),
        "recomendacoes": (
            [
                {
                    "tipo": item["tipo"],
                    "recomendacao": f"Alta eficácia ({item['taxa_sucesso']}% de sucesso). Recomenda-se priorizar este tipo de intervenção.",
                    "prioridade": (
                        "ALTA"
                        if item["taxa_sucesso"] >= 70
                        else "MEDIA" if item["taxa_sucesso"] >= 50 else "BAIXA"
                    ),
                }
                for item in correlacao[:3]  # Top 3
            ]
            if correlacao
            else []
        ),
    }


@router.get("/analytics/alertas-recuperacao")
def get_alertas_recuperacao(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Alertas de queda na taxa de recuperação.

    Compara a taxa de recuperação atual com períodos anteriores
    e gera alertas quando há queda significativa.
    """

    now = datetime.now()

    # Período atual (últimos 30 dias)
    periodo_atual_inicio = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    periodo_atual_fim = now.strftime("%Y-%m-%d")

    # Período anterior (30 dias antes do período atual)
    periodo_anterior_inicio = (now - timedelta(days=60)).strftime("%Y-%m-%d")
    periodo_anterior_fim = (now - timedelta(days=30)).strftime("%Y-%m-%d")

    # Calcular taxa de recuperação do período atual
    alunos_periodo_atual = (
        db.query(models.Intervencao.aluno_id)
        .filter(
            models.Intervencao.data_intervencao >= periodo_atual_inicio,
            models.Intervencao.data_intervencao <= periodo_atual_fim,
        )
        .distinct()
        .all()
    )

    recuperados_atual = 0
    for aluno_data in alunos_periodo_atual:
        matricula = aluno_data.aluno_id
        predicoes = (
            db.query(models.Predicao)
            .filter(models.Predicao.aluno_id == matricula)
            .order_by(models.Predicao.data_predicao.desc())
            .limit(2)
            .all()
        )

        if len(predicoes) >= 2:
            variacao = float(predicoes[0].risco_evasao) - float(predicoes[1].risco_evasao)
            if variacao < -20:  # Melhorou > 20%
                recuperados_atual += 1

    taxa_atual = (
        (recuperados_atual / len(alunos_periodo_atual) * 100) if alunos_periodo_atual else 0
    )

    # Calcular taxa de recuperação do período anterior
    alunos_periodo_anterior = (
        db.query(models.Intervencao.aluno_id)
        .filter(
            models.Intervencao.data_intervencao >= periodo_anterior_inicio,
            models.Intervencao.data_intervencao <= periodo_anterior_fim,
        )
        .distinct()
        .all()
    )

    recuperados_anterior = 0
    for aluno_data in alunos_periodo_anterior:
        matricula = aluno_data.aluno_id
        predicoes = (
            db.query(models.Predicao)
            .filter(models.Predicao.aluno_id == matricula)
            .order_by(models.Predicao.data_predicao.desc())
            .limit(2)
            .all()
        )

        if len(predicoes) >= 2:
            variacao = float(predicoes[0].risco_evasao) - float(predicoes[1].risco_evasao)
            if variacao < -20:  # Melhorou > 20%
                recuperados_anterior += 1

    taxa_anterior = (
        (recuperados_anterior / len(alunos_periodo_anterior) * 100)
        if alunos_periodo_anterior
        else 0
    )

    # Calcular variação
    variacao_taxa = taxa_atual - taxa_anterior

    # Gerar alertas
    alertas = []
    nivel_alerta = "NORMAL"

    if variacao_taxa < -20:
        nivel_alerta = "CRITICO"
        alertas.append(
            {
                "tipo": "QUEDA_CRITICA",
                "mensagem": f"Queda crítica de {abs(variacao_taxa):.1f}% na taxa de recuperação!",
                "recomendacao": "Revisar urgentemente as estratégias de intervenção atuais.",
                "prioridade": "URGENTE",
            }
        )
    elif variacao_taxa < -10:
        nivel_alerta = "ATENCAO"
        alertas.append(
            {
                "tipo": "QUEDA_MODERADA",
                "mensagem": f"Queda de {abs(variacao_taxa):.1f}% na taxa de recuperação.",
                "recomendacao": "Avaliar eficácia das intervenções e considerar ajustes.",
                "prioridade": "ALTA",
            }
        )
    elif variacao_taxa < 0:
        nivel_alerta = "OBSERVACAO"
        alertas.append(
            {
                "tipo": "QUEDA_LEVE",
                "mensagem": f"Leve queda de {abs(variacao_taxa):.1f}% na taxa de recuperação.",
                "recomendacao": "Monitorar de perto nos próximos dias.",
                "prioridade": "MEDIA",
            }
        )
    elif variacao_taxa > 10:
        alertas.append(
            {
                "tipo": "MELHORIA_SIGNIFICATIVA",
                "mensagem": f"Melhoria de {variacao_taxa:.1f}% na taxa de recuperação!",
                "recomendacao": "Documentar estratégias bem-sucedidas para replicação.",
                "prioridade": "BAIXA",
            }
        )

    return {
        "nivel_alerta": nivel_alerta,
        "periodo_atual": {
            "inicio": periodo_atual_inicio,
            "fim": periodo_atual_fim,
            "alunos_atendidos": len(alunos_periodo_atual),
            "recuperados": recuperados_atual,
            "taxa": round(taxa_atual, 1),
        },
        "periodo_anterior": {
            "inicio": periodo_anterior_inicio,
            "fim": periodo_anterior_fim,
            "alunos_atendidos": len(alunos_periodo_anterior),
            "recuperados": recuperados_anterior,
            "taxa": round(taxa_anterior, 1),
        },
        "variacao": round(variacao_taxa, 1),
        "alertas": alertas,
    }


# ============================================
# ENDPOINTS - INDICADORES DE EFICÁCIA DO SISTEMA
# ============================================


@router.get("/indicadores/eficacia-sistema")
def get_indicadores_eficacia_sistema(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Indicadores completos de eficácia do sistema SAPEE.

    Métricas principais:
    1. Alunos em risco recuperados
    2. Taxa de evasão real vs. predita
    3. ROI do sistema (alunos salvos)
    4. Impacto das intervenções
    """

    # Definir período (últimos 6 meses se não especificado)
    if not start_date:
        end = datetime.now()
        start = end - timedelta(days=180)
        start_date = start.strftime("%Y-%m-%d")
        end_date = end.strftime("%Y-%m-%d")
    else:
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")

    # ==========================================
    # 1. ALUNOS EM RISCO RECUPERADOS
    # ==========================================

    # Buscar todos os alunos que tiveram intervenção no período
    alunos_com_intervencao = (
        db.query(models.Intervencao.aluno_id)
        .filter(
            models.Intervencao.data_intervencao >= start_date,
            models.Intervencao.data_intervencao <= end_date,
        )
        .distinct()
        .all()
    )

    matriculas_intervencao = [a.aluno_id for a in alunos_com_intervencao]

    # Para cada aluno, verificar evolução do risco
    alunos_recuperados = []
    alunos_em_acompanhamento = []
    alunos_sem_melhoria = []

    for matricula in matriculas_intervencao:
        # Pegar predições do aluno
        predicoes = (
            db.query(models.Predicao)
            .filter(models.Predicao.aluno_id == matricula)
            .order_by(models.Predicao.data_predicao)
            .all()
        )

        if len(predicoes) >= 2:
            primeira_predicao = predicoes[0]
            ultima_predicao = predicoes[-1]

            risco_inicial = float(primeira_predicao.risco_evasao)
            risco_final = float(ultima_predicao.risco_evasao)
            variacao = risco_final - risco_inicial

            aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()

            dados_aluno = {
                "matricula": matricula,
                "nome": aluno.nome if aluno else matricula,
                "curso": aluno.curso.nome if aluno and aluno.curso else "N/A",
                "risco_inicial": risco_inicial,
                "risco_final": risco_final,
                "variacao": variacao,
                "nivel_inicial": primeira_predicao.nivel_risco,
                "nivel_final": ultima_predicao.nivel_risco,
                "intervencoes_recebidas": db.query(models.Intervencao)
                .filter(models.Intervencao.aluno_id == matricula)
                .count(),
            }

            # Classificar
            if variacao < -20 or (
                primeira_predicao.nivel_risco == "ALTO" and ultima_predicao.nivel_risco == "BAIXO"
            ):
                alunos_recuperados.append(dados_aluno)
            elif variacao < 0:
                alunos_em_acompanhamento.append(dados_aluno)
            else:
                alunos_sem_melhoria.append(dados_aluno)

    # ==========================================
    # 2. TAXA DE EVASÃO REAL VS. PREDITA
    # ==========================================

    # Alunos com risco ALTO no início do período (grupo de risco)
    alunos_risco_alto_inicial = (
        db.query(models.Predicao.aluno_id)
        .join(models.Aluno, models.Predicao.aluno_id == models.Aluno.matricula)
        .filter(
            models.Predicao.nivel_risco == "ALTO",
            models.Predicao.data_predicao >= start_date,
            models.Predicao.data_predicao <= end_date,
        )
        .distinct()
        .all()
    )

    matriculas_risco_alto = [a.aluno_id for a in alunos_risco_alto_inicial]

    # Verificar quantos ainda estão ativos (não evadiram)
    # Consideramos "ativo" se teve frequência registrada nos últimos 30 dias

    data_limite_frequencia = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

    alunos_ativos = (
        db.query(models.FrequenciaMensal.aluno_id)
        .filter(
            models.FrequenciaMensal.aluno_id.in_(matriculas_risco_alto),
            models.FrequenciaMensal.data_registro >= data_limite_frequencia,
        )
        .distinct()
        .all()
    )

    matriculas_ativas = [a.aluno_id for a in alunos_ativos]

    # Alunos que provavelmente evadiram (não têm frequência recente)
    matriculas_evasao = [m for m in matriculas_risco_alto if m not in matriculas_ativas]

    # Calcular taxas
    total_risco_alto = len(matriculas_risco_alto)
    total_ativos = len(matriculas_ativas)
    total_evasao = len(matriculas_evasao)

    taxa_evasao_real = (total_evasao / total_risco_alto * 100) if total_risco_alto > 0 else 0
    taxa_retention = (total_ativos / total_risco_alto * 100) if total_risco_alto > 0 else 0

    # ==========================================
    # 3. ROI DO SISTEMA (ALUNOS SALVOS)
    # ==========================================

    # Estimativa de alunos "salvos" pela intervenção
    # Consideramos "salvos" os alunos recuperados + em acompanhamento
    alunos_salvos = len(alunos_recuperados) + len(alunos_em_acompanhamento)

    # Calcular ROI
    # Fórmula: (Alunos Salvos / Total Intervenção) * 100
    roi_sistema = (
        (alunos_salvos / len(matriculas_intervencao) * 100) if matriculas_intervencao else 0
    )

    # Estimativa de evasão evitada
    # Base: taxa de evasão histórica sem intervenção (estimada em 40% para risco ALTO)
    taxa_evasao_historica = 0.40  # 40% sem intervenção
    evasao_esperada_sem_intervencao = total_risco_alto * taxa_evasao_historica
    evasao_evitada = evasao_esperada_sem_intervencao - total_evasao

    # ==========================================
    # 4. IMPACTO DAS INTERVENÇÕES
    # ==========================================

    # Agrupar intervenções por tipo e calcular eficácia
    intervencoes_por_tipo = (
        db.query(models.Intervencao.tipo, func.count(models.Intervencao.id).label("total"))
        .filter(
            models.Intervencao.data_intervencao >= start_date,
            models.Intervencao.data_intervencao <= end_date,
        )
        .group_by(models.Intervencao.tipo)
        .all()
    )

    impacto_por_tipo = []
    for tipo_data in intervencoes_por_tipo:
        # Buscar alunos que receberam este tipo de intervenção
        intervencoes_tipo = (
            db.query(models.Intervencao.aluno_id)
            .filter(
                models.Intervencao.tipo == tipo_data.tipo,
                models.Intervencao.data_intervencao >= start_date,
                models.Intervencao.data_intervencao <= end_date,
            )
            .distinct()
            .all()
        )

        matriculas_tipo = [a.aluno_id for a in intervencoes_tipo]

        # Calcular média de variação de risco para estes alunos
        variacoes = []
        for matricula in matriculas_tipo:
            predicoes = (
                db.query(models.Predicao)
                .filter(models.Predicao.aluno_id == matricula)
                .order_by(models.Predicao.data_predicao)
                .limit(2)
                .all()
            )

            if len(predicoes) >= 2:
                variacao = float(predicoes[-1].risco_evasao) - float(predicoes[0].risco_evasao)
                variacoes.append(variacao)

        media_variacao = sum(variacoes) / len(variacoes) if variacoes else 0
        taxa_sucesso = (
            len([v for v in variacoes if v < -10]) / len(variacoes) * 100 if variacoes else 0
        )

        impacto_por_tipo.append(
            {
                "tipo": tipo_data.tipo,
                "total_intervencoes": tipo_data.total,
                "media_variacao_risco": round(media_variacao, 2),
                "taxa_sucesso": round(taxa_sucesso, 1),
            }
        )

    # Ordenar por taxa de sucesso
    impacto_por_tipo.sort(key=lambda x: x["taxa_sucesso"], reverse=True)

    # ==========================================
    # RETORNAR INDICADORES COMPLETOS
    # ==========================================

    return {
        "periodo": {
            "inicio": start_date,
            "fim": end_date,
            "dias": (
                datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(start_date, "%Y-%m-%d")
            ).days,
        },
        "alunos_recuperados": {
            "total": len(alunos_recuperados),
            "percentual": (
                round((len(alunos_recuperados) / len(matriculas_intervencao) * 100), 1)
                if matriculas_intervencao
                else 0
            ),
            "lista": alunos_recuperados[:10],  # Top 10
        },
        "alunos_em_acompanhamento": {
            "total": len(alunos_em_acompanhamento),
            "percentual": (
                round((len(alunos_em_acompanhamento) / len(matriculas_intervencao) * 100), 1)
                if matriculas_intervencao
                else 0
            ),
        },
        "alunos_sem_melhoria": {
            "total": len(alunos_sem_melhoria),
            "percentual": (
                round((len(alunos_sem_melhoria) / len(matriculas_intervencao) * 100), 1)
                if matriculas_intervencao
                else 0
            ),
        },
        "evasao_real_vs_predita": {
            "total_risco_alto": total_risco_alto,
            "alunos_ativos": total_ativos,
            "alunos_evasao": total_evasao,
            "taxa_evasao_real": round(taxa_evasao_real, 1),
            "taxa_retention": round(taxa_retention, 1),
        },
        "roi_sistema": {
            "alunos_salvos": alunos_salvos,
            "total_intervencao": len(matriculas_intervencao),
            "roi_percentual": round(roi_sistema, 1),
            "evasao_evitada_estimada": round(evasao_evitada, 0),
            "impacto_percentual": (
                round((evasao_evitada / evasao_esperada_sem_intervencao * 100), 1)
                if evasao_esperada_sem_intervencao > 0
                else 0
            ),
        },
        "impacto_intervencoes": {
            "por_tipo": impacto_por_tipo[:5],  # Top 5 tipos
            "total_intervencoes": sum(t["total_intervencoes"] for t in impacto_por_tipo),
        },
        "resumo_geral": {
            "eficacia_geral": round(roi_sistema, 1),
            "alunos_impactados": len(matriculas_intervencao),
            "recomendacao": (
                "Sistema eficaz"
                if roi_sistema >= 60
                else "Sistema moderado" if roi_sistema >= 40 else "Necessita melhorias"
            ),
        },
    }
