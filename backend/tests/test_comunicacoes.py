"""
Testes para o módulo de comunicações.
"""

import models


def test_criar_comunicacao(client, auth_headers, sample_aluno):
    """Criar uma comunicação para um aluno via canal SISTEMA."""
    payload = {
        "aluno_matricula": sample_aluno.matricula,
        "destinatario_tipo": "RESPONSAVEL",
        "destinatario_nome": "Mãe do Aluno",
        "destinatario_contato": "00000000000",
        "tipo_comunicacao": "RISCO",
        "canal": "SISTEMA",
        "assunto": "Alerta de risco",
        "mensagem": "Seu filho está com risco de evasão. Entre em contato conosco.",
        "eh_lembrete": False,
    }

    response = client.post(
        "/comunicacoes",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["aluno_matricula"] == sample_aluno.matricula
    assert data["canal"] == "SISTEMA"
    assert data["mensagem"] is not None


def test_listar_comunicacoes_por_aluno(client, auth_headers, sample_aluno, db_session):
    """Listar comunicações de um aluno."""
    comunicacao = models.Comunicacao(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        destinatario_tipo="RESPONSAVEL",
        destinatario_nome="Pai",
        tipo_comunicacao="FALTAS",
        canal="SISTEMA",
        mensagem="Teste",
        status="ENVIADA",
    )
    db_session.add(comunicacao)
    db_session.commit()

    response = client.get(
        f"/alunos/{sample_aluno.matricula}/comunicacoes",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["aluno_matricula"] == sample_aluno.matricula


def test_atualizar_status_comunicacao(client, auth_headers, sample_aluno, db_session):
    """Atualizar status de uma comunicação."""
    comunicacao = models.Comunicacao(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        destinatario_tipo="RESPONSAVEL",
        destinatario_nome="Pai",
        tipo_comunicacao="RISCO",
        canal="SISTEMA",
        mensagem="Teste",
        status="PENDENTE",
    )
    db_session.add(comunicacao)
    db_session.commit()
    db_session.refresh(comunicacao)

    response = client.put(
        f"/comunicacoes/{comunicacao.id}",
        headers=auth_headers,
        json={"status": "LIDA", "data_leitura": "2026-06-08T10:00:00"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "LIDA"


def test_excluir_comunicacao(client, auth_headers, sample_aluno, db_session):
    """Excluir uma comunicação."""
    comunicacao = models.Comunicacao(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        destinatario_tipo="RESPONSAVEL",
        destinatario_nome="Pai",
        tipo_comunicacao="RISCO",
        canal="SISTEMA",
        mensagem="Teste",
        status="ENVIADA",
    )
    db_session.add(comunicacao)
    db_session.commit()
    db_session.refresh(comunicacao)

    response = client.delete(
        f"/comunicacoes/{comunicacao.id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert "excluída" in response.json()["message"].lower()


def test_comunicacao_aluno_inexistente(client, auth_headers):
    """Criar comunicação para aluno inexistente retorna 404."""
    payload = {
        "aluno_matricula": "999999",
        "destinatario_tipo": "RESPONSAVEL",
        "destinatario_nome": "Teste",
        "tipo_comunicacao": "RISCO",
        "canal": "SISTEMA",
        "mensagem": "Mensagem de teste",
    }

    response = client.post(
        "/comunicacoes",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 404
