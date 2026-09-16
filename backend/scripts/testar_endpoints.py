# --- Bootstrap de execucao (injetado): garante imports do backend e carrega o .env ---
import os as _os
import sys as _sys

_BACKEND_DIR = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _BACKEND_DIR not in _sys.path:
    _sys.path.insert(0, _BACKEND_DIR)
try:
    from dotenv import load_dotenv as _load_dotenv

    _load_dotenv(_os.path.join(_BACKEND_DIR, ".env"))
except Exception:
    pass
# --- fim do bootstrap ---

"""
🧪 SCRIPT DE TESTE - ENDPOINTS SAPEE DEWAS
Testa todos os endpoints principais do sistema

Execução:
    python backend/testar_endpoints.py
"""

import json
from datetime import datetime

import requests

BASE_URL = "http://localhost:8000"


def testar_endpoint(nome, url, metodo="GET", dados=None, headers=None, parse_json_if_possible=True):
    """Testa um endpoint específico"""
    print(f"\n{'='*60}")
    print(f"📍 Testando: {nome}")
    print(f"🔗 URL: {url}")
    print(f"📝 Método: {metodo}")
    print(f"{'='*60}")

    try:
        if metodo == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif metodo == "POST":
            response = requests.post(url, json=dados, headers=headers, timeout=10)
        else:
            print(f"❌ Método HTTP não suportado: {metodo}")
            return False

        status = response.status_code

        if status == 200:
            print(f"✅ Status: {status} OK")
            if response.text and parse_json_if_possible:
                try:
                    dados = response.json()
                    print(f"📊 Dados: {json.dumps(dados, indent=2)[:500]}...")
                except Exception:
                    print("📊 Dados: (não-JSON / ignorado)")
            return True
        else:
            print(f"❌ Status: {status}")
            print(f"📝 Erro: {response.text[:200]}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"❌ ERRO: Servidor não está rodando em {BASE_URL}")
        print("💡 Execute: python -m uvicorn main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")
        return False


def main():
    print("=" * 80)
    print("🧪 TESTE DE ENDPOINTS - SAPEE DEWAS")
    print("=" * 80)

    token = None

    # Login (precisa do token para endpoints protegidos)
    print("\n" + "=" * 80)
    print("🔐 Autenticando (login)...")
    print("=" * 80)

    login_payload = {"email": "admin@dewas.com.br", "senha": "admin123"}
    try:
        login_resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload, timeout=10)
        if login_resp.status_code == 200:
            login_data = login_resp.json()
            token = login_data.get("access_token")
            print("✅ Login OK")
            print("🔑 Token obtido:", "sim" if token else "não")
        else:
            print(f"❌ Login falhou: {login_resp.status_code}")
            print("📝 Erro:", login_resp.text[:200])
    except Exception as e:
        print(f"❌ Erro no login: {str(e)}")

    auth_headers = {"Authorization": f"Bearer {token}"} if token else None
    if not auth_headers:
        print("❌ Sem token: abortando testes protegidos.")
        return

    resultados = []

    # 1) Health/seed básico + endpoints previamente críticos
    endpoints_basicos = [
        ("Health Check (docs - HTML)", f"{BASE_URL}/docs", "GET", None, False),
        ("Dashboard Stats (protegido)", f"{BASE_URL}/dashboard/stats", "GET", auth_headers, True),
        (
            "Listar Alunos (protegido)",
            f"{BASE_URL}/alunos?skip=0&limit=10",
            "GET",
            auth_headers,
            True,
        ),
        ("Listar Cursos (protegido)", f"{BASE_URL}/cursos", "GET", auth_headers, True),
        (
            "Intervenções Stats (protegido)",
            f"{BASE_URL}/dashboard/intervencoes-stats",
            "GET",
            auth_headers,
            True,
        ),
        (
            "Faltas Stats (protegido)",
            f"{BASE_URL}/dashboard/faltas-stats",
            "GET",
            auth_headers,
            True,
        ),
        (
            "Questionário Perguntas (público)",
            f"{BASE_URL}/questionario/perguntas",
            "GET",
            None,
            True,
        ),
    ]

    for nome, url, metodo, headers, parse_json_if_possible in endpoints_basicos:
        if metodo == "GET":
            resultado = testar_endpoint(
                nome=nome,
                url=url,
                metodo=metodo,
                headers=headers,
                parse_json_if_possible=parse_json_if_possible,
            )
        else:
            resultado = testar_endpoint(nome, url, metodo, dados=None, headers=headers)

        resultados.append((nome, resultado))

    # 2) Preparar dados para testes de escrita (thorough testing)
    # 2.1 buscar 1 aluno
    aluno = None
    try:
        resp = requests.get(f"{BASE_URL}/alunos?skip=0&limit=1", headers=auth_headers, timeout=10)
        if resp.status_code == 200:
            lista = resp.json()
            aluno = lista[0] if lista else None
    except Exception:
        aluno = None

    # 2.2 buscar 1 disciplina
    disciplina = None
    try:
        resp = requests.get(
            f"{BASE_URL}/disciplinas?ativas_only=true", headers=auth_headers, timeout=10
        )
        if resp.status_code == 200:
            lista = resp.json()
            disciplina = lista[0] if lista else None
    except Exception:
        disciplina = None

    today = datetime.now().date().isoformat()

    if not aluno or not disciplina:
        print(
            "⚠️ Não foi possível obter aluno e disciplina para testar escrita. Pulando testes de POST/PUT."
        )
    else:
        matricula = aluno.get("matricula")
        disciplina_id = disciplina.get("id")
        disciplina_nome = disciplina.get("nome")

        print("\n" + "=" * 80)
        print("🧪 Testes de escrita (cycle crítico)")
        print("=" * 80)

        # 3) Registrar falta diária
        # POST /alunos/{matricula}/faltas
        falta_payload = {
            "disciplina": disciplina_nome,
            "disciplina_id": disciplina_id,
            "data": today,
            "justificada": False,
            "motivo_justificativa": None,
        }

        try:
            faltas_url = f"{BASE_URL}/alunos/{matricula}/faltas"
            resp = requests.post(
                faltas_url,
                json=falta_payload,
                headers={**auth_headers, "Content-Type": "application/json"},
                timeout=10,
            )
            if resp.status_code == 200:
                print("✅ Falta registrada (POST /alunos/{matricula}/faltas)")
                resultados.append(("POST registrar falta", True))
            else:
                print(f"❌ Falha ao registrar falta: {resp.status_code} {resp.text[:200]}")
                resultados.append(("POST registrar falta", False))
        except Exception as e:
            print(f"❌ Erro ao registrar falta: {str(e)}")
            resultados.append(("POST registrar falta", False))

        # 4) Verificar faltas consecutivas (GET)
        try:
            resp = requests.get(
                f"{BASE_URL}/alunos/{matricula}/faltas-consecutivas",
                headers=auth_headers,
                timeout=10,
            )
            if resp.status_code == 200:
                print("✅ Faltas consecutivas retornaram OK")
                resultados.append(("GET faltas-consecutivas", True))
            else:
                print(f"❌ Erro GET faltas-consecutivas: {resp.status_code} {resp.text[:200]}")
                resultados.append(("GET faltas-consecutivas", False))
        except Exception:
            resultados.append(("GET faltas-consecutivas", False))

        # 5) Criar intervenção (POST /alunos/{matricula}/intervencoes)
        intervencao_payload = {
            "tipo": "RISCO_EVASAO",
            "descricao": "Teste TCC - Intervencao criada via script",
            "status": "RASCUNHO",
            "prioridade": "ALTA",
            "data_intervencao": today,
        }

        intervencao_id = None
        try:
            resp = requests.post(
                f"{BASE_URL}/alunos/{matricula}/intervencoes",
                json=intervencao_payload,
                headers={**auth_headers, "Content-Type": "application/json"},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                intervencao_id = data.get("id")
                print(f"✅ Intervenção criada (id={intervencao_id})")
                resultados.append(("POST criar intervenção", True))
            else:
                print(f"❌ Erro criar intervenção: {resp.status_code} {resp.text[:200]}")
                resultados.append(("POST criar intervenção", False))
        except Exception as e:
            print(f"❌ Erro criando intervenção: {str(e)}")
            resultados.append(("POST criar intervenção", False))

        # 6) Aprovar intervenção (POST /intervencoes/{id}/aprovar) e validar GET
        if intervencao_id:
            try:
                resp = requests.post(
                    f"{BASE_URL}/intervencoes/{intervencao_id}/aprovar",
                    headers=auth_headers,
                    timeout=10,
                )
                if resp.status_code == 200:
                    print("✅ Intervenção aprovada")
                    resultados.append(("POST aprovar intervenção", True))
                else:
                    print(f"❌ Erro aprovar intervenção: {resp.status_code} {resp.text[:200]}")
                    resultados.append(("POST aprovar intervenção", False))
            except Exception:
                resultados.append(("POST aprovar intervenção", False))

            # GET intervenção
            try:
                resp = requests.get(
                    f"{BASE_URL}/intervencoes/{intervencao_id}", headers=auth_headers, timeout=10
                )
                if resp.status_code == 200:
                    print("✅ GET intervenção OK")
                    resultados.append(("GET intervenção por id", True))
                else:
                    print(f"❌ GET intervenção falhou: {resp.status_code} {resp.text[:200]}")
                    resultados.append(("GET intervenção por id", False))
            except Exception:
                resultados.append(("GET intervenção por id", False))

        # 7) Confirmar que relatórios/análises não quebram após escrita
        try:
            resp = requests.get(f"{BASE_URL}/relatorios/eficacia", headers=auth_headers, timeout=10)
            if resp.status_code == 200:
                print("✅ Relatório eficácia OK")
                resultados.append(("GET relatorios/eficacia", True))
            else:
                print(f"❌ GET relatorios/eficacia falhou: {resp.status_code} {resp.text[:200]}")
                resultados.append(("GET relatorios/eficacia", False))
        except Exception:
            resultados.append(("GET relatorios/eficacia", False))

    # Resumo final
    print("\n" + "=" * 80)
    print("📊 RESUMO DOS TESTES (Thorough)")
    print("=" * 80)

    for nome, resultado in resultados:
        status = "✅" if resultado else "❌"
        print(f"{status} {nome}")

    total = len(resultados)
    aprovados = sum(1 for _, r in resultados if r)

    print(f"\nTotal: {aprovados}/{total} endpoints/ações funcionando")
    print("=" * 80)

    if aprovados == total:
        print("🎉 Thorough testing concluído com sucesso!")
    else:
        print("⚠️ Alguns testes falharam. Verifique os logs acima.")


if __name__ == "__main__":
    main()
