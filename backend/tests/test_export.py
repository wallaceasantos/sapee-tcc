"""
Testes para exportação de relatórios em Excel (.xlsx) e PDF.
"""


def test_export_alunos_risco_xlsx(client, auth_headers):
    """Exportação em Excel deve retornar um arquivo .xlsx válido."""
    response = client.get(
        "/relatorios/gerenciais/alunos-risco/export?formato=xlsx",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert response.content[:2] == b"PK"  # assinatura ZIP dos arquivos .xlsx
    assert "attachment" in response.headers["content-disposition"]


def test_export_alunos_risco_pdf(client, auth_headers):
    """Exportação em PDF deve retornar um arquivo PDF válido."""
    response = client.get(
        "/relatorios/gerenciais/alunos-risco/export?formato=pdf",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b"%PDF"
    assert "attachment" in response.headers["content-disposition"]


def test_export_formato_invalido(client, auth_headers):
    """Formato não suportado deve retornar 400."""
    response = client.get(
        "/relatorios/gerenciais/alunos-risco/export?formato=docx",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert "formato" in response.json()["detail"].lower()
