import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

import auth
import database
import models
import schemas

router = APIRouter()
# ============================================
# ENDPOINTS - PLANOS DE AÇÃO E METAS
# ============================================

# --- PLANOS DE AÇÃO ---


@router.get("/planos-acao", response_model=List[schemas.PlanosAcaoResponse])
def list_planos_acao(
    curso_id: Optional[int] = None,
    nivel_risco: Optional[str] = None,
    ativo: bool = True,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Listar planos de ação (com filtros)"""
    query = (
        db.query(models.PlanosAcao)
        .options(joinedload(models.PlanosAcao.curso))
        .filter(models.PlanosAcao.ativo == ativo)
    )

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.PlanosAcao.curso_id == current_user.curso_id)

    # Filtros adicionais
    if curso_id:
        query = query.filter(models.PlanosAcao.curso_id == curso_id)
    if nivel_risco:
        query = query.filter(models.PlanosAcao.nivel_risco == nivel_risco)

    return query.all()


@router.get("/planos-acao/{plano_id}", response_model=schemas.PlanosAcaoResponse)
def get_plano_acao(
    plano_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Obter plano de ação por ID"""
    plano = (
        db.query(models.PlanosAcao)
        .options(joinedload(models.PlanosAcao.curso))
        .filter(models.PlanosAcao.id == plano_id)
        .first()
    )

    if not plano:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    return plano


@router.post("/planos-acao", response_model=schemas.PlanosAcaoResponse)
def create_plano_acao(
    plano: schemas.PlanosAcaoCreate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Criar novo plano de ação"""
    # Verificar se já existe plano para este curso e nível
    existing = (
        db.query(models.PlanosAcao)
        .filter(
            models.PlanosAcao.curso_id == plano.curso_id,
            models.PlanosAcao.nivel_risco == plano.nivel_risco,
            models.PlanosAcao.ativo == True,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400, detail="Já existe um plano ativo para este curso e nível de risco"
        )

    db_plano = models.PlanosAcao(**plano.model_dump())
    db.add(db_plano)
    db.commit()
    db.refresh(db_plano)

    return db_plano


@router.put("/planos-acao/{plano_id}", response_model=schemas.PlanosAcaoResponse)
def update_plano_acao(
    plano_id: int,
    plano_update: schemas.PlanosAcaoUpdate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Atualizar plano de ação"""
    db_plano = db.query(models.PlanosAcao).filter(models.PlanosAcao.id == plano_id).first()

    if not db_plano:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    update_data = plano_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_plano, key, value)

    db.commit()
    db.refresh(db_plano)

    return db_plano


@router.delete("/planos-acao/{plano_id}")
def delete_plano_acao(
    plano_id: int,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Excluir (desativar) plano de ação"""
    db_plano = db.query(models.PlanosAcao).filter(models.PlanosAcao.id == plano_id).first()

    if not db_plano:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    db_plano.ativo = False  # Soft delete
    db.commit()

    return {"message": "Plano desativado com sucesso"}


@router.get("/planos-acao/sugestao/{aluno_matricula}")
def get_sugestao_intervencao(
    aluno_matricula: str,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Obter sugestão de intervenção baseada no plano de ação do aluno.

    Analisa o aluno e retorna as ações recomendadas do plano correspondente.
    """
    # Buscar aluno
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == aluno_matricula).first()

    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Buscar última predição
    predicao = (
        db.query(models.Predicao)
        .filter(models.Predicao.aluno_id == aluno_matricula)
        .order_by(models.Predicao.data_predicao.desc())
        .first()
    )

    if not predicao:
        raise HTTPException(status_code=404, detail="Predição não encontrada")

    # Buscar plano de ação para o curso e nível de risco (mais recente)
    plano = (
        db.query(models.PlanosAcao)
        .filter(
            models.PlanosAcao.curso_id == aluno.curso_id,
            models.PlanosAcao.nivel_risco == predicao.nivel_risco,
            models.PlanosAcao.ativo == True,
        )
        .order_by(models.PlanosAcao.id.desc())
        .first()
    )

    if not plano:
        # Buscar plano genérico (se houver)
        plano = (
            db.query(models.PlanosAcao)
            .filter(
                models.PlanosAcao.curso_id.is_(None),  # Plano genérico
                models.PlanosAcao.nivel_risco == predicao.nivel_risco,
                models.PlanosAcao.ativo == True,
            )
            .first()
        )

    # Retornar sugestões
    acoes_sugeridas = []
    if plano:
        acoes_sugeridas = json.loads(plano.acoes_recomendadas) if plano.acoes_recomendadas else []

    return {
        "aluno": {
            "matricula": aluno_matricula,
            "nome": aluno.nome,
            "curso": aluno.curso.nome if aluno.curso else None,
            "nivel_risco": predicao.nivel_risco,
            "risco_evasao": float(predicao.risco_evasao),
        },
        "plano_acao": (
            {
                "id": plano.id if plano else None,
                "meta_frequencia": float(plano.meta_frequencia_minima) if plano else 75.0,
                "meta_media": float(plano.meta_media_minima) if plano else 6.0,
                "prazo_dias": plano.prazo_dias if plano else 30,
            }
            if plano
            else None
        ),
        "acoes_sugeridas": acoes_sugeridas,
        "recomendacoes_gerais": (
            [
                "Acompanhar frequência semanalmente",
                "Verificar necessidade de apoio psicossocial",
                "Oferecer monitoria nas disciplinas com dificuldade",
            ]
            if not acoes_sugeridas
            else []
        ),
    }


# --- METAS SEMESTRAIS ---


@router.get("/metas-semestrais", response_model=List[schemas.MetasSemestraisResponse])
def list_metas_semestrais(
    curso_id: Optional[int] = None,
    semestre: Optional[str] = None,
    status: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Listar metas semestrais (com filtros)"""
    query = db.query(models.MetasSemestrais).options(joinedload(models.MetasSemestrais.curso))

    # Filtrar por curso se não for ADMIN
    if current_user.role.nome != "ADMIN" and current_user.curso_id:
        query = query.filter(models.MetasSemestrais.curso_id == current_user.curso_id)

    # Filtros adicionais
    if curso_id:
        query = query.filter(models.MetasSemestrais.curso_id == curso_id)
    if semestre:
        query = query.filter(models.MetasSemestrais.semestre == semestre)
    if status:
        query = query.filter(models.MetasSemestrais.status == status)

    return query.order_by(models.MetasSemestrais.data_inicio.desc()).all()


@router.post("/metas-semestrais", response_model=schemas.MetasSemestraisResponse)
def create_meta_semestral(
    meta: schemas.MetasSemestraisCreate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Criar nova meta semestral"""
    # Verificar se já existe meta para este curso e semestre
    existing = (
        db.query(models.MetasSemestrais)
        .filter(
            models.MetasSemestrais.curso_id == meta.curso_id,
            models.MetasSemestrais.semestre == meta.semestre,
        )
        .first()
    )

    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma meta para este curso e semestre")

    db_meta = models.MetasSemestrais(**meta.model_dump())
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)

    return db_meta


@router.put("/metas-semestrais/{meta_id}", response_model=schemas.MetasSemestraisResponse)
def update_meta_semestral(
    meta_id: int,
    meta_update: schemas.MetasSemestraisUpdate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Atualizar meta semestral"""
    db_meta = db.query(models.MetasSemestrais).filter(models.MetasSemestrais.id == meta_id).first()

    if not db_meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")

    update_data = meta_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_meta, key, value)

    db.commit()
    db.refresh(db_meta)

    return db_meta


# --- METAS INDIVIDUAIS DE ALUNOS ---


@router.get("/alunos/{matricula}/metas", response_model=List[schemas.AlunoMetaResponse])
def list_metas_aluno(
    matricula: str,
    status: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Listar metas de um aluno"""
    query = (
        db.query(models.AlunoMeta)
        .options(joinedload(models.AlunoMeta.aluno), joinedload(models.AlunoMeta.plano_acao))
        .filter(models.AlunoMeta.aluno_matricula == matricula)
    )

    if status:
        query = query.filter(models.AlunoMeta.status == status)

    return query.order_by(models.AlunoMeta.data_limite.desc()).all()


@router.post("/alunos/{matricula}/metas", response_model=schemas.AlunoMetaResponse)
def create_meta_aluno(
    matricula: str,
    meta: schemas.AlunoMetaCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Criar meta individual para aluno"""
    # Verificar se aluno existe
    aluno = db.query(models.Aluno).filter(models.Aluno.matricula == matricula).first()

    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    db_meta = models.AlunoMeta(**meta.model_dump(exclude={"aluno_matricula"}), aluno_matricula=matricula)
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)

    # Recarregar com relacionamentos
    db_meta = (
        db.query(models.AlunoMeta)
        .options(joinedload(models.AlunoMeta.aluno), joinedload(models.AlunoMeta.plano_acao))
        .filter(models.AlunoMeta.id == db_meta.id)
        .first()
    )

    return db_meta


@router.put("/metas-aluno/{meta_id}", response_model=schemas.AlunoMetaResponse)
def update_meta_aluno(
    meta_id: int,
    meta_update: schemas.AlunoMetaUpdate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Atualizar meta de aluno"""
    db_meta = db.query(models.AlunoMeta).filter(models.AlunoMeta.id == meta_id).first()

    if not db_meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")

    update_data = meta_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_meta, key, value)

    db.commit()
    db.refresh(db_meta)

    return db_meta


@router.get("/dashboard/metas-cumprimento")
def get_metas_cumprimento(
    curso_id: Optional[int] = None,
    semestre: Optional[str] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Dashboard de cumprimento de metas.

    Mostra o percentual de alunos que atingiram as metas por curso.
    """

    # Se não especificar semestre, usa o atual
    if not semestre:
        now = datetime.now()
        semestre_atual = f"{now.year}-1" if now.month <= 6 else f"{now.year}-2"
        semestre = semestre_atual

    # Query base de metas semestrais
    query = db.query(models.MetasSemestrais)

    if curso_id:
        query = query.filter(models.MetasSemestrais.curso_id == curso_id)
    else:
        # Filtrar por curso se não for ADMIN
        if current_user.role.nome != "ADMIN" and current_user.curso_id:
            query = query.filter(models.MetasSemestrais.curso_id == current_user.curso_id)

    query = query.filter(models.MetasSemestrais.semestre == semestre)

    metas = query.all()

    resultados = []
    for meta in metas:
        # Contar alunos com meta atingida neste curso/semestre
        total_alunos = db.query(models.Aluno).filter(models.Aluno.curso_id == meta.curso_id).count()

        alunos_meta_atingida = (
            db.query(models.AlunoMeta)
            .join(models.Aluno, models.AlunoMeta.aluno_matricula == models.Aluno.matricula)
            .filter(models.Aluno.curso_id == meta.curso_id, models.AlunoMeta.status == "ATINGIDA")
            .count()
        )

        percentual = (alunos_meta_atingida / total_alunos * 100) if total_alunos > 0 else 0

        resultados.append(
            {
                "curso": meta.curso.nome,
                "semestre": meta.semestre,
                "meta_frequencia": float(meta.meta_frequencia_geral),
                "meta_media": float(meta.meta_media_geral),
                "total_alunos": total_alunos,
                "alunos_meta_atingida": alunos_meta_atingida,
                "percentual_cumprimento": round(percentual, 1),
                "status_meta": meta.status,
            }
        )

    return {
        "semestre": semestre,
        "resultados": resultados,
        "total_cursos": len(resultados),
        "media_cumprimento": (
            round(sum(r["percentual_cumprimento"] for r in resultados) / len(resultados), 1)
            if resultados
            else 0
        ),
    }
