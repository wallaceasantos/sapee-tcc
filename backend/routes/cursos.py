from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas

router = APIRouter()
# ============================================
# ENDPOINTS - CURSOS
# ============================================


@router.get("/cursos", response_model=List[schemas.Curso])
def list_cursos(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Listar todos os cursos"""
    cursos = db.query(models.Curso).order_by(models.Curso.nome).all()
    return cursos


@router.get("/cursos/{curso_id}", response_model=schemas.Curso)
def get_curso(
    curso_id: int,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Buscar curso por ID"""
    curso = db.query(models.Curso).filter(models.Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso não encontrado")
    return curso


@router.post("/cursos", response_model=schemas.Curso, status_code=status.HTTP_201_CREATED)
def criar_curso(
    curso_data: schemas.CursoCreate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Criar novo curso (apenas admin)"""
    # Verificar se já existe curso com o mesmo nome
    existente = db.query(models.Curso).filter(models.Curso.nome == curso_data.nome).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um curso com o nome '{curso_data.nome}'",
        )
    curso = models.Curso(**curso_data.model_dump())
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return curso


@router.put("/cursos/{curso_id}", response_model=schemas.Curso)
def atualizar_curso(
    curso_id: int,
    curso_data: schemas.CursoCreate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Atualizar curso existente (apenas admin)"""
    curso = db.query(models.Curso).filter(models.Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso não encontrado")

    # Verificar conflito de nome com outro curso
    conflito = (
        db.query(models.Curso)
        .filter(models.Curso.nome == curso_data.nome, models.Curso.id != curso_id)
        .first()
    )
    if conflito:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe outro curso com o nome '{curso_data.nome}'",
        )

    curso.nome = curso_data.nome
    curso.modalidade = curso_data.modalidade.value if hasattr(curso_data.modalidade, 'value') else curso_data.modalidade
    db.commit()
    db.refresh(curso)
    return curso


@router.delete("/cursos/{curso_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_curso(
    curso_id: int,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Remover curso (apenas admin)"""
    curso = db.query(models.Curso).filter(models.Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso não encontrado")

    # Verificar se há alunos vinculados
    alunos_vinculados = db.query(models.Aluno).filter(models.Aluno.curso_id == curso_id).count()
    if alunos_vinculados > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível remover: existem {alunos_vinculados} alunos vinculados a este curso",
        )

    db.delete(curso)
    db.commit()
    return None
