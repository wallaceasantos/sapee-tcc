"""
Testes para o módulo de cursos.
"""


def test_listar_cursos(client, auth_headers, sample_aluno):
    """Listar cursos deve retornar pelo menos o curso criado pela fixture."""
    response = client.get("/cursos", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any("Teste" in curso["nome"] for curso in data)
