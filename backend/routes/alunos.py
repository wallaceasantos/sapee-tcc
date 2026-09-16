import logging
import time
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

import auth
import database
import models
import schemas
from ml_logic_v2 import calcular_risco_evasao

logger = logging.getLogger(__name__)

router = APIRouter()
# ==========================================
# ENDPOINTS - ALUNOS
# ==========================================


@router.get("/alunos/buscar")
def buscar_alunos(
    q: str = "",
    limit: int = 20,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Buscar alunos por nome ou matrícula.
    Retorna dados resumidos + última predição para uso em formulários.
    """

    query = db.query(models.Aluno).options(joinedload(models.Aluno.curso))

    # Filtro por ADMIN vs outros
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)

    # Busca por nome ou matrícula
    if q:
        query = query.filter(
            or_(models.Aluno.nome.ilike(f"%{q}%"), models.Aluno.matricula.like(f"%{q}%"))
        )

    alunos = query.limit(limit).all()

    # Buscar últimas predições
    subq = select(
        models.Predicao.aluno_id,
        models.Predicao.risco_evasao,
        models.Predicao.nivel_risco,
        func.row_number()
        .over(partition_by=models.Predicao.aluno_id, order_by=models.Predicao.data_predicao.desc())
        .label("rn"),
    ).subquery()

    predicoes_map = {}
    predicoes = db.query(subq).filter(subq.c.rn == 1).all()
    for p in predicoes:
        predicoes_map[p.aluno_id] = {
            "risco_evasao": float(p.risco_evasao) if p.risco_evasao else 0,
            "nivel_risco": p.nivel_risco,
        }

    resultado = []
    for a in alunos:
        pred = predicoes_map.get(a.matricula, {"risco_evasao": 0, "nivel_risco": "BAIXO"})
        resultado.append(
            {
                "matricula": a.matricula,
                "nome": a.nome,
                "curso": a.curso.nome if a.curso else "N/A",
                "periodo": a.periodo,
                "media_geral": float(a.media_geral) if a.media_geral else 0,
                "frequencia": float(a.frequencia) if a.frequencia else 0,
                "risco_evasao": pred["risco_evasao"],
                "nivel_risco": (
                    pred["nivel_risco"].value
                    if hasattr(pred["nivel_risco"], "value")
                    else pred["nivel_risco"]
                ),
                "nome_responsavel_1": a.nome_responsavel_1,
                "telefone_responsavel_1": a.telefone_responsavel_1,
                "email_responsavel_1": a.email_responsavel_1,
                "nome_responsavel_2": a.nome_responsavel_2,
                "telefone_responsavel_2": a.telefone_responsavel_2,
            }
        )

    return resultado


@router.get("/alunos/em-risco")
def alunos_em_risco(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Lista alunos com risco ALTO/MUITO_ALTO que NÃO possuem intervenção ativa.
    Útil para identificar quem precisa de atenção imediata.
    """

    # 1. Buscar alunos com risco ALTO ou MUITO_ALTO
    subq_pred = select(
        models.Predicao.aluno_id,
        models.Predicao.risco_evasao,
        models.Predicao.nivel_risco,
        func.row_number()
        .over(partition_by=models.Predicao.aluno_id, order_by=models.Predicao.data_predicao.desc())
        .label("rn"),
    ).subquery()

    alunos_risco = (
        db.query(subq_pred)
        .filter(subq_pred.c.nivel_risco.in_(["ALTO", "MUITO_ALTO"]), subq_pred.c.rn == 1)
        .all()
    )

    if not alunos_risco:
        return {"alunos": [], "total": 0}

    matriculas_risco = [a.aluno_id for a in alunos_risco]

    # 2. Buscar intervenções ativas para esses alunos
    data_limite = datetime.now() - timedelta(days=30)
    intervencoes_ativas = (
        db.query(models.Intervencao.aluno_id)
        .filter(
            models.Intervencao.aluno_id.in_(matriculas_risco),
            models.Intervencao.status.in_(["PENDENTE", "EM_ANDAMENTO"]),
            models.Intervencao.data_intervencao >= data_limite,
        )
        .distinct()
        .all()
    )

    matriculas_com_intervencao = set(i.aluno_id for i in intervencoes_ativas)
    matriculas_sem_intervencao = [
        m for m in matriculas_risco if m not in matriculas_com_intervencao
    ]

    if not matriculas_sem_intervencao:
        return {"alunos": [], "total": 0}

    # 3. Buscar dados completos dos alunos sem intervenção
    query = (
        db.query(models.Aluno)
        .options(joinedload(models.Aluno.curso))
        .filter(models.Aluno.matricula.in_(matriculas_sem_intervencao))
    )

    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)

    alunos = query.all()

    # Montar mapa de predições
    predicoes_map = {}
    for p in alunos_risco:
        predicoes_map[p.aluno_id] = {
            "risco_evasao": float(p.risco_evasao) if p.risco_evasao else 0,
            "nivel_risco": p.nivel_risco,
        }

    resultado = []
    for a in alunos:
        pred = predicoes_map.get(a.matricula, {"risco_evasao": 0, "nivel_risco": "ALTO"})
        resultado.append(
            {
                "matricula": a.matricula,
                "nome": a.nome,
                "curso": a.curso.nome if a.curso else "N/A",
                "periodo": a.periodo,
                "turno": a.turno,
                "media_geral": float(a.media_geral) if a.media_geral else 0,
                "frequencia": float(a.frequencia) if a.frequencia else 0,
                "risco_evasao": pred["risco_evasao"],
                "nivel_risco": (
                    pred["nivel_risco"]
                    if isinstance(pred["nivel_risco"], str)
                    else pred["nivel_risco"].value
                ),
                "motivo_risco": _get_motivo_risco(a, pred["risco_evasao"]),
                # Dados socioeconômicos para contexto social
                "trabalha": a.trabalha,
                "carga_horaria_trabalho": a.carga_horaria_trabalho,
                "renda_familiar": float(a.renda_familiar) if a.renda_familiar else None,
                "tempo_deslocamento": a.tempo_deslocamento,
                "dificuldade_acesso": a.dificuldade_acesso,
                "possui_computador": a.possui_computador,
                "possui_internet": a.possui_internet,
                "beneficiario_bolsa_familia": a.beneficiario_bolsa_familia,
                # Dados do responsável para contato
                "nome_responsavel_1": a.nome_responsavel_1,
                "parentesco_responsavel_1": a.parentesco_responsavel_1,
                "telefone_responsavel_1": a.telefone_responsavel_1,
            }
        )

    return {"alunos": resultado, "total": len(resultado)}


def _formatar_contexto_social(a):
    """Gera resumo do contexto social para exibição"""
    linhas = []
    if a.get("trabalha"):
        linhas.append(f"👷 {a.get('carga_horaria_trabalho', '?')}h/sem")
    if a.get("renda_familiar"):
        linhas.append(f"💰 R${a['renda_familiar']:.0f}")
    if a.get("tempo_deslocamento") and a["tempo_deslocamento"] > 60:
        linhas.append(f"🚌 {a['tempo_deslocamento']}min")
    if a.get("dificuldade_acesso") in ["DIFICIL", "MUITO_DIFICIL"]:
        linhas.append(
            f"🚧 Acesso {' difícil' if a['dificuldade_acesso'] == 'DIFICIL' else ' mto difícil'}"
        )
    if not a.get("possui_computador"):
        linhas.append("💻 Sem PC")
    if not a.get("possui_internet"):
        linhas.append("🌐 Sem internet")
    if a.get("beneficiario_bolsa_familia"):
        linhas.append("🏛️ Bolsa Família")
    return " | ".join(linhas) if linhas else None


@router.get("/alunos/monitoramento")
def alunos_monitoramento(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Lista alunos com risco MEDIO para acompanhamento preventivo.
    Útil para identificar alunos que podem piorar se não houver atenção.
    """

    # 1. Buscar alunos com risco MEDIO
    subq_pred = select(
        models.Predicao.aluno_id,
        models.Predicao.risco_evasao,
        models.Predicao.nivel_risco,
        func.row_number()
        .over(partition_by=models.Predicao.aluno_id, order_by=models.Predicao.data_predicao.desc())
        .label("rn"),
    ).subquery()

    alunos_medio = (
        db.query(subq_pred).filter(subq_pred.c.nivel_risco == "MEDIO", subq_pred.c.rn == 1).all()
    )

    if not alunos_medio:
        return {"alunos": [], "total": 0}

    matriculas_medio = [a.aluno_id for a in alunos_medio]

    # 2. Buscar dados completos dos alunos
    query = (
        db.query(models.Aluno)
        .options(joinedload(models.Aluno.curso))
        .filter(models.Aluno.matricula.in_(matriculas_medio))
    )

    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)

    alunos = query.all()

    # Montar mapa de predições
    predicoes_map = {}
    for p in alunos_medio:
        predicoes_map[p.aluno_id] = {
            "risco_evasao": float(p.risco_evasao) if p.risco_evasao else 0,
            "nivel_risco": p.nivel_risco,
        }

    resultado = []
    for a in alunos:
        pred = predicoes_map.get(a.matricula, {"risco_evasao": 0, "nivel_risco": "MEDIO"})
        resultado.append(
            {
                "matricula": a.matricula,
                "nome": a.nome,
                "curso": a.curso.nome if a.curso else "N/A",
                "periodo": a.periodo,
                "turno": a.turno,
                "media_geral": float(a.media_geral) if a.media_geral else 0,
                "frequencia": float(a.frequencia) if a.frequencia else 0,
                "risco_evasao": pred["risco_evasao"],
                "nivel_risco": (
                    pred["nivel_risco"]
                    if isinstance(pred["nivel_risco"], str)
                    else pred["nivel_risco"].value
                ),
                "motivo_risco": _get_motivo_risco(a, pred["risco_evasao"]),
                # Dados socioeconômicos para contexto social
                "trabalha": a.trabalha,
                "carga_horaria_trabalho": a.carga_horaria_trabalho,
                "renda_familiar": float(a.renda_familiar) if a.renda_familiar else None,
                "tempo_deslocamento": a.tempo_deslocamento,
                "dificuldade_acesso": a.dificuldade_acesso,
                "possui_computador": a.possui_computador,
                "possui_internet": a.possui_internet,
                "beneficiario_bolsa_familia": a.beneficiario_bolsa_familia,
            }
        )

    return {"alunos": resultado, "total": len(resultado)}


def _get_motivo_risco(aluno, score):
    """Gera motivo simplificado do risco"""
    motivos = []
    if aluno.frequencia and float(aluno.frequencia) < 75:
        motivos.append(f"Freq {aluno.frequencia}%")
    if aluno.media_geral and float(aluno.media_geral) < 6:
        motivos.append(f"Media {aluno.media_geral}")
    if aluno.historico_reprovas and aluno.historico_reprovas > 1:
        motivos.append(f"{aluno.historico_reprovas} repr")
    if aluno.trabalha:
        motivos.append("Trabalha")
    return ", ".join(motivos) if motivos else "Score alto"


@router.get("/alunos", response_model=List[schemas.AlunoComPredicao])
def list_alunos(
    skip: int = 0,
    limit: int = 100,
    curso_id: Optional[int] = None,
    nivel_risco: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Listar alunos com filtros opcionais (OTIMIZADO - Sem N+1 query)

    Filtros disponíveis:
    - skip: Paginação (offset)
    - limit: Quantidade máxima de registros
    - curso_id: Filtrar por curso específico
    - nivel_risco: Filtrar por nível de risco (BAIXO, MEDIO, ALTO)

    Para COORDENADOR/PEDAGOGO, filtra automaticamente pelo curso do usuário.
    """

    # Usar joinedload para carregar curso junto (evita N+1 para cursos)
    query = db.query(models.Aluno).options(joinedload(models.Aluno.curso))

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.Aluno.curso_id == current_user.curso_id)

    # Filtro adicional por curso
    if curso_id:
        query = query.filter(models.Aluno.curso_id == curso_id)

    # Filtro por nível de risco (usa subquery para pegar última predição)
    if nivel_risco:
        subq = select(
            models.Predicao.aluno_id,
            models.Predicao.nivel_risco,
            func.row_number()
            .over(
                partition_by=models.Predicao.aluno_id, order_by=models.Predicao.data_predicao.desc()
            )
            .label("rn"),
        ).subquery()

        alunos_com_risco = db.query(subq.c.aluno_id).filter(
            subq.c.nivel_risco == nivel_risco.upper(), subq.c.rn == 1
        )

        query = query.filter(models.Aluno.matricula.in_(alunos_com_risco))

    alunos = query.offset(skip).limit(limit).all()

    # ============================================
    # OTIMIZAÇÃO: Buscar todas as últimas predições em UMA query
    # ============================================
    # Usar window function para pegar última predição de cada aluno
    subq_pred = (
        select(
            models.Predicao.aluno_id,
            models.Predicao.id,
            models.Predicao.risco_evasao,
            models.Predicao.nivel_risco,
            models.Predicao.fatores_principais,
            models.Predicao.modelo_ml_versao,
            models.Predicao.data_predicao,
            func.row_number()
            .over(
                partition_by=models.Predicao.aluno_id, order_by=models.Predicao.data_predicao.desc()
            )
            .label("rn"),
        )
        .filter(models.Predicao.aluno_id.in_([a.matricula for a in alunos]))
        .subquery()
    )

    # Pegar apenas as últimas predições (rn = 1)
    ultimas_predicoes = (
        db.query(
            subq_pred.c.aluno_id,
            subq_pred.c.id,
            subq_pred.c.risco_evasao,
            subq_pred.c.nivel_risco,
            subq_pred.c.fatores_principais,
            subq_pred.c.modelo_ml_versao,
            subq_pred.c.data_predicao,
        )
        .filter(subq_pred.c.rn == 1)
        .all()
    )

    # Criar dicionário para acesso rápido
    predicoes_dict = {p.aluno_id: p for p in ultimas_predicoes}

    # ============================================
    # Serializar alunos com predições
    # ============================================
    alunos_com_predicao = []
    for aluno in alunos:
        predicao = predicoes_dict.get(aluno.matricula)

        aluno_dict = {
            "matricula": aluno.matricula,
            "nome": aluno.nome,
            "email": aluno.email,
            "telefone": aluno.telefone,
            "data_nascimento": aluno.data_nascimento,
            "idade": aluno.idade,
            "sexo": aluno.sexo,
            "curso_id": aluno.curso_id,
            "periodo": aluno.periodo,
            "turno": aluno.turno,
            "media_geral": aluno.media_geral,
            "frequencia": aluno.frequencia,
            "historico_reprovas": aluno.historico_reprovas,
            "coeficiente_rendimento": aluno.coeficiente_rendimento,
            "ano_ingresso": aluno.ano_ingresso,
            "cidade": aluno.cidade,
            "cep": aluno.cep,
            "logradouro": aluno.logradouro,
            "numero": aluno.numero,
            "complemento": aluno.complemento,
            "bairro": aluno.bairro,
            "zona_residencial": aluno.zona_residencial,
            "renda_familiar": aluno.renda_familiar,
            "renda_per_capita": aluno.renda_per_capita,
            "possui_auxilio": aluno.possui_auxilio,
            "tipo_auxilio": aluno.tipo_auxilio,
            "trabalha": aluno.trabalha,
            "carga_horaria_trabalho": aluno.carga_horaria_trabalho,
            "tempo_deslocamento": aluno.tempo_deslocamento,
            "custo_transporte_diario": aluno.custo_transporte_diario,
            "dificuldade_acesso": aluno.dificuldade_acesso,
            "transporte_utilizado": aluno.transporte_utilizado,
            "usa_transporte_alternativo": aluno.usa_transporte_alternativo,
            "possui_computador": aluno.possui_computador,
            "possui_internet": aluno.possui_internet,
            "beneficiario_bolsa_familia": aluno.beneficiario_bolsa_familia,
            "primeiro_geracao_universidade": aluno.primeiro_geracao_universidade,
            "nome_responsavel_1": aluno.nome_responsavel_1,
            "parentesco_responsavel_1": aluno.parentesco_responsavel_1,
            "telefone_responsavel_1": aluno.telefone_responsavel_1,
            "email_responsavel_1": aluno.email_responsavel_1,
            "nome_responsavel_2": aluno.nome_responsavel_2,
            "parentesco_responsavel_2": aluno.parentesco_responsavel_2,
            "telefone_responsavel_2": aluno.telefone_responsavel_2,
            "questionario_respondido": aluno.questionario_respondido,
            "data_ultimo_questionario": aluno.data_ultimo_questionario,
            "curso": aluno.curso,
            "predicao_atual": (
                {
                    "id": predicao.id,
                    "aluno_id": predicao.aluno_id,  # ✅ CAMPO FALTANTE!
                    "risco_evasao": float(predicao.risco_evasao) if predicao else 0,
                    "nivel_risco": predicao.nivel_risco if predicao else None,
                    "fatores_principais": predicao.fatores_principais if predicao else None,
                    "modelo_ml_versao": predicao.modelo_ml_versao if predicao else "1.0.0",
                    "data_predicao": predicao.data_predicao if predicao else None,
                }
                if predicao
                else None
            ),
        }
        alunos_com_predicao.append(aluno_dict)

    return alunos_com_predicao


@router.post("/alunos", response_model=schemas.AlunoResponse)
def create_aluno(
    aluno: schemas.AlunoCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Criar novo aluno"""

    try:
        # Verificar se matrícula já existe
        existing = db.query(models.Aluno).filter(models.Aluno.matricula == aluno.matricula).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Matrícula já cadastrada"
            )

        # Debug: mostrar dados recebidos
        logger.debug("Criando aluno: %s - %s", aluno.matricula, aluno.nome)
        logger.debug("Frequência: %s", aluno.frequencia)

        # Criar aluno
        db_aluno = models.Aluno(**aluno.model_dump())

        db.add(db_aluno)
        db.commit()
        db.refresh(db_aluno)

        # ============================================
        # NOVO: Criar frequência mensal automaticamente
        # ============================================
        if aluno.frequencia and aluno.frequencia > 0:
            hoje = datetime.now()

            # Verificar se já existe frequência para este mês
            freq_existente = (
                db.query(models.FrequenciaMensal)
                .filter(
                    models.FrequenciaMensal.aluno_id == db_aluno.matricula,
                    models.FrequenciaMensal.mes == hoje.month,
                    models.FrequenciaMensal.ano == hoje.year,
                )
                .first()
            )

            if not freq_existente:
                frequencia_mensal = models.FrequenciaMensal(
                    aluno_id=db_aluno.matricula,
                    mes=hoje.month,
                    ano=hoje.year,
                    frequencia=aluno.frequencia,
                    total_aulas_mes=20,  # Padrão
                    faltas_justificadas=0,
                    faltas_nao_justificadas=0,
                    observacoes="Frequência inicial do cadastro",
                )
                db.add(frequencia_mensal)
                db.commit()
                logger.info(
                    "Frequência mensal criada: %s/%s = %s%%", hoje.month, hoje.year, aluno.frequencia
                )
            else:
                logger.debug("Frequência já existe para %s/%s", hoje.month, hoje.year)

        # ============================================
        # GERAR PREDIÇÃO AUTOMATICAMENTE
        # ============================================
        try:

            # Aguardar 100ms para garantir commit do aluno
            time.sleep(0.1)

            # Recarregar aluno do banco para garantir dados completos
            db.refresh(db_aluno)

            # Calcular risco com versao v2 melhorada
            resultado = calcular_risco_evasao(db_aluno, db)

            # Criar predição
            predicao = models.Predicao(
                aluno_id=db_aluno.matricula,
                risco_evasao=resultado["risco_evasao"],
                nivel_risco=resultado["nivel_risco"],
                fatores_principais=resultado["fatores_principais"],
                modelo_ml_versao="2.0.0-fallback",
            )
            db.add(predicao)
            db.commit()

            logger.info("Predição gerada para %s:", db_aluno.nome)
            logger.info("   Score: %s", resultado['risco_evasao'])
            logger.info("   Nível: %s", resultado['nivel_risco'])
            logger.info("   Fatores: %s...", resultado['fatores_principais'][:50])

        except Exception as e:
            logger.warning("Erro ao gerar predição: %s: %s", type(e).__name__, e)
            # NÃO faz rollback do aluno, apenas loga o erro
            # Predição pode ser gerada depois manualmente

        return db_aluno

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao criar aluno: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar aluno: {str(e)}",
        )


@router.get("/alunos/{matricula}", response_model=schemas.AlunoResponse)
def get_aluno(
    matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Obter aluno por matrícula COM PREDIÇÃO ATUAL"""

    # Buscar aluno
    aluno = (
        db.query(models.Aluno)
        .options(joinedload(models.Aluno.curso))
        .filter(models.Aluno.matricula == matricula)
        .first()
    )

    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    # Converter para dict e adicionar predicao_atual

    # Calcular idade automaticamente se estiver vazia
    idade_final = aluno.idade
    if not idade_final and aluno.data_nascimento:
        hoje = date.today()
        # Se for objeto datetime.date
        if hasattr(aluno.data_nascimento, "year"):
            idade_final = (
                hoje.year
                - aluno.data_nascimento.year
                - (
                    (hoje.month, hoje.day)
                    < (aluno.data_nascimento.month, aluno.data_nascimento.day)
                )
            )
        # Se for string (fallback)
        elif isinstance(aluno.data_nascimento, str):
            try:
                nasc = datetime.strptime(aluno.data_nascimento, "%Y-%m-%d").date()
                idade_final = (
                    hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
                )
            except (ValueError, TypeError):
                pass

    aluno_dict = {
        "matricula": aluno.matricula,
        "nome": aluno.nome,
        "email": aluno.email,
        "telefone": aluno.telefone,
        "data_nascimento": aluno.data_nascimento,
        "idade": idade_final,
        "sexo": aluno.sexo,
        "curso_id": aluno.curso_id,
        "curso": aluno.curso,
        "periodo": aluno.periodo,
        "turno": aluno.turno,
        "media_geral": aluno.media_geral,
        "frequencia": aluno.frequencia,
        "historico_reprovas": aluno.historico_reprovas,
        "coeficiente_rendimento": aluno.coeficiente_rendimento,
        "ano_ingresso": aluno.ano_ingresso,
        "cidade": aluno.cidade,
        "cep": aluno.cep,
        "logradouro": aluno.logradouro,
        "numero": aluno.numero,
        "complemento": aluno.complemento,
        "bairro": aluno.bairro,
        "zona_residencial": aluno.zona_residencial,
        "renda_familiar": aluno.renda_familiar,
        "renda_per_capita": aluno.renda_per_capita,
        "possui_auxilio": aluno.possui_auxilio,
        "tipo_auxilio": aluno.tipo_auxilio,
        "trabalha": aluno.trabalha,
        "carga_horaria_trabalho": aluno.carga_horaria_trabalho,
        "tempo_deslocamento": aluno.tempo_deslocamento,
        "custo_transporte_diario": aluno.custo_transporte_diario,
        "dificuldade_acesso": aluno.dificuldade_acesso,
        "transporte_utilizado": aluno.transporte_utilizado,
        "usa_transporte_alternativo": aluno.usa_transporte_alternativo,
        "possui_computador": aluno.possui_computador,
        "possui_internet": aluno.possui_internet,
        "beneficiario_bolsa_familia": aluno.beneficiario_bolsa_familia,
        "primeiro_geracao_universidade": aluno.primeiro_geracao_universidade,
        "nome_responsavel_1": aluno.nome_responsavel_1,
        "parentesco_responsavel_1": aluno.parentesco_responsavel_1,
        "telefone_responsavel_1": aluno.telefone_responsavel_1,
        "email_responsavel_1": aluno.email_responsavel_1,
        "nome_responsavel_2": aluno.nome_responsavel_2,
        "parentesco_responsavel_2": aluno.parentesco_responsavel_2,
        "telefone_responsavel_2": aluno.telefone_responsavel_2,
        "questionario_respondido": aluno.questionario_respondido,
        "data_ultimo_questionario": aluno.data_ultimo_questionario,
    }

    # Pegar última predição (BUSCAR DIRETAMENTE DO BANCO)
    ultima_predicao = (
        db.query(models.Predicao)
        .filter(models.Predicao.aluno_id == matricula)
        .order_by(models.Predicao.data_predicao.desc())
        .first()
    )

    if ultima_predicao:
        aluno_dict["predicao_atual"] = {
            "id": ultima_predicao.id,
            "risco_evasao": float(ultima_predicao.risco_evasao),
            "nivel_risco": ultima_predicao.nivel_risco,
            "fatores_principais": ultima_predicao.fatores_principais,
            "modelo_ml_versao": ultima_predicao.modelo_ml_versao,
            "data_predicao": (
                ultima_predicao.data_predicao.isoformat() if ultima_predicao.data_predicao else None
            ),
            "aluno_id": ultima_predicao.aluno_id,
        }

    return aluno_dict


@router.put("/alunos/{matricula}", response_model=schemas.AlunoResponse)
def update_aluno(
    matricula: str,
    aluno_update: schemas.AlunoUpdate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Atualizar aluno e recalcular predição"""
    db_aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()

    if not db_aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    # Atualizar campos
    update_data = aluno_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_aluno, key, value)

    db.commit()
    db.refresh(db_aluno)

    # ============================================
    # ATUALIZAR PREDIÇÃO AUTOMATICAMENTE
    # ============================================
    try:
        # Deletar predição antiga
        db.query(models.Predicao).filter(models.Predicao.aluno_id == matricula).delete()

        # Gerar nova predição
        resultado = calcular_risco_evasao(db_aluno, db)

        predicao = models.Predicao(
            aluno_id=db_aluno.matricula,
            risco_evasao=resultado["risco_evasao"],
            nivel_risco=resultado["nivel_risco"],
            fatores_principais=resultado["fatores_principais"],
            modelo_ml_versao="1.0.0",
        )
        db.add(predicao)
        db.commit()

        logger.info("Predição atualizada para %s: %s", db_aluno.nome, resultado['nivel_risco'])

    except Exception as e:
        logger.warning("Erro ao atualizar predição: %s", e)
        db.rollback()

    return db_aluno


@router.delete("/alunos/{matricula}")
def delete_aluno(
    matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Excluir aluno (APENAS ADMIN)"""
    db_aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()

    if not db_aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    db.delete(db_aluno)
    db.commit()

    return {"message": "Aluno excluído com sucesso"}
