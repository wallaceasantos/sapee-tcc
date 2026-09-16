"""
Testes para CRUD de alunos.
"""

from fastapi.testclient import TestClient

import models


def test_listar_alunos_vazio(client: TestClient, auth_headers):
    """Testa listagem de alunos quando não há nenhum."""
    response = client.get("/alunos", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_criar_aluno(client: TestClient, auth_headers, db_session):
    """Testa criação de um novo aluno."""
    curso = models.Curso(nome="Informatica", modalidade="Integrado")
    db_session.add(curso)
    db_session.commit()

    response = client.post(
        "/alunos",
        headers=auth_headers,
        json={
            "matricula": "2024001",
            "nome": "João Silva",
            "email": "joao@teste.com",
            "curso_id": curso.id,
            "periodo": 1,
            "turno": "MATUTINO",
            "media_geral": 7.0,
            "frequencia": 90.0,
            "ano_ingresso": 2024,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["matricula"] == "2024001"
    assert data["nome"] == "João Silva"


def test_buscar_aluno(client: TestClient, auth_headers, sample_aluno):
    """Testa busca de aluno por matrícula."""
    response = client.get(f"/alunos/{sample_aluno.matricula}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["matricula"] == sample_aluno.matricula
    assert data["nome"] == sample_aluno.nome


def test_atualizar_aluno(client: TestClient, auth_headers, sample_aluno):
    """Testa atualização de dados do aluno."""
    response = client.put(
        f"/alunos/{sample_aluno.matricula}",
        headers=auth_headers,
        json={
            "nome": "João Atualizado",
            "email": "joao.novo@teste.com",
            "curso_id": sample_aluno.curso_id,
            "periodo": 2,
            "turno": "VESPERTINO",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["nome"] == "João Atualizado"
    assert data["periodo"] == 2


def test_deletar_aluno(client: TestClient, auth_headers, sample_aluno, db_session):
    """Testa exclusão de aluno."""
    response = client.delete(f"/alunos/{sample_aluno.matricula}", headers=auth_headers)
    assert response.status_code == 200

    # Verificar que foi removido
    aluno = (
        db_session.query(models.Aluno)
        .filter(models.Aluno.matricula == sample_aluno.matricula)
        .first()
    )
    assert aluno is None


def test_buscar_alunos_query(client: TestClient, auth_headers, sample_aluno):
    """Testa busca por nome ou matrícula."""
    response = client.get("/alunos/buscar?q=Aluno Teste", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["nome"] == "Aluno Teste"


def test_listar_alunos_em_risco(client: TestClient, auth_headers, sample_aluno, db_session):
    """Testa endpoint de alunos em risco."""
    # Criar predição de risco alto
    pred = models.Predicao(
        aluno_id=sample_aluno.matricula,
        risco_evasao=0.85,
        nivel_risco=models.NivelRisco.ALTO,
        fatores_principais="[]",
    )
    db_session.add(pred)
    db_session.commit()

    response = client.get("/alunos/em-risco", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "alunos" in data
    assert data["total"] >= 1
