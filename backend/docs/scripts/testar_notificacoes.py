"""
Script de Teste - Notificações Telegram
SAPEE DEWAS Backend
"""

import requests

# Configurações
BASE_URL = "http://localhost:8000"
TOKEN = "SEU_TOKEN_JWT_AQUI"  # Substitua pelo seu token

# Headers
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def testar_telegram():
    """Testar envio de notificação Telegram"""
    
    print("📱 Testando notificação Telegram...\n")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/notificacoes/testar-telegram",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ SUCESSO!")
            print(f"Resposta: {response.json()}")
        else:
            print(f"❌ ERRO {response.status_code}")
            print(f"Resposta: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ ERRO: Backend não está rodando em http://localhost:8000")
    except requests.exceptions.Timeout:
        print("❌ ERRO: Timeout na requisição")
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")


def testar_alerta_frequencia(matricula: str):
    """Testar alerta de frequência"""
    
    print(f"\n📊 Testando alerta de frequência para {matricula}...\n")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/notificacoes/alerta-frequencia?matricula={matricula}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ SUCESSO!")
            print(f"Resposta: {response.json()}")
        else:
            print(f"❌ ERRO {response.status_code}")
            print(f"Resposta: {response.text}")
            
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")


def testar_alerta_geral(matricula: str):
    """Testar alerta geral de risco"""
    
    print(f"\n🚨 Testando alerta geral para {matricula}...\n")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/notificacoes/alerta-geral/{matricula}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ SUCESSO!")
            print(f"Resposta: {response.json()}")
        else:
            print(f"❌ ERRO {response.status_code}")
            print(f"Resposta: {response.text}")
            
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")


def listar_alertas():
    """Listar alertas"""
    
    print("\n📋 Listando alertas...\n")
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/notificacoes/alertas?nivel=ALTO&limit=10",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Total de alertas: {data.get('total', 0)}")
            
            for alerta in data.get('alertas', []):
                print(f"\n  • {alerta['aluno']['nome']} ({alerta['aluno']['matricula']})")
                print(f"    Curso: {alerta['aluno']['curso']}")
                print(f"    Risco: {alerta['risco_evasao']:.1f}% - {alerta['nivel_risco']}")
        else:
            print(f"❌ ERRO {response.status_code}")
            print(f"Resposta: {response.text}")
            
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")


if __name__ == "__main__":
    print("=" * 60)
    print("📱 SISTEMA DE TESTE - NOTIFICAÇÕES TELEGRAM")
    print("=" * 60)
    
    # Testar envio
    testar_telegram()
    
    # Testar alertas (substitua pelas matrículas reais)
    # testar_alerta_frequencia("2024101002")
    # testar_alerta_geral("2024101002")
    
    # Listar alertas
    listar_alertas()
    
    print("\n" + "=" * 60)
    print("✅ Testes concluídos!")
    print("=" * 60)
