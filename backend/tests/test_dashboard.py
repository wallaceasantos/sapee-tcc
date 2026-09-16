"""
Testes para o módulo de dashboard.
"""

import models


def test_dashboard_stats(client, auth_headers, sample_aluno, db_session):
    """Obter estatísticas do dashboard."""
    predicao = models.Predicao(
        aluno_id=sample_aluno.matricula,
        risco_evasao=85.0,
        nivel_risco=models.NivelRisco.ALTO,
        fatores_principais="Frequência baixa",
        modelo_ml_versao="2.0.0",
    )
    db_session.add(predicao)

    intervencao = models.Intervencao(
        aluno_id=sample_aluno.matricula,
        usuario_id=1,
        tipo="Acompanhamento",
        descricao="Teste",
        status=models.StatusIntervencao.PENDENTE,
        prioridade="ALTA",
        data_intervencao=__import__("datetime").date.today(),
    )
    db_session.add(intervencao)
    db_session.commit()

    response = client.get(
        "/dashboard/stats",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_alunos"] >= 1
    assert data["risco_alto"] >= 1
    assert data["intervencoes_ativas"] >= 1


def test_dashboard_sem_autenticacao(client):
    """Acessar dashboard sem token retorna 401."""
    response = client.get("/dashboard/stats")
    assert response.status_code == 401
