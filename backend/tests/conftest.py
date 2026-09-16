"""
Fixtures compartilhadas para testes do backend SAPEE DEWAS.
"""

import os
import sys

import pytest

# Garantir que o backend está no path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import database
import models
from auth import criar_access_token, gerar_hash_senha

# Importar limiter principal para limpar entre testes
from limiter import limiter as app_limiter
from main import app

# Banco de dados em arquivo temporário para testes
# (SQLite :memory: não compartilha conexões entre fixtures)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override da dependência de banco de dados para usar SQLite de teste."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Sobrescrever a dependência get_db do app
app.dependency_overrides[database.get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Cria as tabelas no banco de testes uma vez por sessão de testes."""
    models.Base.metadata.create_all(bind=engine)
    yield
    # Fechar engine antes de tentar remover arquivo no Windows
    engine.dispose()
    models.Base.metadata.drop_all(bind=engine)
    # Remover arquivo de teste
    if os.path.exists("./test_temp.db"):
        try:
            os.remove("./test_temp.db")
        except PermissionError:
            pass  # Pode falhar no Windows se ainda estiver em uso


@pytest.fixture
def db_session():
    """Fornece uma sessão de banco de dados para cada teste."""
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    """Cliente HTTP para testar os endpoints."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def usar_banco_de_teste_em_background(monkeypatch):
    """
    Garante que threads em background (ex.: importação CSV assíncrona) usem o
    banco de teste (SQLite) em vez do banco real, evitando poluição de dados
    e permitindo validar o resultado da importação.
    """
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)


@pytest.fixture(autouse=True)
def clear_rate_limiter_storage():
    """Limpa o storage do rate limiter entre testes."""
    # Limpar todas as chaves do storage em memória
    storage = getattr(app_limiter, '_storage', None)
    if storage and hasattr(storage, 'storage'):
        storage.storage.clear()
    yield


@pytest.fixture
def admin_user(db_session):
    """Cria um usuário ADMIN para autenticação nos testes."""
    # Criar role ADMIN se não existir
    role = db_session.query(models.Role).filter(models.Role.nome == "ADMIN").first()
    if not role:
        role = models.Role(nome="ADMIN", descricao="Administrador do sistema")
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)

    # Reutilizar usuário se já existir
    user = (
        db_session.query(models.Usuario).filter(models.Usuario.email == "admin@teste.com").first()
    )
    if not user:
        user = models.Usuario(
            nome="Admin Teste",
            email="admin@teste.com",
            senha=gerar_hash_senha("senha123"),
            role_id=role.id,
            ativo=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(admin_user):
    """Gera headers de autenticação com token JWT válido."""
    token = criar_access_token(
        data={"sub": admin_user.id, "email": admin_user.email, "role": "ADMIN"}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_aluno(db_session):
    """Cria um aluno de exemplo para testes."""
    # Criar curso se não existir
    curso = db_session.query(models.Curso).filter(models.Curso.nome == "Curso Teste").first()
    if not curso:
        curso = models.Curso(nome="Curso Teste", modalidade="Integrado")
        db_session.add(curso)
        db_session.commit()
        db_session.refresh(curso)

    # Reutilizar aluno se já existir
    aluno = db_session.query(models.Aluno).filter(models.Aluno.matricula == "2024001").first()
    if not aluno:
        aluno = models.Aluno(
            matricula="2024001",
            nome="Aluno Teste",
            email="aluno@teste.com",
            curso_id=curso.id,
            periodo=1,
            turno=models.Turno.MATUTINO,
            media_geral=7.5,
            frequencia=85.0,
            ano_ingresso=2024,
        )
        db_session.add(aluno)
        db_session.commit()
        db_session.refresh(aluno)
    return aluno
