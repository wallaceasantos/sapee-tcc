"""
Testes para a lógica de ML v2 (calcular_risco_evasao).
"""

import models
from ml_logic_v2 import PESOS_FATORES, LIMIARES_RISCO, calcular_risco_evasao


def test_ml_config_carregada():
    assert isinstance(PESOS_FATORES, dict)
    assert "score_base" in PESOS_FATORES
    assert "frequencia_baixa_60" in PESOS_FATORES
    assert isinstance(LIMIARES_RISCO, dict)
    assert "baixo_max" in LIMIARES_RISCO
    assert "medio_max" in LIMIARES_RISCO
    assert "alto_max" in LIMIARES_RISCO


def test_calcular_risco_aluno_saudavel(db_session):
    curso = db_session.query(models.Curso).first()
    if not curso:
        curso = models.Curso(nome="Curso ML Teste", modalidade="Integrado")
        db_session.add(curso)
        db_session.commit()

    aluno = models.Aluno(
        matricula="9999001",
        nome="Aluno Saudavel ML",
        email="saudavel@teste.com",
        curso_id=curso.id,
        periodo=3,
        turno=models.Turno.MATUTINO,
        media_geral=8.5,
        frequencia=92.0,
        historico_reprovas=0,
        renda_familiar=3000.0,
        trabalha=False,
        possui_computador=True,
        possui_internet=True,
        tempo_deslocamento=20,
        ano_ingresso=2023,
    )
    db_session.add(aluno)
    db_session.commit()

    resultado = calcular_risco_evasao(aluno, db_session)

    assert "risco_evasao" in resultado
    assert "nivel_risco" in resultado
    assert "fatores_principais" in resultado
    assert resultado["risco_evasao"] <= 30
    assert resultado["nivel_risco"] in [models.NivelRisco.BAIXO]


def test_calcular_risco_aluno_critico(db_session):
    curso = db_session.query(models.Curso).first()
    if not curso:
        curso = models.Curso(nome="Curso ML Teste", modalidade="Integrado")
        db_session.add(curso)
        db_session.commit()

    aluno = models.Aluno(
        matricula="9999002",
        nome="Aluno Critico ML",
        email="critico@teste.com",
        curso_id=curso.id,
        periodo=5,
        turno=models.Turno.NOTURNO,
        media_geral=3.2,
        frequencia=45.0,
        historico_reprovas=4,
        renda_familiar=800.0,
        trabalha=True,
        carga_horaria_trabalho=44,
        possui_computador=False,
        possui_internet=False,
        tempo_deslocamento=130,
        custo_transporte_diario=15.0,
        dificuldade_acesso="MUITO_DIFICIL",
        beneficiario_bolsa_familia=True,
        primeiro_geracao_universidade=True,
        ano_ingresso=2021,
    )
    db_session.add(aluno)
    db_session.commit()

    resultado = calcular_risco_evasao(aluno, db_session)

    assert resultado["risco_evasao"] > 50
    assert resultado["nivel_risco"] in [models.NivelRisco.ALTO, models.NivelRisco.MUITO_ALTO]
    assert len(resultado["fatores_principais"]) > 0


def test_calcular_risco_aluno_medio(db_session):
    curso = db_session.query(models.Curso).first()

    aluno = models.Aluno(
        matricula="9999003",
        nome="Aluno Medio ML",
        email="medio@teste.com",
        curso_id=curso.id,
        periodo=3,
        turno=models.Turno.VESPERTINO,
        media_geral=5.5,
        frequencia=72.0,
        historico_reprovas=1,
        renda_familiar=1200.0,
        trabalha=True,
        carga_horaria_trabalho=25,
        possui_computador=True,
        possui_internet=True,
        tempo_deslocamento=70,
        ano_ingresso=2023,
    )
    db_session.add(aluno)
    db_session.commit()

    resultado = calcular_risco_evasao(aluno, db_session)

    assert resultado["risco_evasao"] >= 25
    assert resultado["nivel_risco"] in [models.NivelRisco.MEDIO, models.NivelRisco.ALTO]


def test_score_nunca_negativo(db_session):
    curso = db_session.query(models.Curso).first()

    aluno = models.Aluno(
        matricula="9999004",
        nome="Aluno Excelente",
        email="excelente@teste.com",
        curso_id=curso.id,
        periodo=2,
        turno=models.Turno.MATUTINO,
        media_geral=9.8,
        frequencia=98.0,
        historico_reprovas=0,
        renda_familiar=5000.0,
        trabalha=False,
        possui_computador=True,
        possui_internet=True,
        tempo_deslocamento=10,
        ano_ingresso=2024,
    )
    db_session.add(aluno)
    db_session.commit()

    resultado = calcular_risco_evasao(aluno, db_session)

    assert resultado["risco_evasao"] >= 0
    assert resultado["risco_evasao"] <= 100
