"""
Testes para importacao de CSV e operacoes em massa.
"""

import io

import models
from fastapi.testclient import TestClient


def test_delete_multiple_vazio(client: TestClient, auth_headers):
    response = client.post("/alunos/delete-multiple", json=[], headers=auth_headers)
    assert response.status_code == 400


def test_delete_multiple_nao_encontrado(client: TestClient, auth_headers):
    response = client.post(
        "/alunos/delete-multiple",
        json=["matricula_inexistente_99999"],
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_delete_multiple_sucesso(client: TestClient, auth_headers, db_session):
    curso = db_session.query(models.Curso).first()
    if not curso:
        curso = models.Curso(nome="Curso Import Teste", modalidade="Integrado")
        db_session.add(curso)
        db_session.commit()

    aluno = models.Aluno(
        matricula="9999101",
        nome="Aluno Delete 1",
        email="del1@teste.com",
        curso_id=curso.id,
        periodo=1,
        turno=models.Turno.MATUTINO,
        media_geral=7.0,
        frequencia=80.0,
        ano_ingresso=2024,
    )
    db_session.add(aluno)
    db_session.commit()

    response = client.post(
        "/alunos/delete-multiple",
        json=["9999101"],
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["excluidos"] == 1


def test_import_csv_arquivo_invalido(client: TestClient, auth_headers):
    file_content = io.BytesIO(b"conteudo invalido sem cabecalho csv")
    response = client.post(
        "/alunos/importar-csv",
        files={"file": ("teste.txt", file_content, "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code in [400, 422]


def test_import_csv_conteudo_html(client: TestClient, auth_headers):
    csv_content = (
        b'<html><body><script>alert("xss")</script></body></html>'
    )
    file_content = io.BytesIO(csv_content)
    response = client.post(
        "/alunos/importar-csv",
        files={"file": ("teste.csv", file_content, "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_import_csv_sem_cabecalho(client: TestClient, auth_headers):
    csv_content = b"dado1;dado2\nteste1;teste2"
    file_content = io.BytesIO(csv_content)
    response = client.post(
        "/alunos/importar-csv",
        files={"file": ("alunos.csv", file_content, "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_import_csv_progress_inexistente(client: TestClient):
    response = client.get("/alunos/importar-csv/progress/job_inexistente")
    assert response.status_code == 404
