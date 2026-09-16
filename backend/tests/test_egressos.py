"""
Testes para o módulo de egressos.
"""

from datetime import date

import models


def test_criar_egresso(client, auth_headers, sample_aluno):
    """Cadastrar um egresso (aluno que evadiu)."""
    payload = {
        "aluno_matricula": sample_aluno.matricula,
        "data_saida": str(date.today()),
        "motivo_saida": "ABANDONO",
        "motivo_detalhes": "Dificuldades financeiras",
        "motivo_abandono_principal": "FINANCEIRO",
        "esta_estudando": False,
        "esta_trabalhando": True,
        "observacoes": "Evasão registrada para testes",
    }

    response = client.post(
        "/egressos",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["aluno_matricula"] == sample_aluno.matricula
    assert data["motivo_saida"] == "ABANDONO"
    assert data["aluno_nome"] == sample_aluno.nome


def test_listar_egressos(client, auth_headers, sample_aluno, db_session):
    """Listar todos os egressos cadastrados."""
    egresso = models.Egresso(
        aluno_matricula=sample_aluno.matricula,
        data_saida=date.today(),
        motivo_saida="TRANSFERENCIA",
        cadastrado_por=1,
    )
    db_session.add(egresso)
    db_session.commit()

    response = client.get(
        "/egressos",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert "egressos" in data
    assert isinstance(data["egressos"], list)
    assert len(data["egressos"]) >= 1


def test_atualizar_egresso(client, auth_headers, sample_aluno, db_session):
    """Atualizar dados de um egresso."""
    egresso = models.Egresso(
        aluno_matricula=sample_aluno.matricula,
        data_saida=date.today(),
        motivo_saida="ABANDONO",
        cadastrado_por=1,
    )
    db_session.add(egresso)
    db_session.commit()
    db_session.refresh(egresso)

    response = client.put(
        f"/egressos/{egresso.id}",
        headers=auth_headers,
        json={
            "motivo_detalhes": "Motivo atualizado",
            "esta_estudando": True,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["motivo_detalhes"] == "Motivo atualizado"
    assert data["esta_estudando"] is True


def test_excluir_egresso_apenas_admin(client, auth_headers, admin_user, sample_aluno, db_session):
    """Excluir egresso apenas como ADMIN."""
    egresso = models.Egresso(
        aluno_matricula=sample_aluno.matricula,
        data_saida=date.today(),
        motivo_saida="CONCLUSAO",
        cadastrado_por=admin_user.id,
    )
    db_session.add(egresso)
    db_session.commit()
    db_session.refresh(egresso)

    response = client.delete(
        f"/egressos/{egresso.id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert "excluído" in response.json()["message"].lower()


def test_estatisticas_egressos(client, auth_headers, sample_aluno, db_session):
    """Obter estatísticas de egressos."""
    egresso = models.Egresso(
        aluno_matricula=sample_aluno.matricula,
        data_saida=date.today(),
        motivo_saida="ABANDONO",
        cadastrado_por=1,
        tinha_predicao_risco=True,
    )
    db_session.add(egresso)
    db_session.commit()

    response = client.get(
        "/egressos/estatisticas",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_egressos"] >= 1
    assert data["total_abandonos"] >= 1
    assert "percentual_predicao_correta" in data


def test_egresso_aluno_inexistente(client, auth_headers):
    """Cadastrar egresso para aluno inexistente retorna 404."""
    payload = {
        "aluno_matricula": "999999",
        "data_saida": str(date.today()),
        "motivo_saida": "ABANDONO",
    }

    response = client.post(
        "/egressos",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 404
