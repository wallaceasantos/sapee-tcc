from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

import auth
import database
import export_utils
import models

router = APIRouter()
# ============================================
# ENDPOINTS - RELATÓRIOS DE EFICÁCIA
# ============================================


@router.get("/relatorios/eficacia")
def get_relatorio_eficacia(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    curso_id: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Relatório de eficácia das intervenções.

    Mostra:
    - Total de intervenções por tipo
    - Taxa de conclusão por tipo
    - Tempo médio de resolução
    - Alunos recuperados vs evadidos
    - Impacto das intervenções no risco de evasão
    """

    # Definir período (últimos 6 meses se não especificado)
    if not start_date:
        end = datetime.now()
        start = end - timedelta(days=180)
        start_date = start.strftime("%Y-%m-%d")
        end_date = end.strftime("%Y-%m-%d")

    # Query base de intervenções
    query = db.query(models.Intervencao).join(models.Intervencao.aluno)

    # Filtrar por período
    query = query.filter(
        models.Intervencao.data_intervencao >= start_date,
        models.Intervencao.data_intervencao <= end_date,
    )

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)

    # Filtrar por curso específico
    if curso_id and current_user.role.nome == "ADMIN":
        query = query.filter(models.Aluno.curso_id == curso_id)

    # Total de intervenções
    total_intervencoes = query.count()

    # Contar por status
    concluidas = query.filter(
        models.Intervencao.status == models.StatusIntervencao.CONCLUIDA
    ).count()
    canceladas = query.filter(
        models.Intervencao.status == models.StatusIntervencao.CANCELADA
    ).count()
    pendentes = query.filter(models.Intervencao.status == models.StatusIntervencao.PENDENTE).count()
    em_andamento = query.filter(
        models.Intervencao.status == models.StatusIntervencao.EM_ANDAMENTO
    ).count()

    # Taxa de conclusão geral
    taxa_conclusao_geral = (
        round((concluidas / total_intervencoes * 100), 1) if total_intervencoes > 0 else 0
    )

    # Contar por tipo
    intervencoes_por_tipo = (
        db.query(
            models.Intervencao.tipo,
            func.count(models.Intervencao.id).label("total"),
            func.sum(func.if_(models.Intervencao.status == "CONCLUIDA", 1, 0)).label("concluidas"),
        )
        .filter(
            models.Intervencao.data_intervencao >= start_date,
            models.Intervencao.data_intervencao <= end_date,
        )
        .group_by(models.Intervencao.tipo)
        .all()
    )

    # Tempo médio de resolução (dias)
    tempo_medio_result = (
        db.query(
            func.avg(
                func.datediff(
                    models.Intervencao.data_conclusao, models.Intervencao.data_intervencao
                )
            )
        )
        .filter(
            models.Intervencao.status == models.StatusIntervencao.CONCLUIDA,
            models.Intervencao.data_conclusao.is_not(None),
        )
        .scalar()
    )

    tempo_medio_resolucao = round(float(tempo_medio_result), 1) if tempo_medio_result else None

    # Alunos atendidos (únicos)
    alunos_atendidos = query.distinct(models.Intervencao.aluno_id).count()

    # Intervenções por prioridade
    intervencoes_por_prioridade = (
        db.query(models.Intervencao.prioridade, func.count(models.Intervencao.id).label("total"))
        .filter(
            models.Intervencao.data_intervencao >= start_date,
            models.Intervencao.data_intervencao <= end_date,
        )
        .group_by(models.Intervencao.prioridade)
        .all()
    )

    # Top 5 tipos de intervenção mais comuns
    top_tipos = sorted(
        [
            {
                "tipo": t.tipo,
                "total": t.total,
                "concluidas": t.concluidas,
                "taxa_conclusao": round((t.concluidas / t.total * 100), 1) if t.total > 0 else 0,
            }
            for t in intervencoes_por_tipo
        ],
        key=lambda x: x["total"],
        reverse=True,
    )[:5]

    # Distribuição por prioridade
    distribuicao_prioridade = {p.prioridade: p.total for p in intervencoes_por_prioridade}

    return {
        "periodo": {"inicio": start_date, "fim": end_date},
        "resumo": {
            "total_intervencoes": total_intervencoes,
            "alunos_atendidos": alunos_atendidos,
            "concluidas": concluidas,
            "canceladas": canceladas,
            "pendentes": pendentes,
            "em_andamento": em_andamento,
            "taxa_conclusao_geral": taxa_conclusao_geral,
            "tempo_medio_resolucao_dias": tempo_medio_resolucao,
        },
        "top_tipos": top_tipos,
        "distribuicao_prioridade": distribuicao_prioridade,
    }


@router.get("/relatorios/alunos-recuperados")
def get_relatorio_alunos_recuperados(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Relatório de alunos recuperados após intervenções.

    Considera-se "recuperado" o aluno que:
    - Tinha risco ALTO/MEDIO
    - Recebeu intervenção
    - Atualmente tem risco BAIXO ou reduziu significativamente o score
    """

    # Definir período (últimos 6 meses se não especificado)
    if not start_date:
        end = datetime.now()
        start = end - timedelta(days=180)
        start_date = start.strftime("%Y-%m-%d")
        end_date = end.strftime("%Y-%m-%d")

    # Subquery para pegar primeira predição antes da intervenção
    subq_primeira = (
        select(
            models.Predicao.aluno_id, func.min(models.Predicao.data_predicao).label("primeira_data")
        )
        .filter(models.Predicao.data_predicao <= end_date)
        .group_by(models.Predicao.aluno_id)
        .subquery()
    )

    # Subquery para pegar última predição
    subq_ultima = (
        select(
            models.Predicao.aluno_id, func.max(models.Predicao.data_predicao).label("ultima_data")
        )
        .group_by(models.Predicao.aluno_id)
        .subquery()
    )

    # Alunos com intervenções no período
    alunos_com_intervencao = (
        db.query(models.Intervencao.aluno_id)
        .filter(
            models.Intervencao.data_intervencao >= start_date,
            models.Intervencao.data_intervencao <= end_date,
        )
        .distinct()
        .all()
    )

    alunos_matriculas = [a.aluno_id for a in alunos_com_intervencao]

    # Para cada aluno, comparar evolução do risco
    alunos_recuperados = []
    alunos_com_piora = []

    for matricula in alunos_matriculas:
        # Predição mais antiga
        predicao_antiga = (
            db.query(models.Predicao)
            .join(subq_primeira, models.Predicao.aluno_id == subq_primeira.c.aluno_id)
            .filter(
                models.Predicao.aluno_id == matricula,
                models.Predicao.data_predicao == subq_primeira.c.primeira_data,
            )
            .first()
        )

        # Predição mais recente
        predicao_recente = (
            db.query(models.Predicao)
            .join(subq_ultima, models.Predicao.aluno_id == subq_ultima.c.aluno_id)
            .filter(
                models.Predicao.aluno_id == matricula,
                models.Predicao.data_predicao == subq_ultima.c.ultima_data,
            )
            .first()
        )

        if predicao_antiga and predicao_recente:
            evolucao = {
                "matricula": matricula,
                "nome": predicao_recente.aluno.nome if predicao_recente.aluno else matricula,
                "curso": (
                    predicao_recente.aluno.curso.nome
                    if predicao_recente.aluno and predicao_recente.aluno.curso
                    else "N/A"
                ),
                "risco_inicial": predicao_antiga.risco_evasao,
                "risco_final": predicao_recente.risco_evasao,
                "nivel_inicial": predicao_antiga.nivel_risco,
                "nivel_final": predicao_recente.nivel_risco,
                "variacao": float(predicao_recente.risco_evasao)
                - float(predicao_antiga.risco_evasao),
            }

            # Melhorou significativamente (redução > 20% ou mudou de nível)
            if evolucao["variacao"] < -20 or (
                evolucao["nivel_inicial"] == "ALTO" and evolucao["nivel_final"] == "BAIXO"
            ):
                alunos_recuperados.append(evolucao)
            # Piorou
            elif evolucao["variacao"] > 20:
                alunos_com_piora.append(evolucao)

    # Estatísticas
    total_alunos = len(alunos_matriculas)
    taxa_recuperacao = (
        round((len(alunos_recuperados) / total_alunos * 100), 1) if total_alunos > 0 else 0
    )
    taxa_piora = round((len(alunos_com_piora) / total_alunos * 100), 1) if total_alunos > 0 else 0

    return {
        "periodo": {"inicio": start_date, "fim": end_date},
        "estatisticas": {
            "total_alunos_atendidos": total_alunos,
            "alunos_recuperados": len(alunos_recuperados),
            "alunos_com_piora": len(alunos_com_piora),
            "taxa_recuperacao": taxa_recuperacao,
            "taxa_piora": taxa_piora,
        },
        "alunos_recuperados": alunos_recuperados[:10],  # Top 10
        "alunos_com_piora": alunos_com_piora[:10],  # Top 10
    }


# ============================================
# ENDPOINTS - RELATÓRIOS GERENCIAIS
# ============================================


@router.get("/relatorios/geral")
def get_relatorio_geral(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    curso_id: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Relatório geral do sistema com todos os indicadores.
    """

    # Definir período (últimos 30 dias se não especificado)
    if not data_inicio:
        data_fim_dt = datetime.now()
        data_inicio_dt = data_fim_dt - timedelta(days=30)
        data_inicio = data_inicio_dt.strftime("%Y-%m-%d")
        data_fim = data_fim_dt.strftime("%Y-%m-%d")

    # Query base de alunos
    query_alunos = db.query(models.Aluno)

    if curso_id:
        query_alunos = query_alunos.filter(models.Aluno.curso_id == curso_id)

    total_alunos = query_alunos.count()

    # Contar por nível de risco
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
        .filter(
            models.Predicao.data_predicao >= data_inicio, models.Predicao.data_predicao <= data_fim
        )
    )

    risco_alto = ultimas_predicoes.filter(models.Predicao.nivel_risco == "ALTO").count()
    risco_medio = ultimas_predicoes.filter(models.Predicao.nivel_risco == "MEDIO").count()
    risco_baixo = ultimas_predicoes.filter(models.Predicao.nivel_risco == "BAIXO").count()

    # Intervenções no período
    intervencoes = db.query(models.Intervencao).filter(
        models.Intervencao.data_intervencao >= data_inicio,
        models.Intervencao.data_intervencao <= data_fim,
    )

    total_intervencoes = intervencoes.count()
    intervencoes_pendentes = intervencoes.filter(models.Intervencao.status == "PENDENTE").count()
    intervencoes_concluidas = intervencoes.filter(models.Intervencao.status == "CONCLUIDA").count()

    # Alertas de faltas
    alertas_faltas = db.query(models.AlertaFaltasConsecutivas).filter(
        models.AlertaFaltasConsecutivas.criado_at >= data_inicio,
        models.AlertaFaltasConsecutivas.criado_at <= data_fim,
    )

    total_alertas = alertas_faltas.count()
    alertas_pendentes = alertas_faltas.filter(
        models.AlertaFaltasConsecutivas.status == "PENDENTE"
    ).count()

    return {
        "periodo": {"inicio": data_inicio, "fim": data_fim},
        "resumo": {
            "total_alunos": total_alunos,
            "risco_alto": risco_alto,
            "risco_medio": risco_medio,
            "risco_baixo": risco_baixo,
            "total_intervencoes": total_intervencoes,
            "intervencoes_pendentes": intervencoes_pendentes,
            "intervencoes_concluidas": intervencoes_concluidas,
            "total_alertas_faltas": total_alertas,
            "alertas_faltas_pendentes": alertas_pendentes,
        },
        "indicadores": {
            "percentual_risco_alto": (
                round((risco_alto / total_alunos * 100), 1) if total_alunos > 0 else 0
            ),
            "taxa_conclusao_intervencao": (
                round((intervencoes_concluidas / total_intervencoes * 100), 1)
                if total_intervencoes > 0
                else 0
            ),
            "taxa_alertas_resolvidos": (
                round(((total_alertas - alertas_pendentes) / total_alertas * 100), 1)
                if total_alertas > 0
                else 0
            ),
        },
    }


@router.get("/relatorios/alunos-risco")
def get_relatorio_alunos_risco(
    nivel_risco: Optional[str] = None,
    curso_id: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Relatório de alunos por nível de risco.
    """

    query = db.query(models.Aluno).options(
        joinedload(models.Aluno.curso), joinedload(models.Aluno.predicoes)
    )

    if curso_id:
        query = query.filter(models.Aluno.curso_id == curso_id)

    alunos = query.all()

    # Filtrar por nível de risco (última predição)
    alunos_com_risco = []
    for aluno in alunos:
        if aluno.predicoes:
            ultima_predicao = max(aluno.predicoes, key=lambda p: p.data_predicao)

            if not nivel_risco or ultima_predicao.nivel_risco == nivel_risco:
                alunos_com_risco.append(
                    {
                        "matricula": aluno.matricula,
                        "nome": aluno.nome,
                        "curso": aluno.curso.nome if aluno.curso else "N/A",
                        "nivel_risco": ultima_predicao.nivel_risco,
                        "risco_evasao": float(ultima_predicao.risco_evasao),
                        "fatores": ultima_predicao.fatores_principais,
                    }
                )

    # Ordenar por risco (ALTO > MEDIO > BAIXO)
    ordem_risco = {"ALTO": 0, "MEDIO": 1, "BAIXO": 2}
    alunos_com_risco.sort(key=lambda x: (ordem_risco.get(x["nivel_risco"], 3), -x["risco_evasao"]))

    return {"total": len(alunos_com_risco), "alunos": alunos_com_risco[:100]}  # Limita a 100


@router.get("/relatorios/intervencoes")
def get_relatorio_intervencoes(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    status: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Relatório de intervenções realizadas.
    """

    # Definir período
    if not data_inicio:
        data_fim_dt = datetime.now()
        data_inicio_dt = data_fim_dt - timedelta(days=30)
        data_inicio = data_inicio_dt.strftime("%Y-%m-%d")
        data_fim = data_fim_dt.strftime("%Y-%m-%d")

    query = (
        db.query(models.Intervencao)
        .options(joinedload(models.Intervencao.aluno), joinedload(models.Intervencao.usuario))
        .filter(
            models.Intervencao.data_intervencao >= data_inicio,
            models.Intervencao.data_intervencao <= data_fim,
        )
    )

    if status:
        query = query.filter(models.Intervencao.status == status)

    intervencoes = query.order_by(models.Intervencao.data_intervencao.desc()).all()

    return {
        "periodo": {"inicio": data_inicio, "fim": data_fim},
        "total": len(intervencoes),
        "intervencoes": [
            {
                "id": i.id,
                "aluno": i.aluno.nome if i.aluno else "N/A",
                "matricula": i.aluno_matricula,
                "tipo": i.tipo,
                "status": i.status,
                "prioridade": i.prioridade,
                "data_intervencao": i.data_intervencao.isoformat(),
                "responsavel": i.usuario.nome if i.usuario else "N/A",
            }
            for i in intervencoes[:200]  # Limita a 200
        ],
    }


@router.get("/relatorios/faltas-alertas")
def get_relatorio_faltas_alertas(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    status: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Relatório de alertas de faltas consecutivas.
    """

    # Definir período
    if not data_inicio:
        data_fim_dt = datetime.now()
        data_inicio_dt = data_fim_dt - timedelta(days=30)
        data_inicio = data_inicio_dt.strftime("%Y-%m-%d")
        data_fim = data_fim_dt.strftime("%Y-%m-%d")

    query = (
        db.query(models.AlertaFaltasConsecutivas)
        .options(joinedload(models.AlertaFaltasConsecutivas.aluno))
        .filter(
            models.AlertaFaltasConsecutivas.criado_at >= data_inicio,
            models.AlertaFaltasConsecutivas.criado_at <= data_fim,
        )
    )

    if status:
        query = query.filter(models.AlertaFaltasConsecutivas.status == status)

    alertas = query.order_by(models.AlertaFaltasConsecutivas.criado_at.desc()).all()

    return {
        "periodo": {"inicio": data_inicio, "fim": data_fim},
        "total": len(alertas),
        "alertas": [
            {
                "id": a.id,
                "aluno": a.aluno.nome if a.aluno else "N/A",
                "matricula": a.aluno_matricula,
                "tipo_alerta": a.tipo_alerta,
                "quantidade_faltas": a.quantidade_faltas,
                "status": a.status,
                "data_criacao": a.criado_at.isoformat(),
            }
            for a in alertas[:200]  # Limita a 200
        ],
    }


# ============================================
# ENDPOINTS DE RELATÓRIOS GERENCIAIS
# ============================================


@router.get("/relatorios/gerenciais/alunos-risco")
def relatorio_alunos_risco(
    nivel: str = "TODOS",  # BAIXO, MEDIO, ALTO, MUITO_ALTO, TODOS
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Lista de alunos com predição de risco atual."""
    query = (
        db.query(models.Aluno, models.Predicao, models.Curso)
        .join(models.Predicao, models.Aluno.matricula == models.Predicao.aluno_id)
        .outerjoin(models.Curso, models.Aluno.curso_id == models.Curso.id)
    )

    # Filtro para pegar a predição mais recente (subquery ou order_by limit 1 por aluno)
    # Aqui vamos simplificar e trazer tudo, o frontend ou lógica filtra,
    # mas o ideal é uma query otimizada. Vamos trazer todos e filtrar.
    results = query.all()

    alunos_risco = []
    for aluno, pred, curso in results:
        if nivel != "TODOS" and pred.nivel_risco != nivel:
            continue

        # Apenas alto risco se não for TODOS ou se for explicitamente alto
        if nivel == "TODOS" and pred.nivel_risco not in [
            models.NivelRisco.ALTO,
            models.NivelRisco.MUITO_ALTO,
        ]:
            # Se for TODOS, geralmente relatório gerencial foca em risco.
            # Filtrar apenas ALTO/MUITO_ALTO por padrão gerencial
            continue

        alunos_risco.append(
            {
                "matricula": aluno.matricula,
                "nome": aluno.nome,
                "curso": curso.nome if curso else "N/A",
                "turno": aluno.turno,
                "nivel_risco": (
                    pred.nivel_risco.value
                    if hasattr(pred.nivel_risco, "value")
                    else pred.nivel_risco
                ),
                "score_risco": float(pred.risco_evasao),
                "fatores": pred.fatores_principais,
                "ultima_predicao": pred.data_predicao.isoformat() if pred.data_predicao else None,
            }
        )

    # Ordenar por score de risco decrescente
    alunos_risco.sort(key=lambda x: x["score_risco"], reverse=True)

    return alunos_risco


@router.get("/relatorios/gerenciais/alunos-risco/export")
def export_alunos_risco(
    nivel: str = "TODOS",
    formato: str = "xlsx",  # xlsx | pdf
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Exporta a lista de alunos em risco em Excel (.xlsx) ou PDF."""
    formato = (formato or "xlsx").lower()
    if formato not in ("xlsx", "pdf"):
        raise HTTPException(status_code=400, detail="Formato inválido. Use 'xlsx' ou 'pdf'.")

    dados = relatorio_alunos_risco(nivel=nivel, current_user=current_user, db=db)

    headers = [
        "Matrícula",
        "Nome",
        "Curso",
        "Turno",
        "Nível de Risco",
        "Score (%)",
        "Fatores Principais",
        "Última Predição",
    ]
    rows = [
        [
            d["matricula"],
            d["nome"],
            d["curso"],
            d["turno"] or "-",
            d["nivel_risco"],
            f"{d['score_risco']:.1f}",
            d["fatores"] or "-",
            d["ultima_predicao"] or "-",
        ]
        for d in dados
    ]

    titulo = "SAPEE - Alunos em Risco de Evasão"
    subtitulo = (
        f"Nível: {nivel} | Total: {len(rows)} | "
        f"Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    )

    if formato == "pdf":
        conteudo = export_utils.gerar_pdf(titulo, headers, rows, subtitulo)
        media = "application/pdf"
    else:
        conteudo = export_utils.gerar_xlsx(titulo, headers, rows, subtitulo)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    filename = f"alunos-risco-{datetime.now().strftime('%Y%m%d-%H%M')}.{formato}"
    return Response(
        content=conteudo,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/relatorios/gerenciais/mapa-calor")
def relatorio_mapa_calor(
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Agregação de alunos em risco por Zona Residencial."""
    # Buscar todos os alunos com risco ALTO ou MUITO_ALTO
    query = (
        db.query(models.Aluno, models.Predicao)
        .join(models.Predicao, models.Aluno.matricula == models.Predicao.aluno_id)
        .filter(
            models.Predicao.nivel_risco.in_([models.NivelRisco.ALTO, models.NivelRisco.MUITO_ALTO])
        )
    )

    results = query.all()

    mapa = {}
    for aluno, pred in results:
        zona = aluno.zona_residencial or "Não informada"
        # Limpar string se vier com ZONA_
        zona_limpa = zona.replace("ZONA_", "").capitalize() if zona.startswith("ZONA_") else zona

        if zona_limpa not in mapa:
            mapa[zona_limpa] = {
                "zona": zona_limpa,
                "total_alunos": 0,
                "media_risco": 0.0,
                "soma_risco": 0.0,
            }

        mapa[zona_limpa]["total_alunos"] += 1
        mapa[zona_limpa]["soma_risco"] += float(pred.risco_evasao)

    # Calcular médias
    for zona_data in mapa.values():
        if zona_data["total_alunos"] > 0:
            zona_data["media_risco"] = round(zona_data["soma_risco"] / zona_data["total_alunos"], 2)
        del zona_data["soma_risco"]  # Remover helper

    return sorted(list(mapa.values()), key=lambda x: x["media_risco"], reverse=True)


@router.get("/relatorios/gerenciais/eficacia")
def relatorio_eficacia(
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Dados para análise de eficácia de intervenções."""
    # Buscar intervenções com dados do aluno e última predição
    query = db.query(models.Intervencao, models.Aluno).join(
        models.Aluno, models.Intervencao.aluno_id == models.Aluno.matricula
    )

    results = query.all()

    dados = []
    for interv, aluno in results:
        # Pegar predição atual
        pred_atual = (
            db.query(models.Predicao)
            .filter(models.Predicao.aluno_id == aluno.matricula)
            .order_by(models.Predicao.data_predicao.desc())
            .first()
        )

        dados.append(
            {
                "id_intervencao": interv.id,
                "aluno": aluno.nome,
                "matricula": aluno.matricula,
                "tipo_intervencao": interv.tipo,
                "status": interv.status.value if hasattr(interv.status, "value") else interv.status,
                "data_inicio": (
                    interv.data_intervencao.isoformat() if interv.data_intervencao else None
                ),
                "prioridade": interv.prioridade,
                "risco_atual": float(pred_atual.risco_evasao) if pred_atual else None,
                "nivel_risco_atual": (
                    (
                        pred_atual.nivel_risco.value
                        if hasattr(pred_atual.nivel_risco, "value")
                        else pred_atual.nivel_risco
                    )
                    if pred_atual
                    else None
                ),
            }
        )

    return dados
