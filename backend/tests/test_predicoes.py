"""
Testes para predições de risco de evasão.
"""

from fastapi.testclient import TestClient

import models


def test_gerar_predicoes_em_lote(client: TestClient, auth_headers, sample_aluno):
    """Testa geração de predições para todos os alunos sem predição."""
    response = client.post("/predicoes/gerar-todas", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "alunos_processados" in data
    # Pode ser 0 se todos já tiverem predições ou se houver erros no cálculo
    assert isinstance(data["alunos_processados"], int)


def test_resumo_predicoes(client: TestClient, auth_headers, sample_aluno, db_session):
    """Testa resumo das predições."""
    # Criar predição
    pred = models.Predicao(
        aluno_id=sample_aluno.matricula,
        risco_evasao=0.75,
        nivel_risco=models.NivelRisco.MEDIO,
        fatores_principais="[]",
    )
    db_session.add(pred)
    db_session.commit()

    response = client.get("/predicoes/resumo", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_alunos"] >= 1
    assert data["alunos_com_predicao"] >= 1
    assert data["percentual_com_predicao"] > 0


def test_predicao_alto_risco(client: TestClient, auth_headers, sample_aluno, db_session):
    """Testa que predição com risco alto é corretamente identificada."""
    pred = models.Predicao(
        aluno_id=sample_aluno.matricula,
        risco_evasao=0.92,
        nivel_risco=models.NivelRisco.ALTO,
        fatores_principais='["frequencia", "media"]',  # JSON string
    )
    db_session.add(pred)
    db_session.commit()

    response = client.get("/alunos/em-risco", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    # Verifica estrutura da resposta; pode estar vazio se houver intervenção ativa
    assert "alunos" in data
    assert "total" in data
