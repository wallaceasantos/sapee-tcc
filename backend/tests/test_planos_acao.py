"""
Testes para o módulo de planos de ação e metas.
"""

import json
from datetime import date, datetime, timedelta

import models


def _hoje():
    return date.today()


def _daqui_a(dias: int):
    return date.today() + timedelta(days=dias)


# ============================================================
# PLANOS DE AÇÃO
# ============================================================


def test_criar_plano_acao(client, auth_headers, sample_aluno):
    """Criar um plano de ação vinculado ao curso do aluno."""
    payload = {
        "curso_id": sample_aluno.curso_id,
        "nivel_risco": "ALTO",
        "meta_frequencia_minima": 80.0,
        "meta_media_minima": 6.5,
        "prazo_dias": 45,
        "acoes_recomendadas": json.dumps(["Monitoria", "Acompanhamento pedagógico"]),
        "observacoes": "Plano de teste",
    }

    response = client.post("/planos-acao", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["curso_id"] == sample_aluno.curso_id
    assert data["nivel_risco"] == "ALTO"
    assert data["meta_frequencia_minima"] == 80.0
    assert data["meta_media_minima"] == 6.5
    assert data["prazo_dias"] == 45
    assert data["ativo"] is True


def test_listar_planos_acao(client, auth_headers, sample_aluno, db_session):
    """Listar planos de ação deve retornar os planos ativos."""
    plano = models.PlanosAcao(
        curso_id=sample_aluno.curso_id,
        nivel_risco=models.NivelRisco.MEDIO,
        meta_frequencia_minima=75.0,
        meta_media_minima=6.0,
        prazo_dias=30,
        ativo=True,
    )
    db_session.add(plano)
    db_session.commit()

    response = client.get("/planos-acao", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(p["nivel_risco"] == "MEDIO" for p in data)


def test_filtrar_planos_acao_por_nivel_risco(client, auth_headers, sample_aluno, db_session):
    """Filtrar planos por nível de risco."""
    plano = models.PlanosAcao(
        curso_id=sample_aluno.curso_id,
        nivel_risco=models.NivelRisco.BAIXO,
        meta_frequencia_minima=75.0,
        meta_media_minima=6.0,
        prazo_dias=30,
        ativo=True,
    )
    db_session.add(plano)
    db_session.commit()

    response = client.get("/planos-acao?nivel_risco=BAIXO", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert all(p["nivel_risco"] == "BAIXO" for p in data)


def test_obter_plano_acao(client, auth_headers, sample_aluno, db_session):
    """Obter um plano de ação específico."""
    plano = models.PlanosAcao(
        curso_id=sample_aluno.curso_id,
        nivel_risco=models.NivelRisco.ALTO,
        meta_frequencia_minima=85.0,
        meta_media_minima=7.0,
        prazo_dias=60,
        ativo=True,
    )
    db_session.add(plano)
    db_session.commit()
    db_session.refresh(plano)

    response = client.get(f"/planos-acao/{plano.id}", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == plano.id
    assert data["nivel_risco"] == "ALTO"


def test_obter_plano_acao_inexistente(client, auth_headers):
    """Buscar plano inexistente retorna 404."""
    response = client.get("/planos-acao/999999", headers=auth_headers)
    assert response.status_code == 404
    assert "não encontrado" in response.json()["detail"].lower()


def test_atualizar_plano_acao(client, auth_headers, sample_aluno, db_session):
    """Atualizar dados de um plano de ação."""
    plano = models.PlanosAcao(
        curso_id=sample_aluno.curso_id,
        nivel_risco=models.NivelRisco.MEDIO,
        meta_frequencia_minima=75.0,
        meta_media_minima=6.0,
        prazo_dias=30,
        ativo=True,
    )
    db_session.add(plano)
    db_session.commit()
    db_session.refresh(plano)

    payload = {"meta_frequencia_minima": 90.0, "prazo_dias": 15}
    response = client.put(f"/planos-acao/{plano.id}", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["meta_frequencia_minima"] == 90.0
    assert data["prazo_dias"] == 15


def test_deletar_plano_acao(client, auth_headers, sample_aluno, db_session):
    """Desativar (soft delete) um plano de ação."""
    plano = models.PlanosAcao(
        curso_id=sample_aluno.curso_id,
        nivel_risco=models.NivelRisco.BAIXO,
        meta_frequencia_minima=75.0,
        meta_media_minima=6.0,
        prazo_dias=30,
        ativo=True,
    )
    db_session.add(plano)
    db_session.commit()
    db_session.refresh(plano)

    response = client.delete(f"/planos-acao/{plano.id}", headers=auth_headers)

    assert response.status_code == 200
    assert "desativado" in response.json()["message"].lower()

    db_session.refresh(plano)
    assert plano.ativo is False


def test_criar_plano_acao_duplicado(client, auth_headers, sample_aluno, db_session):
    """Não deve permitir dois planos ativos para o mesmo curso e nível."""
    plano = models.PlanosAcao(
        curso_id=sample_aluno.curso_id,
        nivel_risco=models.NivelRisco.MUITO_ALTO,
        meta_frequencia_minima=75.0,
        meta_media_minima=6.0,
        prazo_dias=30,
        ativo=True,
    )
    db_session.add(plano)
    db_session.commit()

    payload = {
        "curso_id": sample_aluno.curso_id,
        "nivel_risco": "MUITO_ALTO",
        "meta_frequencia_minima": 80.0,
        "meta_media_minima": 6.0,
        "prazo_dias": 30,
    }
    response = client.post("/planos-acao", headers=auth_headers, json=payload)

    assert response.status_code == 400
    assert "já existe" in response.json()["detail"].lower()


# ============================================================
# SUGESTÃO DE PLANO
# ============================================================


def test_sugestao_plano_acao(client, auth_headers, sample_aluno, db_session):
    """Obter sugestão de intervenção para aluno com predição."""
    predicao = models.Predicao(
        aluno_id=sample_aluno.matricula,
        risco_evasao=88.0,
        nivel_risco=models.NivelRisco.ALTO,
        fatores_principais="Frequência baixa",
    )
    db_session.add(predicao)
    db_session.commit()

    plano = models.PlanosAcao(
        curso_id=sample_aluno.curso_id,
        nivel_risco=models.NivelRisco.ALTO,
        meta_frequencia_minima=85.0,
        meta_media_minima=7.0,
        prazo_dias=30,
        acoes_recomendadas=json.dumps(["Monitoria", "Acompanhamento psicossocial"]),
        ativo=True,
    )
    db_session.add(plano)
    db_session.commit()

    response = client.get(
        f"/planos-acao/sugestao/{sample_aluno.matricula}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["aluno"]["matricula"] == sample_aluno.matricula
    assert data["aluno"]["nivel_risco"] == "ALTO"
    assert data["plano_acao"] is not None
    assert data["plano_acao"]["meta_frequencia"] == 85.0
    assert "Monitoria" in data["acoes_sugeridas"]


def test_sugestao_plano_acao_sem_predicao(client, auth_headers, sample_aluno, db_session):
    """Sugestão sem predição deve retornar 404."""
    # Isolar: remover predições pré-existentes do aluno (estado compartilhado)
    db_session.query(models.Predicao).filter(
        models.Predicao.aluno_id == sample_aluno.matricula
    ).delete()
    db_session.commit()

    response = client.get(
        f"/planos-acao/sugestao/{sample_aluno.matricula}",
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert "predição" in response.json()["detail"].lower()


def test_sugestao_plano_acao_aluno_inexistente(client, auth_headers):
    """Sugestão para aluno inexistente deve retornar 404."""
    response = client.get("/planos-acao/sugestao/999999", headers=auth_headers)
    assert response.status_code == 404
    assert "aluno" in response.json()["detail"].lower()


# ============================================================
# METAS SEMESTRAIS
# ============================================================


def test_criar_meta_semestral(client, auth_headers, sample_aluno):
    """Criar meta semestral para um curso."""
    payload = {
        "curso_id": sample_aluno.curso_id,
        "semestre": f"{datetime.now().year}-1",
        "meta_frequencia_geral": 85.0,
        "meta_media_geral": 7.0,
        "meta_reducao_evasao": 15.0,
        "meta_recuperacao": 60.0,
        "data_inicio": str(_hoje()),
        "data_fim": str(_daqui_a(180)),
        "observacoes": "Meta semestral de teste",
    }

    response = client.post("/metas-semestrais", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["curso_id"] == sample_aluno.curso_id
    assert data["semestre"] == payload["semestre"]
    assert data["status"] == "ATIVA"


def test_listar_metas_semestrais(client, auth_headers, sample_aluno, db_session):
    """Listar metas semestrais."""
    meta = models.MetasSemestrais(
        curso_id=sample_aluno.curso_id,
        semestre="2025-2",
        meta_frequencia_geral=80.0,
        meta_media_geral=7.0,
        meta_reducao_evasao=10.0,
        meta_recuperacao=50.0,
        data_inicio=_hoje(),
        data_fim=_daqui_a(180),
        status="ATIVA",
    )
    db_session.add(meta)
    db_session.commit()

    response = client.get("/metas-semestrais", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(m["semestre"] == "2025-2" for m in data)


def test_filtrar_metas_semestrais(client, auth_headers, sample_aluno, db_session):
    """Filtrar metas semestrais por semestre."""
    meta = models.MetasSemestrais(
        curso_id=sample_aluno.curso_id,
        semestre="2024-2",
        meta_frequencia_geral=80.0,
        meta_media_geral=7.0,
        meta_reducao_evasao=10.0,
        meta_recuperacao=50.0,
        data_inicio=_hoje(),
        data_fim=_daqui_a(180),
        status="CONCLUIDA",
    )
    db_session.add(meta)
    db_session.commit()

    response = client.get("/metas-semestrais?semestre=2024-2", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert all(m["semestre"] == "2024-2" for m in data)


def test_atualizar_meta_semestral(client, auth_headers, sample_aluno, db_session):
    """Atualizar uma meta semestral."""
    meta = models.MetasSemestrais(
        curso_id=sample_aluno.curso_id,
        semestre="2023-1",
        meta_frequencia_geral=80.0,
        meta_media_geral=7.0,
        meta_reducao_evasao=10.0,
        meta_recuperacao=50.0,
        data_inicio=_hoje(),
        data_fim=_daqui_a(180),
        status="ATIVA",
    )
    db_session.add(meta)
    db_session.commit()
    db_session.refresh(meta)

    payload = {"meta_frequencia_geral": 95.0, "status": "CONCLUIDA"}
    response = client.put(f"/metas-semestrais/{meta.id}", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["meta_frequencia_geral"] == 95.0
    assert data["status"] == "CONCLUIDA"


def test_criar_meta_semestral_duplicada(client, auth_headers, sample_aluno, db_session):
    """Não deve permitir meta duplicada para curso e semestre."""
    meta = models.MetasSemestrais(
        curso_id=sample_aluno.curso_id,
        semestre="2022-1",
        meta_frequencia_geral=80.0,
        meta_media_geral=7.0,
        meta_reducao_evasao=10.0,
        meta_recuperacao=50.0,
        data_inicio=_hoje(),
        data_fim=_daqui_a(180),
        status="ATIVA",
    )
    db_session.add(meta)
    db_session.commit()

    payload = {
        "curso_id": sample_aluno.curso_id,
        "semestre": "2022-1",
        "meta_frequencia_geral": 85.0,
        "meta_media_geral": 7.5,
        "meta_reducao_evasao": 12.0,
        "meta_recuperacao": 55.0,
        "data_inicio": str(_hoje()),
        "data_fim": str(_daqui_a(180)),
    }
    response = client.post("/metas-semestrais", headers=auth_headers, json=payload)

    assert response.status_code == 400
    assert "já existe" in response.json()["detail"].lower()


# ============================================================
# METAS DE ALUNO
# ============================================================


def test_criar_meta_aluno(client, auth_headers, sample_aluno):
    """Criar meta individual para aluno."""
    payload = {
        "meta_frequencia": 80.0,
        "meta_media": 7.0,
        "data_limite": str(_daqui_a(30)),
        "observacoes": "Meta individual",
    }

    response = client.post(
        f"/alunos/{sample_aluno.matricula}/metas",
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["aluno_matricula"] == sample_aluno.matricula
    assert data["meta_frequencia"] == 80.0
    assert data["status"] == "PENDENTE"


def test_listar_metas_aluno(client, auth_headers, sample_aluno, db_session):
    """Listar metas de um aluno."""
    meta = models.AlunoMeta(
        aluno_matricula=sample_aluno.matricula,
        meta_frequencia=75.0,
        meta_media=6.0,
        data_limite=_daqui_a(30),
        status="PENDENTE",
    )
    db_session.add(meta)
    db_session.commit()

    response = client.get(f"/alunos/{sample_aluno.matricula}/metas", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(m["aluno_matricula"] == sample_aluno.matricula for m in data)


def test_filtrar_metas_aluno_por_status(client, auth_headers, sample_aluno, db_session):
    """Filtrar metas de aluno por status."""
    meta = models.AlunoMeta(
        aluno_matricula=sample_aluno.matricula,
        meta_frequencia=90.0,
        meta_media=8.0,
        data_limite=_daqui_a(30),
        status="ATINGIDA",
        data_atingimento=_hoje(),
    )
    db_session.add(meta)
    db_session.commit()

    response = client.get(
        f"/alunos/{sample_aluno.matricula}/metas?status=ATINGIDA",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert all(m["status"] == "ATINGIDA" for m in data)


def test_criar_meta_aluno_inexistente(client, auth_headers):
    """Criar meta para aluno inexistente retorna 404."""
    payload = {
        "meta_frequencia": 80.0,
        "meta_media": 7.0,
        "data_limite": str(_daqui_a(30)),
    }
    response = client.post("/alunos/999999/metas", headers=auth_headers, json=payload)

    assert response.status_code == 404
    assert "aluno" in response.json()["detail"].lower()


def test_atualizar_meta_aluno(client, auth_headers, sample_aluno, db_session):
    """Atualizar meta de aluno."""
    meta = models.AlunoMeta(
        aluno_matricula=sample_aluno.matricula,
        meta_frequencia=70.0,
        meta_media=6.0,
        data_limite=_daqui_a(30),
        status="PENDENTE",
    )
    db_session.add(meta)
    db_session.commit()
    db_session.refresh(meta)

    payload = {"status": "ATINGIDA", "data_atingimento": str(_hoje())}
    response = client.put(f"/metas-aluno/{meta.id}", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ATINGIDA"
    assert data["data_atingimento"] == str(_hoje())


def test_atualizar_meta_aluno_inexistente(client, auth_headers):
    """Atualizar meta inexistente retorna 404."""
    payload = {"status": "ATINGIDA"}
    response = client.put("/metas-aluno/999999", headers=auth_headers, json=payload)

    assert response.status_code == 404
    assert "meta" in response.json()["detail"].lower()


# ============================================================
# DASHBOARD
# ============================================================


def test_dashboard_metas_cumprimento(client, auth_headers, sample_aluno, db_session):
    """Dashboard de metas de cumprimento."""
    semestre = f"{datetime.now().year}-1"
    meta = models.MetasSemestrais(
        curso_id=sample_aluno.curso_id,
        semestre=semestre,
        meta_frequencia_geral=80.0,
        meta_media_geral=7.0,
        meta_reducao_evasao=10.0,
        meta_recuperacao=50.0,
        data_inicio=_hoje(),
        data_fim=_daqui_a(180),
        status="ATIVA",
    )
    db_session.add(meta)
    db_session.commit()

    aluno_meta = models.AlunoMeta(
        aluno_matricula=sample_aluno.matricula,
        meta_frequencia=80.0,
        meta_media=7.0,
        data_limite=_daqui_a(30),
        status="ATINGIDA",
        data_atingimento=_hoje(),
    )
    db_session.add(aluno_meta)
    db_session.commit()

    response = client.get(f"/dashboard/metas-cumprimento?semestre={semestre}", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["semestre"] == semestre
    assert data["total_cursos"] >= 1
    assert any(r["curso"] == sample_aluno.curso.nome for r in data["resultados"])


def test_dashboard_metas_cumprimento_sem_resultados(client, auth_headers):
    """Dashboard sem metas para o semestre retorna estrutura vazia."""
    response = client.get("/dashboard/metas-cumprimento?semestre=1900-1", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["semestre"] == "1900-1"
    assert data["total_cursos"] == 0
    assert data["media_cumprimento"] == 0
    assert data["resultados"] == []
