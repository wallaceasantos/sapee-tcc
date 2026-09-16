"""
Testes para o módulo de audit logs.
"""

import models


def test_listar_audit_logs(client, auth_headers, admin_user):
    """Listar logs de auditoria."""
    response = client.get("/audit-logs", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_listar_audit_logs_com_filtro(client, auth_headers, admin_user, db_session):
    """Filtrar logs por ação."""
    log = models.AuditLog(
        usuario_id=admin_user.id,
        acao="TESTE_FILTRO",
        detalhes="Log de teste",
        ip_address="127.0.0.1",
    )
    db_session.add(log)
    db_session.commit()

    response = client.get("/audit-logs?acao=TESTE_FILTRO", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["acao"] == "TESTE_FILTRO"


def test_criar_audit_log(client, auth_headers, admin_user):
    """Criar log de auditoria."""
    payload = {
        "acao": "ACAO_TESTE",
        "detalhes": "Detalhes do teste",
        "ip_address": "127.0.0.1",
    }

    response = client.post("/audit-logs", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["acao"] == "ACAO_TESTE"
    assert data["usuario_id"] == admin_user.id
