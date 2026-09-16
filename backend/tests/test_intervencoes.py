"""
Testes para o módulo de intervenções.
"""

from datetime import date, timedelta

import models


def test_criar_intervencao(client, auth_headers, sample_aluno):
    """Criar uma intervenção para um aluno."""
    payload = {
        "tipo": "Acompanhamento Pedagógico",
        "descricao": "Monitoramento de frequência",
        "status": "PENDENTE",
        "prioridade": "ALTA",
        "data_intervencao": str(date.today()),
    }

    response = client.post(
        f"/alunos/{sample_aluno.matricula}/intervencoes",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["tipo"] == "Acompanhamento Pedagógico"
    assert data["status"] == "PENDENTE"
    assert data["aluno"]["matricula"] == sample_aluno.matricula


def test_listar_intervencoes_por_aluno(client, auth_headers, sample_aluno, db_session):
    """Listar intervenções de um aluno específico."""
    intervencao = models.Intervencao(
        aluno_id=sample_aluno.matricula,
        usuario_id=1,
        tipo="Apoio Social",
        descricao="Apoio ao aluno",
        status=models.StatusIntervencao.PENDENTE,
        prioridade="MEDIA",
        data_intervencao=date.today(),
    )
    db_session.add(intervencao)
    db_session.commit()

    response = client.get(
        f"/alunos/{sample_aluno.matricula}/intervencoes",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["aluno"]["matricula"] == sample_aluno.matricula


def test_aluno_inexistente_retorna_404(client, auth_headers):
    """Tentar listar intervenções de aluno inexistente retorna 404."""
    response = client.get(
        "/alunos/999999/intervencoes",
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert "não encontrado" in response.json()["detail"].lower()


def test_gerar_sugestoes_automaticas(client, auth_headers, db_session):
    """Gerar sugestões automáticas de intervenção para alunos em risco."""
    curso = models.Curso(nome="Curso Sugestao", modalidade="Integrado")
    db_session.add(curso)
    db_session.commit()
    db_session.refresh(curso)

    aluno = models.Aluno(
        matricula="2024500",
        nome="Aluno em Risco",
        curso_id=curso.id,
        periodo=2,
        turno=models.Turno.MATUTINO,
        frequencia=65.0,
        media_geral=5.0,
    )
    db_session.add(aluno)
    db_session.commit()

    predicao = models.Predicao(
        aluno_id=aluno.matricula,
        risco_evasao=85.0,
        nivel_risco=models.NivelRisco.ALTO,
        fatores_principais="Frequência baixa",
        modelo_ml_versao="2.0.0",
    )
    db_session.add(predicao)
    db_session.commit()

    response = client.get(
        "/intervencoes/gerar-sugestoes?nivel_risco=ALTO",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["sugestoes_geradas"] >= 1


def test_aprovar_rejeitar_intervencao(client, auth_headers, sample_aluno, db_session):
    """Aprovar e rejeitar rascunhos de intervenção."""
    rascunho = models.Intervencao(
        aluno_id=sample_aluno.matricula,
        usuario_id=None,
        tipo="Acompanhamento",
        descricao="Teste",
        status=models.StatusIntervencao.RASCUNHO,
        prioridade="ALTA",
        data_intervencao=date.today(),
        auto_gerada=True,
    )
    db_session.add(rascunho)
    db_session.commit()
    db_session.refresh(rascunho)

    response = client.post(
        f"/intervencoes/{rascunho.id}/aprovar",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "ciclo_fim" in response.json()

    rascunho2 = models.Intervencao(
        aluno_id=sample_aluno.matricula,
        usuario_id=None,
        tipo="Acompanhamento 2",
        descricao="Teste 2",
        status=models.StatusIntervencao.RASCUNHO,
        prioridade="MEDIA",
        data_intervencao=date.today(),
        auto_gerada=True,
    )
    db_session.add(rascunho2)
    db_session.commit()
    db_session.refresh(rascunho2)

    response = client.post(
        f"/intervencoes/{rascunho2.id}/rejeitar?motivo=Não aplicável",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "rejeitada" in response.json()["message"].lower()
