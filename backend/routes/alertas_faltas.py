import locale
from calendar import month_name
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, extract, func
from sqlalchemy.orm import Session, joinedload

import auth
import database
import models
import schemas

router = APIRouter()
# ============================================
# ENDPOINTS - FALTAS CONSECUTIVAS
# ============================================

# --- REGISTRO DE FALTAS DIÁRIAS ---


@router.post("/alunos/{matricula}/faltas", response_model=schemas.RegistroFaltasDiariasResponse)
def registrar_falta(
    matricula: str,
    falta: schemas.RegistroFaltasDiariasCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Registrar falta diária para um aluno"""
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Verificar se já existe registro para esta data/disciplina
    existing = (
        db.query(models.RegistroFaltasDiarias)
        .filter(
            models.RegistroFaltasDiarias.aluno_matricula == matricula,
            models.RegistroFaltasDiarias.data == falta.data,
            models.RegistroFaltasDiarias.disciplina == falta.disciplina,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400, detail="Já existe registro de falta para esta data e disciplina"
        )

    # Criar registro
    db_falta = models.RegistroFaltasDiarias(
        **falta.model_dump(), aluno_matricula=matricula, criado_por=current_user.id
    )

    db.add(db_falta)
    db.commit()
    db.refresh(db_falta)

    return db_falta


@router.get(
    "/alunos/{matricula}/faltas", response_model=List[schemas.RegistroFaltasDiariasResponse]
)
def listar_faltas_aluno(
    matricula: str,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Listar faltas de um aluno com filtros de data"""

    query = db.query(models.RegistroFaltasDiarias).filter(
        models.RegistroFaltasDiarias.aluno_matricula == matricula
    )

    # Filtros de data
    if data_inicio:
        query = query.filter(models.RegistroFaltasDiarias.data >= data_inicio)
    else:
        # Padrão: últimos 30 dias
        data_inicio = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        query = query.filter(models.RegistroFaltasDiarias.data >= data_inicio)

    if data_fim:
        query = query.filter(models.RegistroFaltasDiarias.data <= data_fim)

    faltas = query.order_by(models.RegistroFaltasDiarias.data.desc()).all()
    return faltas


@router.get("/alunos/{matricula}/faltas-por-disciplina")
def faltas_por_disciplina(
    matricula: str,
    periodo_letivo: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Agregar faltas de um aluno por disciplina.
    Retorna total de faltas, datas das últimas faltas e status de justificativa por disciplina.
    """

    # Query base
    query = db.query(
        models.RegistroFaltasDiarias.disciplina,
        func.count(models.RegistroFaltasDiarias.id).label("total_faltas"),
        func.sum(case((models.RegistroFaltasDiarias.justificada == True, 1), else_=0)).label(
            "faltas_justificadas"
        ),
        func.sum(case((models.RegistroFaltasDiarias.justificada == False, 1), else_=0)).label(
            "faltas_nao_justificadas"
        ),
        func.max(models.RegistroFaltasDiarias.data).label("ultima_falta"),
        func.group_concat(
            func.date_format(models.RegistroFaltasDiarias.data, "%Y-%m-%d"),
        ).label("datas_faltas"),
    ).filter(models.RegistroFaltasDiarias.aluno_matricula == matricula)

    if periodo_letivo:
        # Filtrar por ano letivo (ex: "2024-1" → ano 2024)
        ano = periodo_letivo.split("-")[0]
        query = query.filter(func.year(models.RegistroFaltasDiarias.data) == int(ano))

    resultados = (
        query.group_by(models.RegistroFaltasDiarias.disciplina)
        .order_by(func.count(models.RegistroFaltasDiarias.id).desc())
        .all()
    )

    return [
        {
            "disciplina": r.disciplina,
            "total_faltas": r.total_faltas,
            "faltas_justificadas": r.faltas_justificadas or 0,
            "faltas_nao_justificadas": r.faltas_nao_justificadas or 0,
            "ultima_falta": r.ultima_falta.isoformat() if r.ultima_falta else None,
            "datas_faltas": r.datas_faltas.split(",") if r.datas_faltas else [],
        }
        for r in resultados
    ]


@router.get("/alunos/{matricula}/faltas-consecutivas")
def verificar_faltas_consecutivas(
    matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Verificar faltas consecutivas de um aluno.

    Retorna:
    - Total de faltas consecutivas atuais
    - Período (data início e fim)
    - Disciplinas afetadas
    - Nível de alerta (3, 5, ou 10 faltas)
    """

    # Buscar faltas dos últimos 15 dias
    data_limite = datetime.now() - timedelta(days=15)

    faltas = (
        db.query(models.RegistroFaltasDiarias)
        .filter(
            models.RegistroFaltasDiarias.aluno_matricula == matricula,
            models.RegistroFaltasDiarias.data >= data_limite,
        )
        .order_by(models.RegistroFaltasDiarias.data)
        .all()
    )

    if not faltas:
        return {"total_consecutivas": 0, "nivel_alerta": None, "disciplinas": [], "periodo": None}

    # Calcular sequências consecutivas
    sequencias = []
    sequencia_atual = [faltas[0]]

    for i in range(1, len(faltas)):
        dias_diff = (faltas[i].data - faltas[i - 1].data).days
        if dias_diff <= 3:  # Considera consecutivas se diferença <= 3 dias
            sequencia_atual.append(faltas[i])
        else:
            if len(sequencia_atual) >= 3:
                sequencias.append(sequencia_atual)
            sequencia_atual = [faltas[i]]

    if len(sequencia_atual) >= 3:
        sequencias.append(sequencia_atual)

    if not sequencias:
        return {"total_consecutivas": 0, "nivel_alerta": None, "disciplinas": [], "periodo": None}

    # Pegar maior sequência
    maior_sequencia = max(sequencias, key=len)
    total = len(maior_sequencia)

    # Determinar nível de alerta
    if total >= 10:
        nivel_alerta = "10_FALTAS"
    elif total >= 5:
        nivel_alerta = "5_FALTAS"
    elif total >= 3:
        nivel_alerta = "3_FALTAS"
    else:
        nivel_alerta = None

    disciplinas = list(set(f.disciplina for f in maior_sequencia))

    return {
        "total_consecutivas": total,
        "nivel_alerta": nivel_alerta,
        "disciplinas": disciplinas,
        "periodo": {
            "inicio": maior_sequencia[0].data.isoformat(),
            "fim": maior_sequencia[-1].data.isoformat(),
        },
        "todas_faltas": [
            {"data": f.data.isoformat(), "disciplina": f.disciplina, "justificada": f.justificada}
            for f in maior_sequencia
        ],
    }


# --- ALERTAS DE FALTAS CONSECUTIVAS ---


@router.get("/alertas-faltas", response_model=List[schemas.AlertaFaltasConsecutivasResponse])
def listar_alertas_faltas(
    status: Optional[str] = None,
    tipo_alerta: Optional[str] = None,
    curso_id: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Listar alertas de faltas consecutivas com filtros"""
    query = db.query(models.AlertaFaltasConsecutivas).options(
        joinedload(models.AlertaFaltasConsecutivas.aluno),
        joinedload(models.AlertaFaltasConsecutivas.responsavel),
        joinedload(models.AlertaFaltasConsecutivas.historico).joinedload(
            models.AlertaFaltasHistorico.usuario
        ),
    )

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.AlertaFaltasConsecutivas.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )

    # Filtro por curso (para ADMIN)
    if current_user.role.nome == "ADMIN" and curso_id:
        query = query.join(models.AlertaFaltasConsecutivas.aluno).filter(
            models.Aluno.curso_id == curso_id
        )

    if status:
        query = query.filter(models.AlertaFaltasConsecutivas.status == status)
    if tipo_alerta:
        query = query.filter(models.AlertaFaltasConsecutivas.tipo_alerta == tipo_alerta)

    alertas = query.order_by(models.AlertaFaltasConsecutivas.criado_at.desc()).all()
    return alertas


@router.put("/alertas-faltas/{alerta_id}", response_model=schemas.AlertaFaltasConsecutivasResponse)
def atualizar_alerta_falta(
    alerta_id: int,
    alerta_update: schemas.AlertaFaltasConsecutivasUpdate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Atualizar status de alerta de faltas"""
    db_alerta = (
        db.query(models.AlertaFaltasConsecutivas)
        .filter(models.AlertaFaltasConsecutivas.id == alerta_id)
        .first()
    )

    if not db_alerta:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")

    update_data = alerta_update.model_dump(exclude_unset=True)

    # Registrar alterações no histórico
    if update_data.get("status") and update_data["status"] != db_alerta.status:
        historico_entry = models.AlertaFaltasHistorico(
            alerta_id=alerta_id,
            acao="STATUS_ALTERADO",
            descricao=f"Status alterado de {db_alerta.status} para {update_data['status']} por {current_user.nome}",
            usuario_id=current_user.id,
        )
        db.add(historico_entry)

        # Auto-set data_resolucao se status for RESOLVIDO
        if update_data["status"] == "RESOLVIDO" and not db_alerta.data_resolucao:
            update_data["data_resolucao"] = date.today()
            update_data["resolvido_por"] = current_user.id

            # Adicionar entrada no histórico de resolução
            historico_resolucao = models.AlertaFaltasHistorico(
                alerta_id=alerta_id,
                acao="ALERTA_RESOLVIDO",
                descricao=f"Alerta resolvido por {current_user.nome}",
                usuario_id=current_user.id,
            )
            db.add(historico_resolucao)

    if (
        update_data.get("responsavel_id")
        and update_data["responsavel_id"] != db_alerta.responsavel_id
    ):
        usuario_resp = (
            db.query(models.Usuario)
            .filter(models.Usuario.id == update_data["responsavel_id"])
            .first()
        )
        historico_entry = models.AlertaFaltasHistorico(
            alerta_id=alerta_id,
            acao="RESPONSAVEL_ATRIBUIDO",
            descricao=f"Responsável alterado para {usuario_resp.nome if usuario_resp else 'N/A'} por {current_user.nome}",
            usuario_id=current_user.id,
        )
        db.add(historico_entry)

    if update_data.get("acoes_tomadas") and update_data["acoes_tomadas"] != db_alerta.acoes_tomadas:
        historico_entry = models.AlertaFaltasHistorico(
            alerta_id=alerta_id,
            acao="OBSERVACAO_ADICIONADA",
            descricao=f"Observação adicionada/atualizada: {update_data['acoes_tomadas'][:100]}...",
            usuario_id=current_user.id,
        )
        db.add(historico_entry)

    for key, value in update_data.items():
        setattr(db_alerta, key, value)

    db.commit()
    db.refresh(db_alerta)

    # Recarregar com relacionamentos
    db_alerta = (
        db.query(models.AlertaFaltasConsecutivas)
        .options(
            joinedload(models.AlertaFaltasConsecutivas.aluno),
            joinedload(models.AlertaFaltasConsecutivas.responsavel),
            joinedload(models.AlertaFaltasConsecutivas.historico).joinedload(
                models.AlertaFaltasHistorico.usuario
            ),
        )
        .filter(models.AlertaFaltasConsecutivas.id == alerta_id)
        .first()
    )

    return db_alerta


@router.post(
    "/alertas-faltas/{alerta_id}/historico", response_model=schemas.AlertaFaltasHistoricoResponse
)
def registrar_historico_alerta(
    alerta_id: int,
    historico_data: dict,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Registrar entrada no histórico de alerta"""
    db_alerta = (
        db.query(models.AlertaFaltasConsecutivas)
        .filter(models.AlertaFaltasConsecutivas.id == alerta_id)
        .first()
    )

    if not db_alerta:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")

    historico_entry = models.AlertaFaltasHistorico(
        alerta_id=alerta_id,
        acao=historico_data.get("acao", "OBSERVACAO_ADICIONADA"),
        descricao=historico_data.get("descricao", ""),
        usuario_id=current_user.id,
    )
    db.add(historico_entry)
    db.commit()
    db.refresh(historico_entry)

    return historico_entry


@router.post("/alertas-faltas/auto-resolver")
def auto_resolver_alertas(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Resolver alertas automaticamente quando frequência do aluno melhora > 80%.
    Pode ser chamado periodicamente ou manualmente.
    """
    alertas_resolvidos = 0

    # Buscar alertas pendentes ou em análise
    alertas_ativos = (
        db.query(models.AlertaFaltasConsecutivas)
        .filter(models.AlertaFaltasConsecutivas.status.in_(["PENDENTE", "EM_ANALISE"]))
        .all()
    )

    for alerta in alertas_ativos:
        # Verificar frequência atual do aluno
        aluno = (
            db.query(models.Aluno).filter(models.Aluno.matricula == alerta.aluno_matricula).first()
        )

        if aluno and aluno.frequencia and float(aluno.frequencia) >= 80:
            alerta.status = "RESOLVIDO"
            alerta.data_resolucao = datetime.now().date()
            alerta.acoes_tomadas = (
                (alerta.acoes_tomadas or "")
                + "\n[Auto-resolvido] Frequência do aluno atingiu "
                + str(aluno.frequencia)
                + "%."
            )

            # Registrar no histórico
            historico = models.AlertaFaltasHistorico(
                alerta_id=alerta.id,
                acao="AUTO_RESOLVIDO",
                descricao=f"Alerta resolvido automaticamente. Frequência do aluno: {aluno.frequencia}%",
                usuario_id=None,  # Sistema
            )
            db.add(historico)
            alertas_resolvidos += 1

    db.commit()

    return {
        "alertas_resolvidos": alertas_resolvidos,
        "mensagem": f"{alertas_resolvidos} alerta(s) resolvido(s) automaticamente",
    }


@router.get("/dashboard/faltas-stats")
def get_dashboard_faltas_stats(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Estatísticas de faltas consecutivas para dashboard"""
    query = db.query(models.AlertaFaltasConsecutivas)

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.AlertaFaltasConsecutivas.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )

    # Contar por status
    pendentes = query.filter(models.AlertaFaltasConsecutivas.status == "PENDENTE").count()

    # Contar por tipo
    alertas_3 = query.filter(models.AlertaFaltasConsecutivas.tipo_alerta == "3_FALTAS").count()
    alertas_5 = query.filter(models.AlertaFaltasConsecutivas.tipo_alerta == "5_FALTAS").count()
    alertas_10 = query.filter(models.AlertaFaltasConsecutivas.tipo_alerta == "10_FALTAS").count()

    # Alunos únicos com alertas
    alunos_com_alertas = query.distinct(models.AlertaFaltasConsecutivas.aluno_matricula).count()

    return {
        "total_alertas_pendentes": pendentes,
        "total_alertas_3_faltas": alertas_3,
        "total_alertas_5_faltas": alertas_5,
        "total_alertas_10_faltas": alertas_10,
        "alunos_com_faltas_consecutivas": alunos_com_alertas,
    }


@router.get("/alertas-faltas/comparativo-mensal")
def get_comparativo_mensal(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Comparativo mensal de alertas.
    Retorna dados dos últimos 6 meses para comparação.
    """

    query = db.query(models.AlertaFaltasConsecutivas)

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.AlertaFaltasConsecutivas.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )

    # Dados dos últimos 6 meses
    hoje = date.today()
    meses_dados = []

    for i in range(5, -1, -1):
        mes_ref = hoje.month - i
        ano_ref = hoje.year
        if mes_ref <= 0:
            mes_ref += 12
            ano_ref -= 1

        total = query.filter(
            extract("month", models.AlertaFaltasConsecutivas.criado_at) == mes_ref,
            extract("year", models.AlertaFaltasConsecutivas.criado_at) == ano_ref,
        ).count()

        pendentes = query.filter(
            extract("month", models.AlertaFaltasConsecutivas.criado_at) == mes_ref,
            extract("year", models.AlertaFaltasConsecutivas.criado_at) == ano_ref,
            models.AlertaFaltasConsecutivas.status.in_(["PENDENTE", "EM_ANALISE"]),
        ).count()

        resolvidos = query.filter(
            extract("month", models.AlertaFaltasConsecutivas.criado_at) == mes_ref,
            extract("year", models.AlertaFaltasConsecutivas.criado_at) == ano_ref,
            models.AlertaFaltasConsecutivas.status == "RESOLVIDO",
        ).count()

        try:
            locale.setlocale(locale.LC_TIME, "pt_BR.UTF-8")
        except Exception:
            pass

        nome_mes = month_name[mes_ref] if mes_ref in range(1, 13) else f"Mês {mes_ref}"
        nome_mes = nome_mes.capitalize()

        meses_dados.append(
            {
                "mes": nome_mes,
                "ano": ano_ref,
                "total": total,
                "pendentes": pendentes,
                "resolvidos": resolvidos,
            }
        )

    # Calcular variação do mês atual vs anterior
    if len(meses_dados) >= 2:
        atual = meses_dados[-1]
        anterior = meses_dados[-2]
        if anterior["total"] > 0:
            variacao = round(((atual["total"] - anterior["total"]) / anterior["total"]) * 100, 1)
        else:
            variacao = 0 if atual["total"] == 0 else 100.0
    else:
        variacao = 0

    return {
        "meses": meses_dados,
        "variacao_percentual": variacao,
        "total_6_meses": sum(m["total"] for m in meses_dados),
    }


@router.get("/alertas-faltas/dashboard-efetividade")
def get_dashboard_efetividade(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Dashboard de efetividade: quantos alertas resultaram em intervenção
    que melhorou a frequência do aluno.
    """
    query = db.query(models.AlertaFaltasConsecutivas)

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.join(models.AlertaFaltasConsecutivas.aluno).filter(
            models.Aluno.curso_id == current_user.curso_id
        )

    # Total de alertas
    total_alertas = query.count()

    # Alertas resolvidos
    resolvidos = query.filter(models.AlertaFaltasConsecutivas.status == "RESOLVIDO").count()

    # Alertas com intervenção associada (verificar por intervenções no período do alerta)
    alertas_com_intervencao = 0
    alertas_melhora_freq = 0

    todos_alertas = query.all()
    for alerta in todos_alertas:
        # Verificar se há intervenção para este aluno no período do alerta
        intervencao = (
            db.query(models.Intervencao)
            .filter(
                models.Intervencao.aluno_id == alerta.aluno_matricula,
                models.Intervencao.data_intervencao >= alerta.data_inicio_faltas,
                models.Intervencao.data_intervencao <= alerta.data_fim_faltas,
            )
            .first()
        )

        if intervencao:
            alertas_com_intervencao += 1

            # Verificar se houve melhora na frequência
            aluno = (
                db.query(models.Aluno)
                .filter(models.Aluno.matricula == alerta.aluno_matricula)
                .first()
            )

            if aluno and aluno.frequencia:
                # Se frequência atual > 75%, consideramos melhora
                if float(aluno.frequencia) >= 75:
                    alertas_melhora_freq += 1

    taxa_intervencao = (
        round((alertas_com_intervencao / total_alertas * 100), 1) if total_alertas > 0 else 0
    )
    taxa_melhora = (
        round((alertas_melhora_freq / alertas_com_intervencao * 100), 1)
        if alertas_com_intervencao > 0
        else 0
    )
    taxa_resolucao = round((resolvidos / total_alertas * 100), 1) if total_alertas > 0 else 0

    return {
        "total_alertas": total_alertas,
        "resolvidos": resolvidos,
        "taxa_resolucao": taxa_resolucao,
        "alertas_com_intervencao": alertas_com_intervencao,
        "taxa_intervencao": taxa_intervencao,
        "alertas_melhora_freq": alertas_melhora_freq,
        "taxa_melhora_freq": taxa_melhora,
    }


@router.get("/alunos/{matricula}/frequencia-mensal")
def get_frequencia_mensal(
    matricula: str,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Calcular frequência mensal automaticamente a partir das faltas diárias.

    Retorna a frequência calculada baseada em:
    - Total de aulas (dias únicos com registro de falta)
    - Faltas justificadas e não justificadas
    - Frequência = ((total - faltas_nao_just) / total) * 100
    """

    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Definir período (padrão: últimos 6 meses)
    hoje = datetime.now()
    if mes and ano:
        data_inicio = date(ano, mes, 1)
        if mes == 12:
            data_fim = date(ano + 1, 1, 1)
        else:
            data_fim = date(ano, mes + 1, 1)
    else:
        # Últimos 6 meses
        data_fim = hoje.date()
        data_inicio = data_fim - timedelta(days=180)

    # Buscar faltas do período
    faltas = (
        db.query(models.RegistroFaltasDiarias)
        .filter(
            models.RegistroFaltasDiarias.aluno_matricula == matricula,
            models.RegistroFaltasDiarias.data >= data_inicio,
            models.RegistroFaltasDiarias.data < data_fim,
        )
        .all()
    )

    if not faltas:
        return {
            "aluno_id": matricula,
            "aluno_nome": aluno.nome,
            "periodo": {"inicio": data_inicio.isoformat(), "fim": data_fim.isoformat()},
            "total_aulas": 0,
            "faltas_justificadas": 0,
            "faltas_nao_justificadas": 0,
            "frequencia": 100.0,
            "disciplinas": [],
        }

    # Calcular estatísticas
    total_aulas_unicas = len(set(f.data for f in faltas))
    faltas_justificadas = sum(1 for f in faltas if f.justificada)
    faltas_nao_justificadas = len(faltas) - faltas_justificadas
    disciplinas = list(set(f.disciplina for f in faltas))

    # Calcular frequência
    # Fórmula: (total_aulas - faltas_nao_justificadas) / total_aulas * 100
    if total_aulas_unicas > 0:
        frequencia = ((total_aulas_unicas - faltas_nao_justificadas) / total_aulas_unicas) * 100
    else:
        frequencia = 100.0

    # Limitar entre 0 e 100
    frequencia = max(0.0, min(100.0, frequencia))

    return {
        "aluno_id": matricula,
        "aluno_nome": aluno.nome,
        "periodo": {"inicio": data_inicio.isoformat(), "fim": data_fim.isoformat()},
        "total_aulas": total_aulas_unicas,
        "faltas_justificadas": faltas_justificadas,
        "faltas_nao_justificadas": faltas_nao_justificadas,
        "frequencia": round(frequencia, 2),
        "disciplinas": disciplinas,
    }
