"""
SAPEE DEWAS - Script para Gerar/Recalcular Predições de Risco
==============================================================

Este script gera predições de risco para TODOS os alunos do banco de dados.
Útil para:
- Alunos cadastrados manualmente sem predição
- Recalcular predições após mudanças no algoritmo
- Corrigir predições inconsistentes

EXECUÇÃO:
    cd backend
    .\venv\Scripts\Activate.ps1
    python gerar_predicoes_todos_alunos.py

RESULTADO:
    - Gera predição para cada aluno
    - Mostra score, nível e fatores
    - Salva no banco de dados
"""

import pymysql
from dotenv import load_dotenv
import os
from datetime import datetime
import json

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:senha@localhost:3306/sapee_dewas")

# Extrair conexão
parts = DATABASE_URL.replace("mysql+pymysql://", "").split("@")
user_pass = parts[0].split(":")
user = user_pass[0]
password = user_pass[1].replace("%40", "@")
host_db = parts[1].split("/")
host_port = host_db[0].split(":")
host = host_port[0]
port = int(host_port[1]) if len(host_port) > 1 else 3306
database = host_db[1]

print("=" * 80)
print("SAPEE DEWAS - Gerando Predições de Risco para Todos os Alunos")
print("=" * 80)
print(f"Banco de dados: {database}")
print("=" * 80)

# Conectar ao MySQL
connection = pymysql.connect(
    host=host,
    port=port,
    user=user,
    password=password,
    database=database,
    charset='utf8mb4'
)

cursor = connection.cursor(pymysql.cursors.DictCursor)

# Buscar todos os alunos
cursor.execute("""
    SELECT 
        a.matricula,
        a.nome,
        a.media_geral,
        a.frequencia,
        a.historico_reprovas,
        a.renda_familiar,
        a.trabalha,
        a.carga_horaria_trabalho,
        a.tempo_deslocamento,
        a.possui_computador,
        a.possui_internet,
        a.beneficiario_bolsa_familia,
        a.primeiro_geracao_universidade,
        a.possui_auxilio
    FROM alunos a
    ORDER BY a.matricula
""")

alunos = cursor.fetchall()

print(f"\n📊 Total de alunos encontrados: {len(alunos)}\n")

# Função para calcular risco (mesma lógica do backend)
def calcular_risco_evasao(aluno):
    """Calcula risco de evasão baseado nos dados do aluno"""
    score = 0
    fatores = []
    
    # Frequência (peso máximo: 35 pontos)
    frequencia = float(aluno['frequencia']) if aluno['frequencia'] else 0
    if frequencia < 60:
        score += 35
        fatores.append(f"Frequência crítica ({frequencia}%)")
    elif frequencia < 75:
        score += 25
        fatores.append(f"Frequência abaixo de 75% ({frequencia}%)")
    
    # Média geral (peso máximo: 30 pontos)
    media = float(aluno['media_geral']) if aluno['media_geral'] else 0
    if media < 4.0:
        score += 30
        fatores.append(f"Média muito baixa ({media})")
    elif media < 5.0:
        score += 20
        fatores.append(f"Média baixa ({media})")
    elif media < 6.0:
        score += 10
        fatores.append(f"Média regular ({media})")
    
    # Histórico de reprovas (peso máximo: 20 pontos)
    reprovas = int(aluno['historico_reprovas']) if aluno['historico_reprovas'] else 0
    if reprovas > 3:
        score += 20
        fatores.append(f"{reprovas} reprovações")
    elif reprovas > 1:
        score += 10
        fatores.append(f"{reprovas} reprovações")
    
    # Renda familiar (peso máximo: 15 pontos)
    renda = float(aluno['renda_familiar']) if aluno['renda_familiar'] else 0
    if renda < 1000:
        score += 15
        fatores.append("Renda familiar baixa")
    elif renda < 2000:
        score += 8
    
    # Trabalha (peso máximo: 15 pontos)
    if aluno['trabalha']:
        carga = int(aluno['carga_horaria_trabalho']) if aluno['carga_horaria_trabalho'] else 0
        if carga > 40:
            score += 15
            fatores.append(f"Trabalha {carga}h/semana")
        elif carga > 20:
            score += 8
            fatores.append(f"Trabalha {carga}h/semana")
    
    # Tempo de deslocamento (peso máximo: 15 pontos)
    tempo = int(aluno['tempo_deslocamento']) if aluno['tempo_deslocamento'] else 0
    if tempo > 120:
        score += 15
        fatores.append(f"Tempo de deslocamento crítico ({tempo}min)")
    elif tempo > 90:
        score += 8
    
    # Possui computador (peso: 6 pontos)
    if not aluno['possui_computador']:
        score += 6
        fatores.append("Não possui computador")
    
    # Possui internet (peso: 4 pontos)
    if not aluno['possui_internet']:
        score += 4
        fatores.append("Não possui internet")
    
    # Bolsa família (peso: 5 pontos)
    if aluno['beneficiario_bolsa_familia']:
        score += 5
    
    # Primeiro geração (peso: 5 pontos)
    if aluno['primeiro_geracao_universidade']:
        score += 5
    
    # Auxílio (peso: 5 pontos)
    if aluno['possui_auxilio']:
        score -= 5  # Reduz risco se tem auxílio
    
    # Limitar a 100 pontos
    score = min(score, 100)
    
    # Determinar nível de risco
    if score <= 30:
        nivel = "BAIXO"
    elif score <= 70:
        nivel = "MEDIO"
    else:
        nivel = "ALTO"
    
    # Limitar fatores a 5 principais
    fatores = fatores[:5] if len(fatores) > 5 else fatores
    
    return {
        'risco_evasao': score,
        'nivel_risco': nivel,
        'fatores_principais': ', '.join(fatores) if fatores else 'Nenhum fator crítico identificado'
    }

# Processar cada aluno
print("🔄 Gerando predições...\n")

predicoes_geradas = 0
erros = 0

for i, aluno in enumerate(alunos, 1):
    matricula = aluno['matricula']
    nome = aluno['nome']
    
    try:
        # Calcular risco
        resultado = calcular_risco_evasao(aluno)
        
        # Verificar se já existe predição
        cursor.execute("""
            SELECT id, risco_evasao, nivel_risco 
            FROM predicoes 
            WHERE aluno_id = %s 
            ORDER BY data_predicao DESC 
            LIMIT 1
        """, (matricula,))
        
        predicao_existente = cursor.fetchone()
        
        if predicao_existente:
            # Atualizar predição existente
            cursor.execute("""
                UPDATE predicoes 
                SET risco_evasao = %s,
                    nivel_risco = %s,
                    fatores_principais = %s,
                    modelo_ml_versao = '2.0.0-fallback',
                    data_predicao = NOW()
                WHERE aluno_id = %s
            """, (
                resultado['risco_evasao'],
                resultado['nivel_risco'],
                resultado['fatores_principais'],
                matricula
            ))
            
            acao = "ATUALIZADO"
        else:
            # Inserir nova predição
            cursor.execute("""
                INSERT INTO predicoes (
                    aluno_id,
                    risco_evasao,
                    nivel_risco,
                    fatores_principais,
                    modelo_ml_versao,
                    data_predicao
                ) VALUES (%s, %s, %s, %s, %s, NOW())
            """, (
                matricula,
                resultado['risco_evasao'],
                resultado['nivel_risco'],
                resultado['fatores_principais'],
                '2.0.0-fallback'
            ))
            
            acao = "CRIADO"
        
        predicoes_geradas += 1
        
        # Imprimir resultado
        cor_risco = "🟢" if resultado['nivel_risco'] == "BAIXO" else \
                    "🟡" if resultado['nivel_risco'] == "MEDIO" else "🔴"
        
        print(f"{i:3d}. {matricula} - {nome[:30]:30s} | "
              f"Score: {resultado['risco_evasao']:5.1f} | "
              f"{cor_risco} {resultado['nivel_risco']:5s} | {acao}")
        
    except Exception as e:
        erros += 1
        print(f"❌ Erro ao processar {matricula}: {e}")

# Commit das alterações
connection.commit()

# Resumo final
print("\n" + "=" * 80)
print("📊 RESUMO DA OPERAÇÃO")
print("=" * 80)
print(f"Total de alunos processados: {len(alunos)}")
print(f"Predições geradas/atualizadas: {predicoes_geradas}")
print(f"Erros: {erros}")
print(f"Sucesso: {(predicoes_geradas / len(alunos) * 100):.1f}%")
print("=" * 80)

# Buscar estatísticas
cursor.execute("""
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN nivel_risco = 'BAIXO' THEN 1 ELSE 0 END) as baixo,
        SUM(CASE WHEN nivel_risco = 'MEDIO' THEN 1 ELSE 0 END) as medio,
        SUM(CASE WHEN nivel_risco = 'ALTO' THEN 1 ELSE 0 END) as alto
    FROM (
        SELECT p.nivel_risco
        FROM predicoes p
        INNER JOIN (
            SELECT aluno_id, MAX(data_predicao) as max_data
            FROM predicoes
            GROUP BY aluno_id
        ) latest ON p.aluno_id = latest.aluno_id AND p.data_predicao = latest.max_data
    ) AS ultimas_predicoes
""")

stats = cursor.fetchone()

print("\n📈 DISTRIBUIÇÃO DE RISCO ATUALIZADA")
print("=" * 80)
print(f"🟢 Risco BAIXO:  {stats['baixo']:3d} alunos ({stats['baixo']/stats['total']*100:.1f}%)")
print(f"🟡 Risco MÉDIO:  {stats['medio']:3d} alunos ({stats['medio']/stats['total']*100:.1f}%)")
print(f"🔴 Risco ALTO:   {stats['alto']:3d} alunos ({stats['alto']/stats['total']*100:.1f}%)")
print(f"TOTAL:          {stats['total']:3d} alunos (100%)")
print("=" * 80)

# Fechar conexão
cursor.close()
connection.close()

print("\n✅ Predições geradas com sucesso!")
print("\nPróximos passos:")
print("1. Acesse http://localhost:3000/alunos para ver a lista")
print("2. Clique em um aluno para ver o score de risco")
print("3. Verifique a seção 'Análise de Predição' na coluna direita")
print("=" * 80)
