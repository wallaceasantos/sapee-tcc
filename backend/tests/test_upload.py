"""
Testes de integração para upload e importação CSV de alunos.

A importação é assíncrona: o POST retorna um `job_id` e o resultado é
consultado em `/alunos/importar-csv/progress/{job_id}`.
"""

import io
import time

import models


def _post_csv(client, headers, content, filename="alunos.csv", content_type="text/csv"):
    """Envia um arquivo CSV para importação (POST)."""
    if isinstance(content, str):
        content = content.encode("utf-8")
    return client.post(
        "/alunos/importar-csv",
        headers=headers,
        files={"file": (filename, io.BytesIO(content), content_type)},
    )


def _aguardar_job(client, headers, job_id, timeout=20):
    """Aguarda o job de importação concluir e retorna o resultado."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        resp = client.get(f"/alunos/importar-csv/progress/{job_id}", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") in ("concluido", "erro"):
                return data
        time.sleep(0.05)
    raise AssertionError(f"Job {job_id} não concluiu em {timeout}s")


def _importar_e_aguardar(client, headers, content, filename="alunos.csv", content_type="text/csv"):
    """Executa a importação assíncrona completa e devolve o resultado final."""
    resp = _post_csv(client, headers, content, filename, content_type)
    assert resp.status_code == 200, resp.text
    job_id = resp.json()["job_id"]
    return _aguardar_job(client, headers, job_id)


def test_upload_csv_valido_importa_alunos(client, auth_headers, db_session):
    """Importação CSV válida deve criar alunos no banco."""
    curso = models.Curso(nome="Curso CSV Teste", modalidade="Integrado")
    db_session.add(curso)
    db_session.commit()

    csv_content = (
        "matricula,nome,email,curso,periodo,turno\n"
        "2024100,João da Silva,joao@teste.com,Curso CSV Teste,1,MATUTINO\n"
        "2024101,Maria Souza,maria@teste.com,Curso CSV Teste,2,VESPERTINO\n"
    )

    data = _importar_e_aguardar(client, auth_headers, csv_content)
    assert data["status"] == "concluido"
    assert data["importados"] == 2
    assert data["erros"] == 0

    aluno1 = db_session.query(models.Aluno).filter(models.Aluno.matricula == "2024100").first()
    aluno2 = db_session.query(models.Aluno).filter(models.Aluno.matricula == "2024101").first()
    assert aluno1 is not None
    assert aluno2 is not None
    assert aluno1.nome == "João da Silva"
    assert aluno2.turno.value == "VESPERTINO"


def test_upload_csv_curso_inexistente(client, auth_headers):
    """CSV com curso inexistente deve registrar erro por linha, sem importar alunos."""
    csv_content = "matricula,nome,email,curso\n2024200,Pedro,pedro@teste.com,Curso Que Nao Existe\n"

    data = _importar_e_aguardar(client, auth_headers, csv_content)
    assert data["importados"] == 0
    assert data["erros"] == 1
    assert any("não encontrado" in e.lower() for e in data["erros_detalhes"])


def test_upload_csv_sem_header_obrigatorio(client, auth_headers):
    """CSV sem 'matricula' e 'nome' no cabeçalho deve ser rejeitado com 400."""
    response = _post_csv(client, auth_headers, "email,idade\njoao@teste.com,20\n", filename="dados.csv")

    assert response.status_code == 400
    assert "cabecalho" in response.json()["detail"].lower()


def test_upload_arquivo_html_mascarado(client, auth_headers):
    """Arquivo HTML enviado como CSV deve ser rejeitado por segurança."""
    response = _post_csv(client, auth_headers, "<html><body>hack</body></html>", filename="hack.csv")

    assert response.status_code == 400
    assert "conteudo invalido" in response.json()["detail"].lower()


def test_upload_tipo_mime_invalido(client, auth_headers):
    """Arquivo com MIME type não-CSV deve ser rejeitado antes da validação de extensão."""
    response = _post_csv(
        client, auth_headers, "matricula,nome\n2024300,João\n", filename="dados.txt", content_type="text/plain"
    )

    assert response.status_code == 400
    assert "tipo de arquivo" in response.json()["detail"].lower()


def test_upload_csv_muito_grande(client, auth_headers):
    """Arquivo maior que 10MB deve ser rejeitado com 413."""
    csv_content = "matricula,nome,email,curso\n" + "".join(
        f"2024{i:06d},Aluno {i},aluno{i}@teste.com,Curso\n" for i in range(300_000)
    )

    response = _post_csv(client, auth_headers, csv_content, filename="mega.csv")

    assert response.status_code == 413
    assert "10mb" in response.json()["detail"].lower()


def test_upload_csv_matricula_duplicada(client, auth_headers, db_session):
    """Matrícula já existente deve gerar erro, não duplicar registro."""
    curso = models.Curso(nome="Curso Dup", modalidade="Integrado")
    db_session.add(curso)
    db_session.commit()

    # Primeira importação
    r1 = _importar_e_aguardar(
        client, auth_headers, "matricula,nome,email,curso\n2024400,João,joao@teste.com,Curso Dup\n"
    )
    assert r1["importados"] == 1

    # Segunda importação com mesma matrícula
    r2 = _importar_e_aguardar(
        client, auth_headers, "matricula,nome,email,curso\n2024400,João Duplicado,joao2@teste.com,Curso Dup\n"
    )
    assert r2["importados"] == 0
    assert r2["erros"] == 1
    assert any("já existe" in e.lower() for e in r2["erros_detalhes"])
