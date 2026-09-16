from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas

router = APIRouter()
# ============================================
# ENDPOINTS DE DISCIPLINAS
# ============================================


@router.post("/disciplinas", response_model=schemas.DisciplinaResponse)
def create_disciplina(
    disciplina: schemas.DisciplinaCreate,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR")),
    db: Session = Depends(database.get_db),
):
    """Criar nova disciplina"""
    try:
        db_disciplina = models.Disciplina(**disciplina.model_dump())
        db.add(db_disciplina)
        db.commit()
        db.refresh(db_disciplina)
        return db_disciplina
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Nome de disciplina já existe.")


@router.get("/disciplinas", response_model=List[schemas.DisciplinaResponse])
def list_disciplinas(
    ativas_only: bool = True,
    current_user: models.Usuario = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db),
):
    """Listar todas as disciplinas"""
    query = db.query(models.Disciplina)
    if ativas_only:
        query = query.filter(models.Disciplina.ativa == True)
    return query.order_by(models.Disciplina.nome).all()


@router.put("/disciplinas/{disciplina_id}", response_model=schemas.DisciplinaResponse)
def update_disciplina(
    disciplina_id: int,
    disciplina_update: schemas.DisciplinaUpdate,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR")),
    db: Session = Depends(database.get_db),
):
    """Atualizar disciplina"""
    db_disciplina = (
        db.query(models.Disciplina).filter(models.Disciplina.id == disciplina_id).first()
    )
    if not db_disciplina:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    update_data = disciplina_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_disciplina, key, value)

    db.commit()
    db.refresh(db_disciplina)
    return db_disciplina


@router.delete("/disciplinas/{disciplina_id}")
def delete_disciplina(
    disciplina_id: int,
    current_user: models.Usuario = Depends(auth.require_roles("COORDENADOR")),
    db: Session = Depends(database.get_db),
):
    """Excluir disciplina"""
    db_disciplina = (
        db.query(models.Disciplina).filter(models.Disciplina.id == disciplina_id).first()
    )
    if not db_disciplina:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    db.delete(db_disciplina)
    db.commit()
    return {"message": "Disciplina excluída com sucesso"}


# ============================================
# DISCIPLINA PROFESSOR - CRUD
# ============================================


@router.post("/disciplinas-professor", response_model=schemas.DisciplinaProfessorResponse)
async def criar_vinculo_professor_disciplina(
    vinculo: schemas.DisciplinaProfessorCreate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Vincular professor a uma disciplina.
    Apenas ADMIN ou COORDENADOR podem fazer isso.
    """
    # Verificar permissão
    if current_user.role.nome not in ["ADMIN", "COORDENADOR"]:
        raise HTTPException(status_code=403, detail="Permissão negada")

    # Verificar se usuário existe e é PROFESSOR
    usuario = db.query(models.Usuario).filter(models.Usuario.id == vinculo.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if usuario.role.nome != "PROFESSOR":
        raise HTTPException(status_code=400, detail="Usuário não é um professor")

    # Verificar se disciplina existe
    disciplina = (
        db.query(models.Disciplina).filter(models.Disciplina.id == vinculo.disciplina_id).first()
    )
    if not disciplina:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    # Verificar duplicata
    existente = (
        db.query(models.DisciplinaProfessor)
        .filter(
            models.DisciplinaProfessor.usuario_id == vinculo.usuario_id,
            models.DisciplinaProfessor.disciplina_id == vinculo.disciplina_id,
        )
        .first()
    )
    if existente:
        raise HTTPException(status_code=400, detail="Professor já está vinculado a esta disciplina")

    # Criar vínculo
    novo_vinculo = models.DisciplinaProfessor(
        usuario_id=vinculo.usuario_id,
        disciplina_id=vinculo.disciplina_id,
        curso_id=vinculo.curso_id or disciplina.curso_id,
    )
    db.add(novo_vinculo)
    db.commit()
    db.refresh(novo_vinculo)

    return novo_vinculo


@router.get("/disciplinas-professor", response_model=List[schemas.DisciplinaProfessorResponse])
async def listar_vinculos_professor_disciplina(
    usuario_id: Optional[int] = None,
    disciplina_id: Optional[int] = None,
    curso_id: Optional[int] = None,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Listar vínculos professor-disciplina.
    Professores veem apenas seus próprios vínculos.
    ADMIN/COORDENADOR veem todos.
    """
    query = db.query(models.DisciplinaProfessor)

    # Filtrar por professor se não for ADMIN/COORDENADOR
    if current_user.role.nome not in ["ADMIN", "COORDENADOR"]:
        query = query.filter(models.DisciplinaProfessor.usuario_id == current_user.id)
    elif usuario_id:
        query = query.filter(models.DisciplinaProfessor.usuario_id == usuario_id)

    if disciplina_id:
        query = query.filter(models.DisciplinaProfessor.disciplina_id == disciplina_id)
    if curso_id:
        query = query.filter(models.DisciplinaProfessor.curso_id == curso_id)

    vinculos = query.all()
    return vinculos


@router.get("/professores/{usuario_id}/disciplinas")
async def listar_disciplinas_do_professor(
    usuario_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Listar todas as disciplinas de um professor.
    """
    # Verificar permissão
    if current_user.role.nome not in ["ADMIN", "COORDENADOR"] and current_user.id != usuario_id:
        raise HTTPException(status_code=403, detail="Permissão negada")

    vinculos = (
        db.query(models.DisciplinaProfessor)
        .filter(models.DisciplinaProfessor.usuario_id == usuario_id)
        .all()
    )

    disciplinas = []
    for vinculo in vinculos:
        disciplina = (
            db.query(models.Disciplina)
            .filter(models.Disciplina.id == vinculo.disciplina_id)
            .first()
        )
        if disciplina:
            disciplinas.append(
                {
                    "id": disciplina.id,
                    "nome": disciplina.nome,
                    "ativa": disciplina.ativa,
                    "curso_id": disciplina.curso_id,
                }
            )

    return disciplinas


@router.delete("/disciplinas-professor/{vinculo_id}")
async def remover_vinculo_professor_disciplina(
    vinculo_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Remover vínculo professor-disciplina.
    Apenas ADMIN ou COORDENADOR.
    """
    if current_user.role.nome not in ["ADMIN", "COORDENADOR"]:
        raise HTTPException(status_code=403, detail="Permissão negada")

    vinculo = (
        db.query(models.DisciplinaProfessor)
        .filter(models.DisciplinaProfessor.id == vinculo_id)
        .first()
    )
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado")

    db.delete(vinculo)
    db.commit()

    return {"message": "Vínculo removido com sucesso"}


@router.get("/minhas-disciplinas")
async def listar_minhas_disciplinas(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """
    Listar disciplinas do professor logado.
    Usado pelo frontend para carregar opções do professor.
    """
    # Verificar se é professor
    if current_user.role.nome != "PROFESSOR":
        raise HTTPException(
            status_code=403, detail="Apenas professores podem acessar este endpoint"
        )

    vinculos = (
        db.query(models.DisciplinaProfessor)
        .filter(models.DisciplinaProfessor.usuario_id == current_user.id)
        .all()
    )

    disciplinas = []
    for vinculo in vinculos:
        disciplina = (
            db.query(models.Disciplina)
            .filter(models.Disciplina.id == vinculo.disciplina_id)
            .first()
        )
        if disciplina:
            disciplinas.append(
                {
                    "id": disciplina.id,
                    "nome": disciplina.nome,
                    "ativa": disciplina.ativa,
                    "curso_id": disciplina.curso_id,
                }
            )

    return disciplinas
