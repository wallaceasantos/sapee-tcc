"""
Testes para o módulo de questionário psicossocial.
"""

import models


def test_listar_perguntas_questionario(client, auth_headers):
    """Listar perguntas do questionário psicossocial."""
    response = client.get(
        "/questionario/perguntas",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert "perguntas" in data
    assert "escalas" in data
    assert len(data["perguntas"]) > 0


def test_responder_questionario(client, auth_headers, sample_aluno):
    """Registrar respostas do questionário para um aluno."""
    payload = {
        "aluno_matricula": sample_aluno.matricula,
        "q1_ansiedade": 4,
        "q2_depressao": 3,
        "q3_estresse": 4,
        "q4_sono": 2,
        "q5_bem_estar": 2,
        "q6_pertencimento": 3,
        "q7_amizades": 3,
        "q8_participacao": 2,
        "q9_relacionamento_professores": 3,
        "q10_apoio_colegas": 2,
        "q11_expectativas": 2,
        "q12_qualidade_aulas": 3,
        "q13_infraestrutura": 2,
        "q14_conteudo_programatico": 3,
        "q15_motivacao_curso": 2,
        "q16_trabalho_estudo": 4,
        "q17_familia_estudo": 3,
        "q18_tempo_lazer": 2,
        "q19_cansaco": 4,
        "q20_sobrecarga": 4,
        "termo_consentimento": True,
    }

    response = client.post(
        "/questionario/responder",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["aluno_matricula"] == sample_aluno.matricula
    assert data["score_psicossocial_total"] > 0
    assert data["nivel_risco_psicossocial"] in ["BAIXO", "MEDIO", "ALTO", "MUITO_ALTO"]


def test_obter_respostas_questionario(client, auth_headers, db_session):
    """Obter respostas do questionário de um aluno."""
    aluno = models.Aluno(
        matricula="2024099",
        nome="Aluno Questionario",
        curso_id=1,
    )
    db_session.add(aluno)
    db_session.commit()

    questionario = models.QuestionarioPsicossocial(
        aluno_matricula=aluno.matricula,
        q1_ansiedade=3,
        q2_depressao=3,
        score_saude_mental=15,
        score_integracao_social=15,
        score_satisfacao_curso=15,
        score_conflitos=15,
        score_intencao_evasao=10,
        score_psicossocial_total=70,
        nivel_risco_psicossocial="MEDIO",
        termo_consentimento=True,
    )
    db_session.add(questionario)
    db_session.commit()

    response = client.get(
        f"/questionario/{aluno.matricula}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["aluno_matricula"] == aluno.matricula
    assert data["nivel_risco_psicossocial"] == "MEDIO"


def test_questionario_aluno_inexistente(client, auth_headers):
    """Responder questionário para aluno inexistente retorna 404."""
    payload = {
        "aluno_matricula": "999999",
        "q1_ansiedade": 3,
        "q2_depressao": 3,
    }

    response = client.post(
        "/questionario/responder",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 404


def test_dashboard_questionario(client, auth_headers, sample_aluno, db_session):
    """Obter estatísticas do questionário."""
    questionario = models.QuestionarioPsicossocial(
        aluno_matricula=sample_aluno.matricula,
        q1_ansiedade=4,
        q2_depressao=4,
        score_saude_mental=20,
        score_integracao_social=20,
        score_satisfacao_curso=20,
        score_conflitos=20,
        score_intencao_evasao=20,
        score_psicossocial_total=100,
        nivel_risco_psicossocial="ALTO",
        termo_consentimento=True,
    )
    db_session.add(questionario)
    db_session.commit()

    response = client.get(
        "/questionario/dashboard/stats",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_respostas"] >= 1
    assert data["alunos_com_questionario"] >= 1
    assert data["distribuicao_risco"]["risco_alto"] >= 1
