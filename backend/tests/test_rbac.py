"""
Testes de controle de acesso (RBAC) e de rate limiting.

Verificam que:
- Endpoints administrativos (ex.: configurações) exigem perfil ADMIN;
- Endpoints de escrita exigem os perfis corretos;
- Endpoints de leitura continuam acessíveis a usuários autenticados;
- O rate limit não pode ser burlado forjando X-Forwarded-For.
"""

import pytest

import models
from auth import criar_access_token, gerar_hash_senha
from limiter import _get_client_ip


@pytest.fixture
def diretor_user(db_session):
    """Cria um usuário com perfil DIRETOR (não-admin)."""
    role = db_session.query(models.Role).filter(models.Role.nome == "DIRETOR").first()
    if not role:
        role = models.Role(nome="DIRETOR", descricao="Diretor (consulta)")
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)

    user = db_session.query(models.Usuario).filter(models.Usuario.email == "diretor@teste.com").first()
    if not user:
        user = models.Usuario(
            nome="Diretor Teste",
            email="diretor@teste.com",
            senha=gerar_hash_senha("senha123"),
            role_id=role.id,
            ativo=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def diretor_headers(diretor_user):
    token = criar_access_token(
        data={"sub": diretor_user.id, "email": diretor_user.email, "role": "DIRETOR"}
    )
    return {"Authorization": f"Bearer {token}"}


# ============================================================
# Configurações do sistema: somente ADMIN
# ============================================================


def test_configuracoes_leitura_negada_para_nao_admin(client, diretor_headers):
    response = client.get("/configuracoes", headers=diretor_headers)
    assert response.status_code == 403


def test_configuracoes_escrita_negada_para_nao_admin(client, diretor_headers):
    response = client.put("/configuracoes/qualquer_chave", json={"valor": "x"}, headers=diretor_headers)
    assert response.status_code == 403


def test_configuracoes_permitida_para_admin(client, auth_headers):
    response = client.get("/configuracoes", headers=auth_headers)
    assert response.status_code == 200


# ============================================================
# Escrita de módulos sensíveis: perfis restritos
# ============================================================


def test_excluir_disciplina_negado_para_diretor(client, diretor_headers):
    response = client.delete("/disciplinas/999999", headers=diretor_headers)
    assert response.status_code == 403


def test_excluir_disciplina_autorizado_para_admin(client, auth_headers):
    """Admin passa pela checagem de perfil; o 404 confirma que chegou ao handler."""
    response = client.delete("/disciplinas/999999", headers=auth_headers)
    assert response.status_code == 404


def test_excluir_nota_negado_para_diretor(client, diretor_headers):
    response = client.delete("/alunos/2024001/notas/999999", headers=diretor_headers)
    assert response.status_code == 403


def test_excluir_comunicacao_negado_para_diretor(client, diretor_headers):
    response = client.delete("/comunicacoes/999999", headers=diretor_headers)
    assert response.status_code == 403


def test_criar_egresso_negado_para_diretor(client, diretor_headers):
    response = client.post("/egressos", json={"aluno_matricula": "2024001"}, headers=diretor_headers)
    assert response.status_code == 403


# ============================================================
# Leitura continua acessível a usuários autenticados
# ============================================================


def test_leitura_alunos_permitida_para_diretor(client, diretor_headers, sample_aluno):
    response = client.get("/alunos", headers=diretor_headers)
    assert response.status_code == 200


# ============================================================
# Rate limiting: X-Forwarded-For não confiável
# ============================================================


class _FakeClient:
    host = "203.0.113.9"


class _FakeRequest:
    def __init__(self, headers):
        self.headers = headers
        self.client = _FakeClient()


def test_rate_limit_ignora_forwarded_for_sem_proxy_confiavel(monkeypatch):
    """Sem proxies confiáveis, o IP da conexão é usado (cabeçalho é ignorado)."""
    monkeypatch.setattr("limiter.TRUSTED_PROXIES", set())
    request = _FakeRequest({"X-Forwarded-For": "1.2.3.4", "X-Real-IP": "5.6.7.8"})
    assert _get_client_ip(request) == "203.0.113.9"


def test_rate_limit_usa_forwarded_for_com_proxy_confiavel(monkeypatch):
    """Com o proxy de origem confiável, o IP real do cliente (à direita) é usado."""
    monkeypatch.setattr("limiter.TRUSTED_PROXIES", {"203.0.113.9"})
    request = _FakeRequest({"X-Forwarded-For": "1.2.3.4, 203.0.113.9"})
    assert _get_client_ip(request) == "1.2.3.4"
