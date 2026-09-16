import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

import auth
import database
import models
import schemas
from limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter()
# ============================================
# ENDPOINTS - AUTENTICAÇÃO
# ============================================


@router.post("/auth/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(
    request: Request, login_data: schemas.LoginRequest, db: Session = Depends(database.get_db)
):
    """
    Login de usuário
    """
    # Buscar usuário
    user = db.query(models.Usuario).filter(models.Usuario.email == login_data.email).first()

    # Verificar usuário e senha
    if not user or not auth.verificar_senha(login_data.senha, user.senha):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar se está ativo
    if not user.ativo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    # Atualizar último acesso
    user.ultimo_acesso = models.func.now()
    db.commit()

    # Criar tokens
    access_token = auth.criar_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role.nome}
    )
    refresh_token = auth.criar_refresh_token(data={"sub": user.id})

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.get("/auth/me", response_model=schemas.UsuarioResponse)
def get_current_user_info(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Obter informações do usuário atual"""

    # Recarregar usuário com role e curso para evitar problemas de serialização
    user = (
        db.query(models.Usuario)
        .options(joinedload(models.Usuario.role), joinedload(models.Usuario.curso))
        .filter(models.Usuario.id == current_user.id)
        .first()
    )

    return user


@router.put("/auth/trocar-senha")
def trocar_senha(
    troca: schemas.TrocaSenhaRequest,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Trocar senha do usuário atual"""
    # Verificar senha atual
    if not auth.verificar_senha(troca.senha_atual, current_user.senha):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta")

    # Verificar se a nova senha é diferente da atual
    if troca.senha_atual == troca.senha_nova:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ser diferente da senha atual",
        )

    # Atualizar senha
    current_user.senha = auth.gerar_hash_senha(troca.senha_nova)
    db.commit()

    return {"message": "Senha alterada com sucesso"}


@router.post("/auth/refresh", response_model=schemas.Token)
@limiter.limit("10/minute")
def refresh_token(
    request: Request,
    refresh_data: schemas.RefreshRequest,
    db: Session = Depends(database.get_db),
):
    payload = auth.decode_token(refresh_data.refresh_token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não é um refresh token",
        )

    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not user or not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário não encontrado ou inativo",
        )

    new_access_token = auth.criar_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role.nome}
    )
    new_refresh_token = auth.criar_refresh_token(data={"sub": user.id})

    logger.info("Token renovado para usuário %s", user.email)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }
