"""
Testes para autenticação e autorização.
"""

from fastapi.testclient import TestClient

import models
from auth import criar_access_token, gerar_hash_senha


def test_login_sucesso(client: TestClient, admin_user):
    """Testa login com credenciais válidas."""
    response = client.post("/auth/login", json={"email": "admin@teste.com", "senha": "senha123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_senha_incorreta(client: TestClient, admin_user):
    """Testa login com senha errada."""
    response = client.post("/auth/login", json={"email": "admin@teste.com", "senha": "senhaerrada"})
    assert response.status_code == 401
    assert "incorretos" in response.json()["detail"]


def test_login_usuario_inativo(client: TestClient, db_session):
    """Testa login com usuário inativo."""
    role = db_session.query(models.Role).filter(models.Role.nome == "ADMIN").first()
    if not role:
        role = models.Role(nome="ADMIN", descricao="Admin")
        db_session.add(role)
        db_session.commit()

    user = models.Usuario(
        nome="Inativo",
        email="inativo@teste.com",
        senha=gerar_hash_senha("senha123"),
        role_id=role.id,
        ativo=False,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post("/auth/login", json={"email": "inativo@teste.com", "senha": "senha123"})
    assert response.status_code == 403
    assert "inativo" in response.json()["detail"]


def test_me_autenticado(client: TestClient, auth_headers):
    """Testa obter dados do usuário logado."""
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@teste.com"
    assert data["nome"] == "Admin Teste"


def test_me_sem_token(client: TestClient):
    """Testa acesso ao /auth/me sem autenticação."""
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_trocar_senha_sucesso(client: TestClient, auth_headers):
    """Testa troca de senha com sucesso."""
    response = client.put(
        "/auth/trocar-senha",
        headers=auth_headers,
        json={"senha_atual": "senha123", "senha_nova": "novaSenha456"},
    )
    assert response.status_code == 200
    assert "sucesso" in response.json()["message"].lower()


def test_trocar_senha_atual_incorreta(client: TestClient, auth_headers):
    """Testa troca de senha com senha atual incorreta."""
    response = client.put(
        "/auth/trocar-senha",
        headers=auth_headers,
        json={"senha_atual": "senhaerrada", "senha_nova": "novaSenha456"},
    )
    assert response.status_code == 400
    assert "incorreta" in response.json()["detail"].lower()


def test_trocar_senha_igual_atual(client: TestClient, db_session):
    """Testa troca de senha onde nova é igual à atual."""
    role = db_session.query(models.Role).filter(models.Role.nome == "ADMIN").first()
    user = models.Usuario(
        nome="Troca",
        email="troca@teste.com",
        senha=gerar_hash_senha("senha123"),
        role_id=role.id,
        ativo=True,
    )
    db_session.add(user)
    db_session.commit()

    token = criar_access_token(data={"sub": user.id, "email": user.email, "role": "ADMIN"})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.put(
        "/auth/trocar-senha",
        headers=headers,
        json={"senha_atual": "senha123", "senha_nova": "senha123"},
    )
    assert response.status_code == 400
    assert "diferente" in response.json()["detail"].lower()


def test_brute_force_protegido(client: TestClient, db_session):
    """Testa que múltiplas tentativas falhas acionam rate limit (429)."""
    role = db_session.query(models.Role).filter(models.Role.nome == "ADMIN").first()
    user = models.Usuario(
        nome="Brute",
        email="brute@teste.com",
        senha=gerar_hash_senha("senha_segura"),
        role_id=role.id,
        ativo=True,
    )
    db_session.add(user)
    db_session.commit()

    # Fazer várias tentativas até acionar o rate limit
    # (pode ser menos de 5 se outros testes já consumiram do mesmo bucket)
    tentativas = 0
    max_tentativas = 10
    while tentativas < max_tentativas:
        response = client.post(
            "/auth/login", json={"email": "brute@teste.com", "senha": f"tentativa{tentativas}"}
        )
        if response.status_code == 429:
            break
        assert response.status_code == 401
        tentativas += 1

    # Deve ter acionado rate limit antes de esgotar todas as tentativas
    assert tentativas < max_tentativas, "Rate limit não foi acionado"

    # Tentativa com senha correta também deve ser bloqueada
    response = client.post(
        "/auth/login", json={"email": "brute@teste.com", "senha": "senha_segura"}
    )
    assert response.status_code == 429  # Too Many Requests
