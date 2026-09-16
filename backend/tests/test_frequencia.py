"""
Testes para o módulo de frequência mensal (routes/frequencia.py).
"""

from fastapi.testclient import TestClient

import models
from auth import criar_access_token, gerar_hash_senha


def _limpar_frequencias(db_session, matricula):
    """Remove registros de frequência pré-existentes para isolar o teste."""
    db_session.query(models.FrequenciaMensal).filter(
        models.FrequenciaMensal.aluno_id == matricula
    ).delete()
    db_session.commit()


def test_lancar_frequencia_mensal_em_lote(client: TestClient, auth_headers, sample_aluno):
    """Testa lançamento em lote de frequência mensal."""
    payload = {
        "mes": 3,
        "ano": 2025,
        "observacoes": "Lançamento teste",
        "alunos": [
            {
                "aluno_id": sample_aluno.matricula,
                "frequencia": 88.5,
                "faltas_justificadas": 1,
                "faltas_nao_justificadas": 2,
                "total_aulas_mes": 20,
            }
        ],
    }

    response = client.post("/frequencias/lancar", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["registros_criados"] == 1
    assert data["mes"] == 3
    assert data["ano"] == 2025
    assert "1 registro(s) criado(s)" in data["mensagem"]


def test_lancar_frequencia_atualiza_registro_existente(
    client: TestClient, auth_headers, sample_aluno, db_session
):
    """Testa que lançamento em lote atualiza registro já existente."""
    matricula = sample_aluno.matricula
    freq_existente = models.FrequenciaMensal(
        aluno_id=matricula,
        mes=4,
        ano=2025,
        frequencia=70.0,
        faltas_justificadas=0,
        faltas_nao_justificadas=0,
        total_aulas_mes=20,
    )
    db_session.add(freq_existente)
    db_session.commit()

    payload = {
        "mes": 4,
        "ano": 2025,
        "observacoes": "Atualização teste",
        "alunos": [
            {
                "aluno_id": matricula,
                "frequencia": 92.0,
                "faltas_justificadas": 0,
                "faltas_nao_justificadas": 1,
                "total_aulas_mes": 20,
            }
        ],
    }

    response = client.post("/frequencias/lancar", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["registros_criados"] == 1

    db_session.refresh(sample_aluno)
    assert float(sample_aluno.frequencia) == 92.0


def test_lancar_frequencia_aluno_nao_encontrado(client: TestClient, auth_headers):
    """Testa lançamento em lote com aluno inexistente."""
    payload = {
        "mes": 3,
        "ano": 2025,
        "alunos": [
            {
                "aluno_id": "9999999",
                "frequencia": 80.0,
                "faltas_justificadas": 0,
                "faltas_nao_justificadas": 0,
                "total_aulas_mes": 20,
            }
        ],
    }

    response = client.post("/frequencias/lancar", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["registros_criados"] == 0
    assert "1 erro" in data["mensagem"]


def test_lancar_frequencia_sem_permissao(client: TestClient, sample_aluno, db_session):
    """Testa que usuário não ADMIN/COORDENADOR não pode lançar frequência."""
    role = models.Role(nome="PROFESSOR", descricao="Professor")
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)

    user = models.Usuario(
        nome="Professor Teste",
        email="professor@teste.com",
        senha=gerar_hash_senha("senha123"),
        role_id=role.id,
        ativo=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = criar_access_token(
        data={"sub": user.id, "email": user.email, "role": "PROFESSOR"}
    )
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "mes": 3,
        "ano": 2025,
        "alunos": [
            {
                "aluno_id": sample_aluno.matricula,
                "frequencia": 80.0,
                "total_aulas_mes": 20,
            }
        ],
    }

    response = client.post("/frequencias/lancar", headers=headers, json=payload)

    assert response.status_code == 403


def test_registrar_frequencia_individual_criar(client: TestClient, auth_headers, sample_aluno):
    """Testa registro individual de frequência mensal (criar novo)."""
    payload = {
        "aluno_id": sample_aluno.matricula,
        "mes": 5,
        "ano": 2025,
        "frequencia": 85.0,
        "faltas_justificadas": 1,
        "faltas_nao_justificadas": 1,
        "total_aulas_mes": 18,
        "observacoes": "Frequência individual",
    }

    response = client.post(
        f"/alunos/{sample_aluno.matricula}/frequencia",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["aluno_id"] == sample_aluno.matricula
    assert data["mes"] == 5
    assert data["ano"] == 2025
    assert data["frequencia"] == 85.0


def test_registrar_frequencia_individual_atualizar(
    client: TestClient, auth_headers, sample_aluno, db_session
):
    """Testa registro individual atualizando registro existente."""
    matricula = sample_aluno.matricula
    freq_existente = models.FrequenciaMensal(
        aluno_id=matricula,
        mes=6,
        ano=2025,
        frequencia=60.0,
        total_aulas_mes=20,
    )
    db_session.add(freq_existente)
    db_session.commit()

    payload = {
        "aluno_id": matricula,
        "mes": 6,
        "ano": 2025,
        "frequencia": 95.0,
        "faltas_justificadas": 0,
        "faltas_nao_justificadas": 0,
        "total_aulas_mes": 20,
    }

    response = client.post(
        f"/alunos/{matricula}/frequencia",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["frequencia"] == 95.0
    assert data["id"] == freq_existente.id


def test_registrar_frequencia_aluno_nao_encontrado(client: TestClient, auth_headers):
    """Testa registro individual com matrícula inexistente."""
    payload = {
        "aluno_id": "9999999",
        "mes": 5,
        "ano": 2025,
        "frequencia": 80.0,
        "total_aulas_mes": 20,
    }

    response = client.post(
        "/alunos/9999999/frequencia",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 404


def test_historico_frequencia(client: TestClient, auth_headers, sample_aluno, db_session):
    """Testa histórico de frequência ordenado cronologicamente."""
    matricula = sample_aluno.matricula
    for mes, frequencia in [(7, 90.0), (8, 85.0), (9, 80.0)]:
        db_session.add(
            models.FrequenciaMensal(
                aluno_id=matricula,
                mes=mes,
                ano=2025,
                frequencia=frequencia,
                total_aulas_mes=20,
            )
        )
    db_session.commit()

    response = client.get(
        f"/alunos/{matricula}/frequencia-historico?meses=3",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["mes"] == 7
    assert data[1]["mes"] == 8
    assert data[2]["mes"] == 9


def test_tendencia_frequencia_dados_insuficientes(
    client: TestClient, auth_headers, sample_aluno, db_session
):
    """Testa tendência quando há dados insuficientes."""
    _limpar_frequencias(db_session, sample_aluno.matricula)
    response = client.get(
        f"/alunos/{sample_aluno.matricula}/frequencia-tendencia",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["tendencia"] == "INSUFICIENTE"
    assert data["variacao"] == 0
    assert data["alerta"] is False


def test_tendencia_frequencia_descendendo(
    client: TestClient, auth_headers, sample_aluno, db_session
):
    """Testa tendência de queda de frequência."""
    matricula = sample_aluno.matricula
    _limpar_frequencias(db_session, matricula)
    # Média antiga = (95 + 90 + 85) / 3 = 90; recente = 70 -> variação = -20
    for mes, frequencia in [(1, 95.0), (2, 90.0), (3, 85.0), (4, 70.0)]:
        db_session.add(
            models.FrequenciaMensal(
                aluno_id=matricula,
                mes=mes,
                ano=2024,
                frequencia=frequencia,
                total_aulas_mes=20,
            )
        )
    db_session.commit()

    response = client.get(
        f"/alunos/{matricula}/frequencia-tendencia",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["tendencia"] == "DESCENDO"
    assert data["variacao"] == -20.0
    assert data["alerta"] is True
    assert data["media_recente"] == 70.0
    assert data["media_antiga"] == 90.0


def test_tendencia_frequencia_subindo(
    client: TestClient, auth_headers, sample_aluno, db_session
):
    """Testa tendência de alta de frequência."""
    matricula = sample_aluno.matricula
    _limpar_frequencias(db_session, matricula)
    # Média antiga = (60 + 65 + 70) / 3 = 65; recente = 85 -> variação = +20
    for mes, frequencia in [(1, 60.0), (2, 65.0), (3, 70.0), (4, 85.0)]:
        db_session.add(
            models.FrequenciaMensal(
                aluno_id=matricula,
                mes=mes,
                ano=2024,
                frequencia=frequencia,
                total_aulas_mes=20,
            )
        )
    db_session.commit()

    response = client.get(
        f"/alunos/{matricula}/frequencia-tendencia",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["tendencia"] == "SUBINDO"
    assert data["variacao"] == 20.0
    assert data["alerta"] is False


def test_tendencia_frequencia_estavel(
    client: TestClient, auth_headers, sample_aluno, db_session
):
    """Testa tendência estável de frequência."""
    matricula = sample_aluno.matricula
    _limpar_frequencias(db_session, matricula)
    # Média antiga = (80 + 82 + 81) / 3 = 81; recente = 82 -> variação = +1
    for mes, frequencia in [(1, 80.0), (2, 82.0), (3, 81.0), (4, 82.0)]:
        db_session.add(
            models.FrequenciaMensal(
                aluno_id=matricula,
                mes=mes,
                ano=2024,
                frequencia=frequencia,
                total_aulas_mes=20,
            )
        )
    db_session.commit()

    response = client.get(
        f"/alunos/{matricula}/frequencia-tendencia",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["tendencia"] == "ESTAVEL"
    assert data["alerta"] is False
