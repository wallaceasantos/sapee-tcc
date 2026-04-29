from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models, database
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# ============================================
# CONFIGURAÇÕES JWT
# ============================================
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY não configurada no .env")
    
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

print(f"✅ JWT configurado: ALGORITHM={ALGORITHM}, EXPIRE={ACCESS_TOKEN_EXPIRE_MINUTES}min")

# ============================================
# HASH DE SENHAS
# ============================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ============================================
# FUNÇÕES DE HASH
# ============================================

def verificar_senha(senha_plain: str, senha_hash: str) -> bool:
    """Verifica se a senha plain corresponde ao hash"""
    return pwd_context.verify(senha_plain, senha_hash)

def gerar_hash_senha(senha: str) -> str:
    """Gera hash bcrypt para a senha"""
    return pwd_context.hash(senha)

# ============================================
# FUNÇÕES JWT
# ============================================

def criar_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Converter user_id para string (python-jose exige string no 'sub')
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def criar_refresh_token(data: dict) -> str:
    """Cria JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Converter user_id para string
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """Decodifica e valida token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
    except Exception:
        return None

# ============================================
# DEPENDÊNCIAS
# ============================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
) -> models.Usuario:
    """
    Dependência para obter usuário atual do token JWT.
    Uso: current_user: Usuario = Depends(get_current_user)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais não podem ser validadas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Decodificar token
    payload = decode_token(token)
    
    if payload is None:
        raise credentials_exception
    
    # Verificar se é access token
    if payload.get("type") != "access":
        raise credentials_exception
    
    # Extrair user_id (vem como string, converter para int)
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    
    try:
        user_id: int = int(user_id_str)
    except ValueError:
        raise credentials_exception
    
    # Buscar usuário no banco
    user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # Verificar se usuário está ativo
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )
    
    return user

async def get_current_active_user(
    current_user: models.Usuario = Depends(get_current_user)
) -> models.Usuario:
    """Dependência para usuário ativo (extends get_current_user)"""
    return current_user

async def get_current_admin_user(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(database.get_db)
) -> models.Usuario:
    """
    Dependência para usuário ADMIN.
    Uso: admin_user: Usuario = Depends(get_current_admin_user)
    """
    # Verificar se é ADMIN
    if current_user.role.nome != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada. Apenas administradores."
        )
    
    return current_user

# ============================================
# VERIFICAÇÃO DE PERMISSÕES
# ============================================

import json

def verificar_permissao(usuario: models.Usuario, recurso: str, acao: Optional[str] = None) -> bool:
    """
    Verifica se usuário tem permissão para recurso/ação.
    
    Exemplo:
    verificar_permissao(usuario, "alunos", "delete")
    verificar_permissao(usuario, "logs")  # Verifica se tem acesso (boolean)
    """
    if not usuario:
        return False
    
    # ADMIN tem todas as permissões
    if usuario.role.nome == "ADMIN":
        return True
    
    # Parse das permissões (JSON string)
    try:
        permissoes = json.loads(usuario.role.permissoes or "{}")
    except:
        permissoes = {}
    
    # Verificar permissão específica
    if acao:
        recurso_perms = permissoes.get(recurso, [])
        if isinstance(recurso_perms, list):
            return acao in recurso_perms
        return False
    else:
        # Permissão booleana
        return permissoes.get(recurso, False) is True
