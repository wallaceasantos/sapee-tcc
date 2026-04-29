#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de Verificação Estática Completa - SAPEE DEWAS
Verifica todos os arquivos alterados nas correções de prioridade alta.

Autor: SAPEE Development Team
Data: 24 de abril de 2026
"""

import os
import sys
import ast
import json
from pathlib import Path

# Cores para output
class Cores:
    VERDE = '\033[92m'
    VERMELHO = '\033[91m'
    AMARELO = '\033[93m'
    AZUL = '\033[94m'
    RESET = '\033[0m'
    NEGRITO = '\033[1m'

def print_header(titulo):
    print(f"\n{'='*80}")
    print(f"{Cores.AZUL}{Cores.NEGRITO}{titulo}{Cores.RESET}")
    print(f"{'='*80}\n")

def print_sucesso(mensagem):
    print(f"{Cores.VERDE}✅ {mensagem}{Cores.RESET}")

def print_erro(mensagem):
    print(f"{Cores.VERMELHO}❌ {mensagem}{Cores.RESET}")

def print_aviso(mensagem):
    print(f"{Cores.AMARELO}⚠️  {mensagem}{Cores.RESET}")

def print_info(mensagem):
    print(f"{Cores.AZUL}ℹ️  {mensagem}{Cores.RESET}")

# Diretório raiz do projeto
DIR_RAIZ = Path(__file__).parent.parent
BACKEND_DIR = DIR_RAIZ / "backend"
SRC_DIR = DIR_RAIZ / "src"

# Lista de arquivos alterados
ARQUIVOS_PY = [
    "backend/models.py",
    "backend/schemas.py",
    "backend/main.py",
]

ARQUIVOS_TS = [
    "src/types/index.ts",
    "src/services/api.ts",
    "src/pages/Relatorios.tsx",
    "src/pages/AlunoDetail.tsx",
    "src/pages/Egressos.tsx",
]

# ============================================
# VERIFICAÇÃO 1: Sintaxe Python
# ============================================
def verificar_sintaxe_python():
    print_header("1. VERIFICAÇÃO DE SINTAXE PYTHON")
    
    erros = 0
    sucessos = 0
    
    for arquivo_rel in ARQUIVOS_PY:
        caminho = BACKEND_DIR / arquivo_rel.replace("backend/", "")
        
        if not caminho.exists():
            print_erro(f"Arquivo não encontrado: {caminho}")
            erros += 1
            continue
        
        try:
            with open(caminho, 'r', encoding='utf-8') as f:
                codigo = f.read()
            
            ast.parse(codigo)
            print_sucesso(f"{arquivo_rel} - Sintaxe OK")
            sucessos += 1
            
        except SyntaxError as e:
            print_erro(f"{arquivo_rel} - ERRO DE SINTAXE:")
            print(f"   Linha {e.lineno}: {e.msg}")
            erros += 1
        except Exception as e:
            print_erro(f"{arquivo_rel} - ERRO: {str(e)}")
            erros += 1
    
    print(f"\n{Cores.NEGRITO}Resultado: {sucessos} OK, {erros} ERROS{Cores.RESET}")
    return erros == 0

# ============================================
# VERIFICAÇÃO 2: Imports TypeScript
# ============================================
def verificar_imports_typescript():
    print_header("2. VERIFICAÇÃO DE IMPORTS TYPESCRIPT")
    
    erros = 0
    sucessos = 0
    
    # Verificar se api.ts existe e api-v2.ts NÃO existe
    api_ts = SRC_DIR / "services" / "api.ts"
    api_v2_ts = SRC_DIR / "services" / "api-v2.ts"
    
    if api_ts.exists():
        print_sucesso("api.ts existe")
        sucessos += 1
    else:
        print_erro("api.ts NÃO encontrado!")
        erros += 1
    
    if not api_v2_ts.exists():
        print_sucesso("api-v2.ts foi removido corretamente")
        sucessos += 1
    else:
        print_erro("api-v2.ts AINDA EXISTE (deveria ter sido removido)")
        erros += 1
    
    # Verificar imports nos arquivos
    imports_verificar = [
        ("src/pages/Relatorios.tsx", "api"),
        ("src/pages/AlunoDetail.tsx", "api"),
    ]
    
    for arquivo_rel, import_esperado in imports_verificar:
        caminho = SRC_DIR / arquivo_rel.replace("src/", "")
        
        if not caminho.exists():
            print_erro(f"Arquivo não encontrado: {caminho}")
            erros += 1
            continue
        
        with open(caminho, 'r', encoding='utf-8') as f:
            conteudo = f.read()
        
        if f"from '../services/{import_esperado}'" in conteudo or \
           f'from "../services/{import_esperado}"' in conteudo:
            print_sucesso(f"{arquivo_rel} - Import correto ({import_esperado})")
            sucessos += 1
        else:
            print_erro(f"{arquivo_rel} - Import INCORRETO (deveria ser '{import_esperado}')")
            erros += 1
    
    # Verificar que nenhum arquivo importa api-v2
    print_info("Verificando que nenhum arquivo importa api-v2...")
    
    arquivos_para_verificar = list(SRC_DIR.glob("**/*.tsx")) + list(SRC_DIR.glob("**/*.ts"))
    arquivos_para_verificar = [f for f in arquivos_para_verificar if 'node_modules' not in str(f)]
    
    importa_v2 = False
    for arquivo in arquivos_para_verificar:
        try:
            with open(arquivo, 'r', encoding='utf-8') as f:
                conteudo = f.read()
            
            if 'api-v2' in conteudo:
                print_erro(f"{arquivo.relative_to(SRC_DIR)} AINDA importa api-v2!")
                erros += 1
                importa_v2 = True
        except:
            pass
    
    if not importa_v2:
        print_sucesso("Nenhum arquivo importa api-v2 ✅")
        sucessos += 1
    
    print(f"\n{Cores.NEGRITO}Resultado: {sucessos} OK, {erros} ERROS{Cores.RESET}")
    return erros == 0

# ============================================
# VERIFICAÇÃO 3: Estrutura do Backend
# ============================================
def verificar_estrutura_backend():
    print_header("3. VERIFICAÇÃO DE ESTRUTURA DO BACKEND")
    
    erros = 0
    sucessos = 0
    
    # Verificar arquivos essenciais
    arquivos_essenciais = [
        "backend/main.py",
        "backend/models.py",
        "backend/schemas.py",
        "backend/auth.py",
        "backend/database.py",
        "backend/ml_logic_v2.py",
        "backend/notificacoes.py",
        "backend/routes/notificacoes.py",
    ]
    
    for arquivo_rel in arquivos_essenciais:
        caminho = DIR_RAIZ / arquivo_rel
        
        if caminho.exists():
            print_sucesso(f"{arquivo_rel} existe")
            sucessos += 1
        else:
            print_erro(f"{arquivo_rel} NÃO encontrado!")
            erros += 1
    
    # Verificar campos no models.py
    print_info("Verificando campos no model Aluno...")
    
    models_path = BACKEND_DIR / "models.py"
    if models_path.exists():
        with open(models_path, 'r', encoding='utf-8') as f:
            conteudo = f.read()
        
        campos_verificar = [
            "questionario_respondido",
            "data_ultimo_questionario",
        ]
        
        for campo in campos_verificar:
            if campo in conteudo:
                print_sucesso(f"Campo '{campo}' existe no model Aluno")
                sucessos += 1
            else:
                print_erro(f"Campo '{campo}' NÃO encontrado no model Aluno!")
                erros += 1
    
    # Verificar endpoints de Egressos no main.py
    print_info("Verificando endpoints de Egressos...")
    
    main_path = BACKEND_DIR / "main.py"
    if main_path.exists():
        with open(main_path, 'r', encoding='utf-8') as f:
            conteudo = f.read()
        
        endpoints_egressos = [
            '@app.post("/egressos"',
            '@app.get("/egressos")',
            '@app.get("/egressos/{egresso_id}"',
            '@app.put("/egressos/{egresso_id}"',
            '@app.delete("/egressos/{egresso_id}"',
            '@app.get("/egressos/estatisticas"',
        ]
        
        for endpoint in endpoints_egressos:
            if endpoint in conteudo:
                print_sucesso(f"Endpoint {endpoint.split('(')[1].split(')')[0]} existe")
                sucessos += 1
            else:
                print_erro(f"Endpoint {endpoint.split('(')[1].split(')')[0]} NÃO encontrado!")
                erros += 1
    
    print(f"\n{Cores.NEGRITO}Resultado: {sucessos} OK, {erros} ERROS{Cores.RESET}")
    return erros == 0

# ============================================
# VERIFICAÇÃO 4: Arquivos Removidos
# ============================================
def verificar_arquivos_removidos():
    print_header("4. VERIFICAÇÃO DE ARQUIVOS REMOVIDOS")
    
    erros = 0
    sucessos = 0
    
    # Arquivos que DEVEM ter sido removidos
    arquivos_removidos = [
        "src/services/api-v2.ts",
        "src/pages/CadastroAlunos_backup.tsx",
    ]
    
    for arquivo_rel in arquivos_removidos:
        caminho = DIR_RAIZ / arquivo_rel
        
        if not caminho.exists():
            print_sucesso(f"{arquivo_rel} foi removido corretamente")
            sucessos += 1
        else:
            print_erro(f"{arquivo_rel} AINDA EXISTE (deveria ter sido removido)!")
            erros += 1
    
    print(f"\n{Cores.NEGRITO}Resultado: {sucessos} OK, {erros} ERROS{Cores.RESET}")
    return erros == 0

# ============================================
# VERIFICAÇÃO 5: Endpoints do Backend vs Frontend
# ============================================
def verificar_endpoints():
    print_header("5. VERIFICAÇÃO DE ENDPOINTS (Backend vs Frontend)")
    
    erros = 0
    sucessos = 0
    
    # Ler main.py para extrair endpoints
    main_path = BACKEND_DIR / "main.py"
    if not main_path.exists():
        print_erro("main.py não encontrado!")
        return False
    
    with open(main_path, 'r', encoding='utf-8') as f:
        main_content = f.read()
    
    # Endpoints críticos que devem existir
    endpoints_criticos = [
        ("/egressos", "POST"),
        ("/egressos", "GET"),
        ("/api/v1/notificacoes/alerta-geral/", "POST"),
        ("/api/v1/notificacoes/testar-telegram", "POST"),
        ("/alunos/{matricula}/frequencia-historico", "GET"),
        ("/relatorios/eficacia", "GET"),
    ]
    
    print_info("Verificando endpoints críticos no backend...")
    
    for endpoint, metodo in endpoints_criticos:
        # Verificar se endpoint existe no main.py
        if metodo == "GET" and f'@app.get("{endpoint}"' in main_content:
            print_sucesso(f"{metodo} {endpoint}")
            sucessos += 1
        elif metodo == "POST" and f'@app.post("{endpoint}"' in main_content:
            print_sucesso(f"{metodo} {endpoint}")
            sucessos += 1
        elif metodo == "PUT" and f'@app.put("{endpoint}"' in main_content:
            print_sucesso(f"{metodo} {endpoint}")
            sucessos += 1
        elif metodo == "DELETE" and f'@app.delete("{endpoint}"' in main_content:
            print_sucesso(f"{metodo} {endpoint}")
            sucessos += 1
        else:
            print_erro(f"{metodo} {endpoint} - NÃO ENCONTRADO!")
            erros += 1
    
    print(f"\n{Cores.NEGRITO}Resultado: {sucessos} OK, {erros} ERROS{Cores.RESET}")
    return erros == 0

# ============================================
# RELATÓRIO FINAL
# ============================================
def gerar_relatorio_final(resultados):
    print_header("📊 RELATÓRIO FINAL DE VERIFICAÇÃO ESTÁTICA")
    
    todos_passaram = all(resultados.values())
    
    for teste, passou in resultados.items():
        status = f"{Cores.VERDE}✅ PASSOU{Cores.RESET}" if passou else f"{Cores.VERMELHO}❌ FALHOU{Cores.RESET}"
        print(f"{teste:50} {status}")
    
    print(f"\n{'='*80}")
    
    if todos_passaram:
        print(f"{Cores.VERDE}{Cores.NEGRITO}🎉 TODAS AS VERIFICAÇÕES PASSARAM!{Cores.RESET}")
        print(f"\n{Cores.VERDE}O sistema está pronto para testes manuais.{Cores.RESET}")
        print(f"\n{Cores.AZUL}Próximos passos:{Cores.RESET}")
        print(f"  1. Rodar backend: cd backend && python -m uvicorn main:app --reload --port 8000")
        print(f"  2. Rodar frontend: npm run dev")
        print(f"  3. Acessar: http://localhost:5173")
        print(f"  4. Seguir checklist de testes manuais (gerado abaixo)")
    else:
        print(f"{Cores.VERMELHO}{Cores.NEGRITO}⚠️  ALGUMAS VERIFICAÇÕES FALHARAM!{Cores.RESET}")
        print(f"\n{Cores.VERMELHO}Corrija os erros antes de prosseguir com os testes.{Cores.RESET}")
    
    print(f"{'='*80}\n")
    
    return todos_passaram

# ============================================
# CHECKLIST DE TESTES MANUAIS
# ============================================
def gerar_checklist_manual():
    print_header("📝 CHECKLIST DE TESTES MANUAIS")
    
    checklist = """
Execute os seguintes testes MANUAIS após iniciar o sistema:

┌─────────────────────────────────────────────────────────────────┐
│ PASSO 1: INICIAR SISTEMA                                      │
├─────────────────────────────────────────────────────────────────┤
│ □ cd backend                                                    │
│ □ python -m uvicorn main:app --reload --port 8000              │
│ □ (Em outro terminal) npm run dev                               │
│ □ Acessar http://localhost:5173                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PASSO 2: TESTAR LOGIN                                         │
├─────────────────────────────────────────────────────────────────┤
│ □ Fazer login com credenciais válidas                           │
│ □ Verificar se redirect para dashboard funciona                 │
│ □ Verificar se não há erros no console (F12)                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PASSO 3: TESTAR DASHBOARD                                     │
├─────────────────────────────────────────────────────────────────┤
│ □ Dashboard carrega com dados reais (não mock)                  │
│ □ Cards de estatísticas mostram números corretos                │
│ □ Gráficos renderizam corretamente                              │
│ □ Top alunos em risco mostra alunos reais                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PASSO 4: TESTAR EGRESSOS                                      │
├─────────────────────────────────────────────────────────────────┤
│ □ Acessar página de Egressos                                    │
│ □ Página carrega sem erro 404                                   │
│ □ Formulário de cadastro funciona                               │
│ □ Estatísticas são exibidas                                     │
│ □ Lista de egressos mostra dados reais                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PASSO 5: TESTAR RELATÓRIOS                                    │
├─────────────────────────────────────────────────────────────────┤
│ □ Acessar página de Relatórios                                  │
│□ Gráficos mostram dados reais (não mock)                        │
│□ Filtro por curso funciona                                      │
│□ Exportar botão responde                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PASSO 6: TESTAR NOTIFICAÇÕES                                  │
├─────────────────────────────────────────────────────────────────┤
│ □ Enviar alerta de risco para um aluno                          │
│□ Verificar se não há erro 404 no console                        │
│□ (Se Telegram configurado) verificar se mensagem chega           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PASSO 7: TESTAR ALUNO DETAIL                                  │
├─────────────────────────────────────────────────────────────────┤
│□ Clicar em um aluno na listagem                                 │
│□ Página de detalhes carrega                                     │
│□ Histórico de frequência aparece                                │
│□ Gráfico de evolução renderiza                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PASSO 8: VERIFICAR CONSOLE                                    │
├─────────────────────────────────────────────────────────────────┤
│□ Abrir DevTools (F12)                                           │
│□ Verificar aba Console                                          │
│□ NÃO deve haver erros vermelhos                                 │
│□ Warnings amarelos são aceitáveis                               │
└─────────────────────────────────────────────────────────────────┘

Dica: Se encontrar erros, copie e cole aqui para eu analisar!
"""
    
    print(checklist)

# ============================================
# MAIN
# ============================================
if __name__ == "__main__":
    print(f"\n{Cores.NEGRITO}{'='*80}")
    print(f"   🔍 VERIFICAÇÃO ESTÁTICA COMPLETA - SAPEE DEWAS")
    print(f"{'='*80}{Cores.RESET}\n")
    
    print(f"{Cores.AZUL}Diretório do projeto: {DIR_RAIZ}{Cores.RESET}\n")
    
    # Executar verificações
    resultados = {}
    
    resultados["1. Sintaxe Python"] = verificar_sintaxe_python()
    resultados["2. Imports TypeScript"] = verificar_imports_typescript()
    resultados["3. Estrutura Backend"] = verificar_estrutura_backend()
    resultados["4. Arquivos Removidos"] = verificar_arquivos_removidos()
    resultados["5. Endpoints"] = verificar_endpoints()
    
    # Gerar relatório final
    todos_passaram = gerar_relatorio_final(resultados)
    
    # Gerar checklist de testes manuais
    if todos_passaram:
        gerar_checklist_manual()
    
    # Código de saída
    sys.exit(0 if todos_passaram else 1)
