from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas

router = APIRouter()
# ============================================
# ENDPOINTS - USUÁRIOS (ADMIN)
# ============================================


@router.get("/usuarios", response_model=List[schemas.UsuarioResponse])
def list_usuarios(
    skip: int = 0,
    limit: int = 100,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Listar todos os usuários (APENAS ADMIN)"""
    usuarios = db.query(models.Usuario).offset(skip).limit(limit).all()
    return usuarios


@router.post("/usuarios", response_model=schemas.UsuarioResponse)
def create_usuario(
    usuario: schemas.UsuarioCreate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Criar novo usuário (APENAS ADMIN)"""
    # Verificar se email já existe
    existing = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()

    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")

    # Criar usuário com senha hash
    usuario_data = usuario.model_dump(exclude={"senha"})
    db_usuario = models.Usuario(**usuario_data, senha=auth.gerar_hash_senha(usuario.senha))

    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)

    return db_usuario


@router.get("/usuarios/{usuario_id}", response_model=schemas.UsuarioResponse)
def get_usuario(
    usuario_id: int,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Obter usuário por ID (APENAS ADMIN)"""
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    return usuario


@router.put("/usuarios/{usuario_id}", response_model=schemas.UsuarioResponse)
def update_usuario(
    usuario_id: int,
    usuario_update: schemas.UsuarioUpdate,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Atualizar usuário (APENAS ADMIN)"""
    db_usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()

    if not db_usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    # Atualizar campos
    update_data = usuario_update.model_dump(exclude_unset=True)

    # Hash da senha se foi alterada
    if "senha" in update_data and update_data["senha"]:
        update_data["senha"] = auth.gerar_hash_senha(update_data["senha"])

    for key, value in update_data.items():
        setattr(db_usuario, key, value)

    db.commit()
    db.refresh(db_usuario)

    return db_usuario


@router.delete("/usuarios/{usuario_id}")
def delete_usuario(
    usuario_id: int,
    current_user: models.Usuario = Depends(auth.get_current_admin_user),
    db: Session = Depends(database.get_db),
):
    """Excluir usuário (APENAS ADMIN)"""
    db_usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()

    if not db_usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    # Não permitir excluir a si mesmo
    if db_usuario.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Não pode excluir a si mesmo"
        )

    db.delete(db_usuario)
    db.commit()

    return {"message": "Usuário excluído com sucesso"}
