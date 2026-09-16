"""
Testes para o módulo de atendimentos/ocorrências.
"""

from datetime import date, datetime, timedelta

import models
from schemas import StatusAtendimento, TipoAtendimento


def _payload_atendimento(data_atendimento: date | None = None, **kwargs):
    """Retorna payload base para criação de atendimento."""
    payload = {
        "tipo_atendimento": TipoAtendimento.PSICOLOGICO.value,
        "status": StatusAtendimento.REALIZADO.value,
        "data_atendimento": str(data_atendimento or date.today()),
        "hora_inicio": "08:00:00",
        "hora_fim": "09:00:00",
        "local": "Sala de Atendimento",
        "descricao": "Atendimento psicológico de rotina com o aluno.",
        "observacoes": "Aluno apresentou boa evolução.",
        "prioridade": "ALTA",
    }
    payload.update(kwargs)
    return payload


def test_criar_atendimento(client, auth_headers, sample_aluno):
    """Criar um atendimento para um aluno existente."""
    payload = _payload_atendimento()

    response = client.post(
        f"/alunos/{sample_aluno.matricula}/atendimentos",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["aluno_matricula"] == sample_aluno.matricula
    assert data["tipo_atendimento"] == payload["tipo_atendimento"]
    assert data["status"] == payload["status"]
    assert data["descricao"] == payload["descricao"]
    assert data["usuario_id"] is not None


def test_criar_atendimento_aluno_inexistente(client, auth_headers):
    """Tentar criar atendimento para aluno inexistente retorna 404."""
    payload = _payload_atendimento()

    response = client.post(
        "/alunos/999999/atendimentos",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 404
    assert "aluno" in response.json()["detail"].lower()


def test_listar_atendimentos_por_aluno(client, auth_headers, sample_aluno, db_session):
    """Listar atendimentos de um aluno específico."""
    atendimento = models.Atendimento(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        tipo_atendimento=TipoAtendimento.SOCIAL,
        status=StatusAtendimento.REALIZADO,
        data_atendimento=date.today(),
        descricao="Atendimento social direto no banco.",
        prioridade="MEDIA",
    )
    db_session.add(atendimento)
    db_session.commit()

    response = client.get(
        f"/alunos/{sample_aluno.matricula}/atendimentos",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert any(item["aluno_matricula"] == sample_aluno.matricula for item in data)


def test_listar_atendimentos_com_filtros(client, auth_headers, sample_aluno, db_session):
    """Filtrar atendimentos por tipo, status e prioridade."""
    atendimento = models.Atendimento(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        tipo_atendimento=TipoAtendimento.ACADEMICO,
        status=StatusAtendimento.CONCLUIDO,
        data_atendimento=date.today(),
        descricao="Atendimento acadêmico concluído.",
        prioridade="BAIXA",
    )
    db_session.add(atendimento)
    db_session.commit()

    response = client.get(
        f"/alunos/{sample_aluno.matricula}/atendimentos",
        headers=auth_headers,
        params={
            "tipo": TipoAtendimento.ACADEMICO.value,
            "status": StatusAtendimento.CONCLUIDO.value,
            "prioridade": "BAIXA",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["tipo_atendimento"] == TipoAtendimento.ACADEMICO.value
    assert data[0]["status"] == StatusAtendimento.CONCLUIDO.value
    assert data[0]["prioridade"] == "BAIXA"


def test_obter_atendimento_especifico(client, auth_headers, sample_aluno, db_session):
    """Obter um atendimento específico por ID."""
    atendimento = models.Atendimento(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        tipo_atendimento=TipoAtendimento.SAUDE,
        status=StatusAtendimento.AGENDADO,
        data_atendimento=date.today(),
        descricao="Atendimento de saúde agendado.",
        prioridade="URGENTE",
    )
    db_session.add(atendimento)
    db_session.commit()
    db_session.refresh(atendimento)

    response = client.get(
        f"/alunos/{sample_aluno.matricula}/atendimentos/{atendimento.id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == atendimento.id
    assert data["tipo_atendimento"] == TipoAtendimento.SAUDE.value


def test_obter_atendimento_inexistente(client, auth_headers, sample_aluno):
    """Tentar obter atendimento inexistente retorna 404."""
    response = client.get(
        f"/alunos/{sample_aluno.matricula}/atendimentos/999999",
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert "atendimento" in response.json()["detail"].lower()


def test_atualizar_atendimento(client, auth_headers, sample_aluno, db_session):
    """Atualizar dados de um atendimento."""
    atendimento = models.Atendimento(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        tipo_atendimento=TipoAtendimento.DISCIPLINAR,
        status=StatusAtendimento.AGENDADO,
        data_atendimento=date.today(),
        descricao="Descrição original do atendimento.",
        prioridade="MEDIA",
    )
    db_session.add(atendimento)
    db_session.commit()
    db_session.refresh(atendimento)

    response = client.put(
        f"/alunos/{sample_aluno.matricula}/atendimentos/{atendimento.id}",
        headers=auth_headers,
        json={
            "descricao": "Descrição atualizada do atendimento disciplinar.",
            "status": StatusAtendimento.CONCLUIDO.value,
            "prioridade": "ALTA",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["descricao"] == "Descrição atualizada do atendimento disciplinar."
    assert data["status"] == StatusAtendimento.CONCLUIDO.value
    assert data["prioridade"] == "ALTA"


def test_deletar_atendimento(client, auth_headers, sample_aluno, db_session):
    """Excluir um atendimento existente."""
    atendimento = models.Atendimento(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        tipo_atendimento=TipoAtendimento.CONVERSA_INFORMAL,
        status=StatusAtendimento.REALIZADO,
        data_atendimento=date.today(),
        descricao="Conversa informal registrada para exclusão.",
        prioridade="BAIXA",
    )
    db_session.add(atendimento)
    db_session.commit()
    db_session.refresh(atendimento)

    response = client.delete(
        f"/alunos/{sample_aluno.matricula}/atendimentos/{atendimento.id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert "excluído" in response.json()["message"].lower()

    response_get = client.get(
        f"/alunos/{sample_aluno.matricula}/atendimentos/{atendimento.id}",
        headers=auth_headers,
    )
    assert response_get.status_code == 404


def test_listar_todos_atendimentos(client, auth_headers, sample_aluno, db_session):
    """Listar todos os atendimentos do sistema."""
    atendimento = models.Atendimento(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        tipo_atendimento=TipoAtendimento.ENCAMINHAMENTO_EXTERNO,
        status=StatusAtendimento.REALIZADO,
        data_atendimento=date.today(),
        descricao="Encaminhamento externo registrado.",
        prioridade="ALTA",
        necessita_encaminhamento=True,
        status_encaminhamento="SOLICITADO",
    )
    db_session.add(atendimento)
    db_session.commit()

    response = client.get("/atendimentos", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_estatisticas_atendimentos(client, auth_headers, sample_aluno, db_session):
    """Obter estatísticas gerais de atendimentos."""
    atendimento = models.Atendimento(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        tipo_atendimento=TipoAtendimento.PSICOLOGICO,
        status=StatusAtendimento.REALIZADO,
        data_atendimento=date.today(),
        descricao="Atendimento para estatísticas.",
        prioridade="ALTA",
        necessita_encaminhamento=True,
        necessita_followup=True,
    )
    db_session.add(atendimento)
    db_session.commit()

    response = client.get("/atendimentos/stats", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert data["com_encaminhamento"] >= 1
    assert data["com_followup"] >= 1
    assert TipoAtendimento.PSICOLOGICO.value in data["por_tipo"]
    assert StatusAtendimento.REALIZADO.value in data["por_status"]
    assert "ALTA" in data["por_prioridade"]


def test_historico_encaminhamento(client, auth_headers, sample_aluno, db_session):
    """Registrar e consultar histórico de mudanças de status de encaminhamento."""
    atendimento = models.Atendimento(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        tipo_atendimento=TipoAtendimento.ENCAMINHAMENTO_EXTERNO,
        status=StatusAtendimento.REALIZADO,
        data_atendimento=date.today(),
        descricao="Encaminhamento para histórico.",
        prioridade="ALTA",
        necessita_encaminhamento=True,
        status_encaminhamento="SOLICITADO",
        tipo_encaminhamento="CAPS",
    )
    db_session.add(atendimento)
    db_session.commit()
    db_session.refresh(atendimento)

    response = client.put(
        f"/alunos/{sample_aluno.matricula}/atendimentos/{atendimento.id}",
        headers=auth_headers,
        json={"status_encaminhamento": "EM_ATENDIMENTO"},
    )
    assert response.status_code == 200

    response = client.put(
        f"/alunos/{sample_aluno.matricula}/atendimentos/{atendimento.id}",
        headers=auth_headers,
        json={"status_encaminhamento": "CONCLUIDO"},
    )
    assert response.status_code == 200

    response = client.get(
        f"/atendimentos/{atendimento.id}/historico",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["status_novo"] == "CONCLUIDO"
    assert data[1]["status_anterior"] == "SOLICITADO"
    assert data[1]["status_novo"] == "EM_ATENDIMENTO"
    assert "usuario" in data[0]


def test_alertas_demora_encaminhamento(client, auth_headers, sample_aluno, db_session):
    """Identificar encaminhamentos antigos que estão há mais de X dias no mesmo status."""
    data_antiga = date.today() - timedelta(days=60)

    atendimento = models.Atendimento(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        tipo_atendimento=TipoAtendimento.ENCAMINHAMENTO_EXTERNO,
        status=StatusAtendimento.REALIZADO,
        data_atendimento=data_antiga,
        descricao="Encaminhamento antigo sem movimentação.",
        prioridade="ALTA",
        necessita_encaminhamento=True,
        status_encaminhamento="SOLICITADO",
        tipo_encaminhamento="UBS",
    )
    db_session.add(atendimento)
    db_session.commit()
    db_session.refresh(atendimento)

    response = client.get(
        "/atendimentos/alertas-demora",
        headers=auth_headers,
        params={"dias_limite": 30},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_alertas"] >= 1
    assert data["dias_limite"] == 30
    assert any(
        alerta["aluno_matricula"] == sample_aluno.matricula
        and alerta["status_encaminhamento"] == "SOLICITADO"
        and alerta["dias_espera"] >= 60
        for alerta in data["alertas"]
    )


def test_alertas_demora_nao_inclui_concluidos(client, auth_headers, sample_aluno, db_session):
    """Alertas de demora não devem incluir encaminhamentos já concluídos."""
    data_antiga = date.today() - timedelta(days=60)

    atendimento_concluido = models.Atendimento(
        aluno_matricula=sample_aluno.matricula,
        usuario_id=1,
        tipo_atendimento=TipoAtendimento.ENCAMINHAMENTO_EXTERNO,
        status=StatusAtendimento.REALIZADO,
        data_atendimento=data_antiga,
        descricao="Encaminhamento antigo já concluído.",
        prioridade="ALTA",
        necessita_encaminhamento=True,
        status_encaminhamento="CONCLUIDO",
        tipo_encaminhamento="UBS",
    )
    db_session.add(atendimento_concluido)
    db_session.commit()

    response = client.get(
        "/atendimentos/alertas-demora",
        headers=auth_headers,
        params={"dias_limite": 30},
    )

    assert response.status_code == 200
    data = response.json()
    assert not any(
        alerta["aluno_matricula"] == sample_aluno.matricula
        and alerta["status_encaminhamento"] == "CONCLUIDO"
        for alerta in data["alertas"]
    )
