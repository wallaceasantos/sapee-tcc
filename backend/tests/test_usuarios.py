"""
Testes para o módulo de usuários.
"""


def test_listar_usuarios(client, auth_headers):
    """Listar usuários como ADMIN."""
    response = client.get("/usuarios", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_criar_usuario(client, auth_headers):
    """Criar novo usuário."""
    payload = {
        "nome": "Usuário Teste",
        "email": "usuario.teste@example.com",
        "senha": "senha123",
        "role_id": 1,
        "ativo": True,
    }

    response = client.post("/usuarios", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["nome"] == payload["nome"]
    assert "senha" not in data


def test_criar_usuario_email_duplicado(client, auth_headers):
    """Criar usuário com email duplicado retorna 400."""
    payload = {
        "nome": "Admin Teste",
        "email": "admin@teste.com",
        "senha": "senha123",
        "role_id": 1,
        "ativo": True,
    }

    response = client.post("/usuarios", headers=auth_headers, json=payload)

    assert response.status_code == 400


def test_obter_usuario(client, auth_headers, admin_user):
    """Obter usuário por ID."""
    response = client.get(f"/usuarios/{admin_user.id}", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == admin_user.id


def test_obter_usuario_inexistente(client, auth_headers):
    """Obter usuário inexistente retorna 404."""
    response = client.get("/usuarios/99999", headers=auth_headers)

    assert response.status_code == 404


def test_atualizar_usuario(client, auth_headers):
    """Atualizar nome de usuário criado no teste."""
    payload_criar = {
        "nome": "Usuário Atualizar",
        "email": "usuario.atualizar@example.com",
        "senha": "senha123",
        "role_id": 1,
        "ativo": True,
    }
    criar = client.post("/usuarios", headers=auth_headers, json=payload_criar)
    usuario_id = criar.json()["id"]

    payload_atualizar = {"nome": "Usuário Atualizado"}
    response = client.put(f"/usuarios/{usuario_id}", headers=auth_headers, json=payload_atualizar)

    assert response.status_code == 200
    assert response.json()["nome"] == "Usuário Atualizado"


def test_excluir_usuario(client, auth_headers):
    """Excluir usuário criado no teste."""
    payload = {
        "nome": "Usuário Excluir",
        "email": "usuario.excluir@example.com",
        "senha": "senha123",
        "role_id": 1,
        "ativo": True,
    }
    criar = client.post("/usuarios", headers=auth_headers, json=payload)
    usuario_id = criar.json()["id"]

    response = client.delete(f"/usuarios/{usuario_id}", headers=auth_headers)

    assert response.status_code == 200


def test_nao_pode_excluir_proprio_usuario(client, auth_headers, admin_user):
    """Não permitir excluir o próprio usuário logado."""
    response = client.delete(f"/usuarios/{admin_user.id}", headers=auth_headers)

    assert response.status_code == 400
