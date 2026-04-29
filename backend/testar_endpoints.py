"""
🧪 SCRIPT DE TESTE - ENDPOINTS SAPEE DEWAS
Testa todos os endpoints principais do sistema

Execução:
    python backend/testar_endpoints.py
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def testar_endpoint(nome, url, metodo="GET", dados=None, headers=None):
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
        
        status = response.status_code
        
        if status == 200:
            print(f"✅ Status: {status} OK")
            if response.text:
                dados = response.json()
                print(f"📊 Dados: {json.dumps(dados, indent=2)[:500]}...")
            return True
        else:
            print(f"❌ Status: {status}")
            print(f"📝 Erro: {response.text[:200]}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ ERRO: Servidor não está rodando em {BASE_URL}")
        print(f"💡 Execute: python -m uvicorn main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")
        return False

def main():
    print("="*80)
    print("🧪 TESTE DE ENDPOINTS - SAPEE DEWAS")
    print("="*80)
    
    # Testar endpoints públicos
    endpoints = [
        ("Health Check", f"{BASE_URL}/docs", "GET"),
        ("Login (Health)", f"{BASE_URL}/auth/login", "POST", {"email": "test@test.com", "senha": "test"}),
        ("Dashboard Stats", f"{BASE_URL}/dashboard/stats", "GET"),
        ("Listar Alunos", f"{BASE_URL}/alunos?skip=0&limit=10", "GET"),
        ("Listar Cursos", f"{BASE_URL}/cursos", "GET"),
        ("Intervenções Stats", f"{BASE_URL}/dashboard/intervencoes-stats", "GET"),
        ("Faltas Stats", f"{BASE_URL}/dashboard/faltas-stats", "GET"),
        ("Questionário Perguntas", f"{BASE_URL}/questionario/perguntas", "GET"),
    ]
    
    resultados = []
    
    for endpoint in endpoints:
        if len(endpoint) == 3:
            nome, url, metodo = endpoint
            resultado = testar_endpoint(nome, url, metodo)
        else:
            nome, url, metodo, dados = endpoint
            resultado = testar_endpoint(nome, url, metodo, dados)
        
        resultados.append((nome, resultado))
    
    # Resumo
    print("\n" + "="*80)
    print("📊 RESUMO DOS TESTES")
    print("="*80)
    
    for nome, resultado in resultados:
        status = "✅" if resultado else "❌"
        print(f"{status} {nome}")
    
    total = len(resultados)
    aprovados = sum(1 for _, r in resultados if r)
    
    print(f"\nTotal: {aprovados}/{total} endpoints funcionando")
    print("="*80)
    
    if aprovados == total:
        print("🎉 Todos os endpoints estão funcionando!")
    else:
        print("⚠️  Alguns endpoints estão com problemas.")
        print("💡 Verifique os erros acima e reinicie o servidor.")

if __name__ == "__main__":
    main()
