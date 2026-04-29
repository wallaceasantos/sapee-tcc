"""
Script para testar criação de intervenção
"""
import requests
import json

# Configurações
BASE_URL = "http://localhost:8000"
EMAIL = "admin@dewas.com.br"
SENHA = "admin123"
MATRICULA = "2024101001"

# Login
print("📝 Fazendo login...")
login_response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": EMAIL,
    "senha": SENHA
})

if login_response.status_code != 200:
    print(f"❌ Erro no login: {login_response.status_code}")
    exit(1)

token = login_response.json()["access_token"]
print("✅ Login realizado com sucesso!")

# Criar intervenção
print("\n📝 Criando intervenção...")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

data = {
    "tipo": "Reunião com Aluno",
    "descricao": "Teste de intervenção via script",
    "status": "PENDENTE",
    "prioridade": "MEDIA",
    "data_intervencao": "2026-03-13"
}

response = requests.post(
    f"{BASE_URL}/alunos/{MATRICULA}/intervencoes",
    headers=headers,
    json=data
)

print(f"Status: {response.status_code}")

if response.status_code == 200:
    print("✅ Intervenção criada com sucesso!")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
else:
    print(f"❌ Erro ao criar intervenção")
    print(f"Resposta: {response.text}")
