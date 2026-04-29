"""
SAPEE DEWAS - Script para Gerar 20 Alunos de Teste (Manaus-AM)
===============================================================

Este script gera 20 alunos com dados realistas da cidade de Manaus-AM
para teste completo do sistema SAPEE DEWAS.

Cada aluno inclui:
- Dados pessoais completos
- Endereço em Manaus (bairros reais)
- Dados acadêmicos (cursos IFAM)
- Dados socioeconômicos
- Predição de risco calculada
- Histórico de frequência mensal
- Intervenções (se necessário)
- Planos de ação

EXECUÇÃO:
    cd backend
    .\venv\Scripts\Activate.ps1
    python gerar_alunos_teste_manaus.py

RESULTADOS ESPERADOS:
    - 6 alunos com risco BAIXO
    - 8 alunos com risco MÉDIO  
    - 6 alunos com risco ALTO
"""

import pymysql
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import random
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

# Conectar ao MySQL
connection = pymysql.connect(
    host=host,
    port=port,
    user=user,
    password=password,
    database=database,
    charset='utf8mb4'
)

cursor = connection.cursor()

print("=" * 80)
print("SAPEE DEWAS - Gerando 20 Alunos de Teste (Manaus-AM)")
print("=" * 80)
print(f"Banco de dados: {database}")
print("=" * 80)

# ============================================
# DADOS REALISTAS DE MANAUS
# ============================================

# Bairros de Manaus com CEPs reais
BAIRROS_MANAUS = [
    ("São Geraldo", "69090-000", "ZONA_NORTE"),
    ("Cidade Nova", "69097-000", "ZONA_NORTE"),
    ("Jorge Teixeira", "69098-000", "ZONA_LESTE"),
    ("Tancredo Neves", "69090-120", "ZONA_NORTE"),
    ("Pedreira", "69090-230", "ZONA_NORTE"),
    ("Coroado", "69095-000", "ZONA_LESTE"),
    ("São José Operário", "69096-000", "ZONA_LESTE"),
    ("Adrianópolis", "69057-000", "ZONA_SUL"),
    ("Nossa Senhora das Graças", "69053-000", "ZONA_CENTRO"),
    ("Centro", "69010-000", "ZONA_CENTRO"),
    ("Compensa", "69036-000", "ZONA_OESTE"),
    ("São Lázaro", "69048-000", "ZONA_CENTRO"),
    ("Chapada", "69055-000", "ZONA_SUL"),
    ("Park 10", "69055-400", "ZONA_SUL"),
    ("Aleixo", "69060-000", "ZONA_CENTRO"),
]

# Cursos IFAM (usando IDs reais do banco)
CURSOS_IFAM = [
    (12, "Técnico em Informática (Integrado)", "Integrado"),
    (13, "Técnico em Edificações (Integrado)", "Integrado"),
    (14, "Técnico em Administração (Integrado)", "Integrado"),
    (16, "Técnico em Edificações (Subsequente)", "Subsequente"),
    (8, "Análise e Desenvolvimento de Sistemas", "Superior"),
    (1, "Engenharia Civil", "Superior"),
    (9, "Construção de Edifícios", "Superior"),
]

# Nomes realistas da região
NOMES_MASCULINOS = [
    "Francisco Alves da Silva", "Antônio Souza Oliveira", "João Pereira Santos",
    "Pedro Rodrigues Costa", "Manuel Ferreira Lima", "José Barbosa Rocha",
    "Luiz Araújo Nunes", "Carlos Mendes Duarte", "Raimundo Nonato Silva",
    "Sebastião Oliveira Santos", "Miguel Pereira Costa", "Anderson Souza Lima"
]

NOMES_FEMININOS = [
    "Maria Silva Santos", "Francisca Oliveira Costa", "Antônia Pereira Lima",
    "Joana Rodrigues Souza", "Pedra Ferreira Rocha", "Josefa Barbosa Nunes",
    "Raimunda Mendes Duarte", "Sebastiana Araújo Santos", "Ana Costa Oliveira",
    "Lucia Souza Pereira", "Teresa Lima Rodrigues", "Adriana Santos Ferreira"
]

# Sobrenomes comuns
SOBRENOMES = ["da Silva", "de Souza", "de Oliveira", "dos Santos", "Pereira", "Ferreira"]

# ============================================
# FUNÇÕES AUXILIARES
# ============================================

def gerar_matricula(ano=2024):
    """Gera matrícula no formato YYYYNNNNNN"""
    return f"{ano}{random.randint(100000, 999999)}"

def gerar_data_nascimento(idade_min=16, idade_max=45):
    """Gera data de nascimento aleatória"""
    idade = random.randint(idade_min, idade_max)
    hoje = datetime.now()
    data_nasc = hoje - timedelta(days=idade*365 + random.randint(0, 365))
    return data_nasc.strftime('%Y-%m-%d')

def calcular_idade(data_nascimento):
    """Calcula idade a partir da data de nascimento"""
    hoje = datetime.now()
    nasc = datetime.strptime(data_nascimento, '%Y-%m-%d')
    idade = hoje.year - nasc.year
    if (hoje.month, hoje.day) < (nasc.month, nasc.day):
        idade -= 1
    return idade

def gerar_cpf():
    """Gera CPF aleatório válido"""
    cpf = [random.randint(0, 9) for _ in range(9)]
    def calcula_digito(cpf_partial, peso):
        soma = sum(cpf_partial[i] * peso[i] for i in range(len(cpf_partial)))
        resto = soma % 11
        return 0 if resto < 2 else 11 - resto
    cpf.append(calcula_digito(cpf, [10, 9, 8, 7, 6, 5, 4, 3, 2]))
    cpf.append(calcula_digito(cpf, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]))
    return "".join(map(str, cpf))

def gerar_telefone():
    """Gera telefone de Manaus"""
    return f"(92) 9{random.randint(8000, 9999)}-{random.randint(1000, 9999)}"

def gerar_email(nome, matricula):
    """Gera email institucional"""
    partes = nome.lower().split()
    primeiro = partes[0]
    ultimo = partes[-1] if len(partes) > 1 else ""
    return f"{primeiro}.{ultimo}.{matricula}@ifam.edu.br"

def calcular_risco_evasao(aluno_data):
    """
    Calcula risco de evasão baseado nos dados do aluno
    Retorna: (score, nivel_risco, fatores)
    """
    score = 0
    fatores = []
    
    # Frequência (peso máximo: 35 pontos)
    frequencia = aluno_data.get('frequencia', 100)
    if frequencia < 60:
        score += 35
        fatores.append(f"Frequência crítica ({frequencia}%)")
    elif frequencia < 75:
        score += 25
        fatores.append(f"Frequência abaixo de 75% ({frequencia}%)")
    
    # Média geral (peso máximo: 30 pontos)
    media = aluno_data.get('media_geral', 10)
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
    reprovas = aluno_data.get('historico_reprovas', 0)
    if reprovas > 3:
        score += 20
        fatores.append(f"{reprovas} reprovações")
    elif reprovas > 1:
        score += 10
        fatores.append(f"{reprovas} reprovações")
    
    # Renda familiar (peso máximo: 15 pontos)
    renda = aluno_data.get('renda_familiar', 3000)
    if renda < 1000:
        score += 15
        fatores.append("Renda familiar baixa")
    elif renda < 2000:
        score += 8
    
    # Trabalha (peso máximo: 15 pontos)
    if aluno_data.get('trabalha', False):
        carga = aluno_data.get('carga_horaria_trabalho', 0)
        if carga > 40:
            score += 15
            fatores.append(f"Trabalha {carga}h/semana")
        elif carga > 20:
            score += 8
            fatores.append(f"Trabalha {carga}h/semana")
    
    # Tempo de deslocamento (peso máximo: 15 pontos)
    tempo = aluno_data.get('tempo_deslocamento', 30)
    if tempo > 120:
        score += 15
        fatores.append(f"Tempo de deslocamento crítico ({tempo}min)")
    elif tempo > 90:
        score += 8
    
    # Possui computador (peso: 6 pontos)
    if not aluno_data.get('possui_computador', True):
        score += 6
        fatores.append("Não possui computador")
    
    # Possui internet (peso: 4 pontos)
    if not aluno_data.get('possui_internet', True):
        score += 4
        fatores.append("Não possui internet")
    
    # Bolsa família (peso: 5 pontos)
    if aluno_data.get('beneficiario_bolsa_familia', False):
        score += 5
    
    # Primeiro geração (peso: 5 pontos)
    if aluno_data.get('primeiro_geracao_universidade', False):
        score += 5
    
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
    
    return score, nivel, fatores

# ============================================
# GERAR 20 ALUNOS
# ============================================

# Definir distribuição de risco
# 6 BAIXO, 8 MEDIO, 6 ALTO
PERFIS = (
    # Risco BAIXO (6 alunos) - IDs 1-6
    [
        {'frequencia': (85, 100), 'media': (7.0, 10.0), 'reprovas': (0, 1), 'renda': (3000, 8000), 'trabalha': False},
        {'frequencia': (85, 100), 'media': (7.0, 10.0), 'reprovas': (0, 1), 'renda': (3000, 8000), 'trabalha': False},
        {'frequencia': (80, 95), 'media': (6.5, 9.0), 'reprovas': (0, 1), 'renda': (2500, 6000), 'trabalha': False},
        {'frequencia': (80, 95), 'media': (6.5, 9.0), 'reprovas': (0, 2), 'renda': (2500, 6000), 'trabalha': False},
        {'frequencia': (78, 92), 'media': (6.0, 8.5), 'reprovas': (0, 2), 'renda': (2000, 5000), 'trabalha': True},
        {'frequencia': (78, 92), 'media': (6.0, 8.5), 'reprovas': (0, 2), 'renda': (2000, 5000), 'trabalha': True},
    ] +
    # Risco MÉDIO (8 alunos) - IDs 7-14
    [
        {'frequencia': (70, 82), 'media': (5.0, 7.0), 'reprovas': (1, 3), 'renda': (1500, 4000), 'trabalha': True},
        {'frequencia': (70, 82), 'media': (5.0, 7.0), 'reprovas': (1, 3), 'renda': (1500, 4000), 'trabalha': True},
        {'frequencia': (68, 80), 'media': (4.5, 6.5), 'reprovas': (2, 4), 'renda': (1200, 3500), 'trabalha': True},
        {'frequencia': (68, 80), 'media': (4.5, 6.5), 'reprovas': (2, 4), 'renda': (1200, 3500), 'trabalha': True},
        {'frequencia': (65, 78), 'media': (4.0, 6.0), 'reprovas': (2, 4), 'renda': (1000, 3000), 'trabalha': True},
        {'frequencia': (65, 78), 'media': (4.0, 6.0), 'reprovas': (2, 4), 'renda': (1000, 3000), 'trabalha': True},
        {'frequencia': (62, 75), 'media': (3.5, 5.5), 'reprovas': (3, 5), 'renda': (900, 2500), 'trabalha': True},
        {'frequencia': (62, 75), 'media': (3.5, 5.5), 'reprovas': (3, 5), 'renda': (900, 2500), 'trabalha': True},
    ] +
    # Risco ALTO (6 alunos) - IDs 15-20
    [
        {'frequencia': (50, 65), 'media': (3.0, 5.0), 'reprovas': (3, 6), 'renda': (700, 2000), 'trabalha': True},
        {'frequencia': (50, 65), 'media': (3.0, 5.0), 'reprovas': (3, 6), 'renda': (700, 2000), 'trabalha': True},
        {'frequencia': (45, 60), 'media': (2.5, 4.5), 'reprovas': (4, 7), 'renda': (600, 1800), 'trabalha': True},
        {'frequencia': (45, 60), 'media': (2.5, 4.5), 'reprovas': (4, 7), 'renda': (600, 1800), 'trabalha': True},
        {'frequencia': (40, 55), 'media': (2.0, 4.0), 'reprovas': (5, 8), 'renda': (500, 1500), 'trabalha': True},
        {'frequencia': (40, 55), 'media': (2.0, 4.0), 'reprovas': (5, 8), 'renda': (500, 1500), 'trabalha': True},
    ]
)

print("\n📋 GERANDO 20 ALUNOS...\n")

alunos_gerados = []

for i in range(20):
    perfil = PERFIS[i]
    
    # Gerar dados básicos
    sexo = random.choice(['M', 'F'])
    nome = random.choice(NOMES_MASCULINOS if sexo == 'M' else NOMES_FEMININOS)
    if random.random() < 0.3:  # 30% de chance de adicionar sobrenome extra
        nome += " " + random.choice(SOBRENOMES)
    
    matricula = gerar_matricula(2024)
    data_nasc = gerar_data_nascimento(16 if i < 10 else 18, 25 if i < 10 else 45)
    idade = calcular_idade(data_nasc)
    
    # Selecionar curso aleatório
    curso_id, curso_nome, modalidade = random.choice(CURSOS_IFAM)
    
    # Gerar dados acadêmicos dentro do perfil
    frequencia = round(random.uniform(*perfil['frequencia']), 1)
    media_geral = round(random.uniform(*perfil['media']), 1)
    historico_reprovas = random.randint(*perfil['reprovas'])
    
    # Selecionar bairro
    bairro, cep, zona = random.choice(BAIRROS_MANAUS)
    
    # Gerar endereço
    logradouro = random.choice([
        "Rua", "Avenida", "Travessa", "Beco"
    ]) + " " + random.choice([
        "das Flores", "da Paz", "Brasil", "Amazonas", "Sete de Setembro",
        "Quinze de Novembro", "São José", "Santa Maria", "do Comércio"
    ])
    numero = random.randint(10, 9999)
    complemento = random.choice(["", f"Apto {random.randint(1, 500)}", "Casa", "Fundos"])
    
    # Dados socioeconômicos
    renda_familiar = round(random.uniform(*perfil['renda']), 2)
    trabalha = perfil['trabalha']
    carga_horaria = random.randint(20, 60) if trabalha else 0
    
    tempo_deslocamento = random.randint(30, 150)
    custo_transporte = round(random.uniform(5, 25), 2)
    
    # Infraestrutura
    possui_computador = random.random() < 0.85  # 85% possuem
    possui_internet = random.random() < 0.80  # 80% possuem
    
    # Vulnerabilidade
    beneficiario_bolsa = renda_familiar < 1500 and random.random() < 0.6
    primeiro_geracao = random.random() < 0.50  # 50% são primeira geração
    
    # Montar dados do aluno
    aluno_data = {
        'matricula': matricula,
        'nome': nome,
        'email': gerar_email(nome, matricula),
        'telefone': gerar_telefone(),
        'data_nascimento': data_nasc,
        'idade': idade,
        'sexo': sexo,
        'curso_id': curso_id,
        'periodo': random.randint(1, 4),
        'turno': random.choice(['MATUTINO', 'VESPERTINO', 'NOTURNO']),
        'media_geral': media_geral,
        'frequencia': frequencia,
        'historico_reprovas': historico_reprovas,
        'cidade': 'Manaus',
        'cep': cep,
        'logradouro': f"{logradouro}, {numero}",
        'complemento': complemento,
        'bairro': bairro,
        'zona_residencial': zona,
        'renda_familiar': renda_familiar,
        'renda_per_capita': round(renda_familiar / random.randint(2, 5), 2),
        'possui_auxilio': random.random() < 0.30,
        'trabalha': trabalha,
        'carga_horaria_trabalho': carga_horaria,
        'tempo_deslocamento': tempo_deslocamento,
        'custo_transporte_diario': custo_transporte,
        'dificuldade_acesso': random.choice(['FACIL', 'MEDIA', 'DIFICIL']),
        'transporte_utilizado': random.choice(['ONIBUS', 'METRO', 'CARRO', 'A_PE']),
        'possui_computador': possui_computador,
        'possui_internet': possui_internet,
        'beneficiario_bolsa_familia': beneficiario_bolsa,
        'primeiro_geracao_universidade': primeiro_geracao,
    }
    
    # Calcular risco
    score, nivel_risco, fatores = calcular_risco_evasao(aluno_data)
    
    # Inserir aluno no banco
    try:
        cursor.execute("""
            INSERT INTO alunos (
                matricula, nome, email, telefone, data_nascimento, idade, sexo,
                curso_id, periodo, turno, media_geral, frequencia, historico_reprovas,
                cidade, cep, logradouro, numero, complemento, bairro, zona_residencial,
                renda_familiar, renda_per_capita, possui_auxilio, trabalha,
                carga_horaria_trabalho, tempo_deslocamento, custo_transporte_diario,
                dificuldade_acesso, transporte_utilizado, possui_computador,
                possui_internet, beneficiario_bolsa_familia, primeiro_geracao_universidade
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            aluno_data['matricula'], aluno_data['nome'], aluno_data['email'],
            aluno_data['telefone'], aluno_data['data_nascimento'], aluno_data['idade'],
            aluno_data['sexo'], aluno_data['curso_id'], aluno_data['periodo'],
            aluno_data['turno'], aluno_data['media_geral'], aluno_data['frequencia'],
            aluno_data['historico_reprovas'], aluno_data['cidade'], aluno_data['cep'],
            aluno_data['logradouro'], aluno_data['numero'], aluno_data['complemento'],
            aluno_data['bairro'], aluno_data['zona_residencial'], aluno_data['renda_familiar'],
            aluno_data['renda_per_capita'], aluno_data['possui_auxilio'], aluno_data['trabalha'],
            aluno_data['carga_horaria_trabalho'], aluno_data['tempo_deslocamento'],
            aluno_data['custo_transporte_diario'], aluno_data['dificuldade_acesso'],
            aluno_data['transporte_utilizado'], aluno_data['possui_computador'],
            aluno_data['possui_internet'], aluno_data['beneficiario_bolsa_familia'],
            aluno_data['primeiro_geracao_universidade']
        ))
        
        # Inserir predição
        fatores_json = json.dumps(fatores, ensure_ascii=False)
        cursor.execute("""
            INSERT INTO predicoes (
                aluno_id, risco_evasao, nivel_risco, fatores_principais, modelo_ml_versao
            ) VALUES (%s, %s, %s, %s, %s)
        """, (
            matricula, score, nivel_risco, ", ".join(fatores), "2.0.0-fallback"
        ))
        
        # Gerar frequência mensal (últimos 6 meses)
        from datetime import datetime, timedelta
        hoje = datetime.now()
        for mes_atras in range(6, 0, -1):
            data_ref = hoje - timedelta(days=mes_atras*30)
            mes = data_ref.month
            ano = data_ref.year
            
            # Variação de 5% para cada mês
            freq_mes = round(frequencia + random.uniform(-5, 5), 1)
            freq_mes = max(0, min(100, freq_mes))
            
            total_aulas = random.randint(15, 25)
            faltas = int((100 - freq_mes) / 100 * total_aulas)
            faltas_just = random.randint(0, faltas)
            faltas_njust = faltas - faltas_just
            
            cursor.execute("""
                INSERT INTO frequencia_mensal (
                    aluno_id, mes, ano, frequencia, faltas_justificadas,
                    faltas_nao_justificadas, total_aulas_mes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                matricula, mes, ano, freq_mes, faltas_just, faltas_njust, total_aulas
            ))
        
        # Criar intervenção para alunos de risco MÉDIO e ALTO
        if nivel_risco in ['MEDIO', 'ALTO']:
            prioridade = 'URGENTE' if nivel_risco == 'ALTO' else 'MEDIA'
            tipos_intervencao = [
                "Reunião com Aluno",
                "Reunião com Responsáveis",
                "Encaminhamento Psicológico",
                "Monitoria Acadêmica",
                "Auxílio Financeiro/Permanência"
            ]
            
            cursor.execute("""
                INSERT INTO intervencoes (
                    aluno_id, usuario_id, data_intervencao, tipo, descricao,
                    status, prioridade
                ) VALUES (%s, 1, CURDATE(), %s, %s, %s, %s)
            """, (
                matricula,
                random.choice(tipos_intervencao),
                f"Aluno com {nivel_risco} risco de evasão. Score: {score}. Fatores: {', '.join(fatores[:3])}",
                'PENDENTE',
                prioridade
            ))
        
        connection.commit()
        
        # Armazenar para relatório
        alunos_gerados.append({
            'matricula': matricula,
            'nome': nome,
            'curso': curso_nome,
            'periodo': aluno_data['periodo'],
            'frequencia': frequencia,
            'media_geral': media_geral,
            'historico_reprovas': historico_reprovas,
            'risco_score': score,
            'nivel_risco': nivel_risco,
            'fatores': fatores,
            'intervencoes': 1 if nivel_risco in ['MEDIO', 'ALTO'] else 0
        })
        
        print(f"✅ {matricula} - {nome[:30]:30s} | {curso_nome[:25]:25s} | Risco: {nivel_risco:5s} ({score:5.1f})")
        
    except Exception as e:
        print(f"❌ Erro ao inserir aluno {matricula}: {e}")
        connection.rollback()

# ============================================
# RELATÓRIO FINAL
# ============================================

print("\n" + "=" * 80)
print("📊 RESUMO DOS ALUNOS GERADOS")
print("=" * 80)

# Contar por nível de risco
risco_baixo = sum(1 for a in alunos_gerados if a['nivel_risco'] == 'BAIXO')
risco_medio = sum(1 for a in alunos_gerados if a['nivel_risco'] == 'MEDIO')
risco_alto = sum(1 for a in alunos_gerados if a['nivel_risco'] == 'ALTO')

print(f"\nTotal de alunos: {len(alunos_gerados)}")
print(f"  🟢 Risco BAIXO:  {risco_baixo} alunos ({risco_baixo/len(alunos_gerados)*100:.1f}%)")
print(f"  🟡 Risco MÉDIO:  {risco_medio} alunos ({risco_medio/len(alunos_gerados)*100:.1f}%)")
print(f"  🔴 Risco ALTO:   {risco_alto} alunos ({risco_alto/len(alunos_gerados)*100:.1f}%)")

print("\n" + "=" * 80)
print("📋 DETALHAMENTO POR ALUNO")
print("=" * 80)

for aluno in alunos_gerados:
    print(f"\n{aluno['matricula']} - {aluno['nome']}")
    print(f"  Curso: {aluno['curso']} - {aluno['periodo']}º período")
    print(f"  Frequência: {aluno['frequencia']}% | Média: {aluno['media_geral']} | Reprovas: {aluno['historico_reprovas']}")
    print(f"  Risco: {aluno['nivel_risco']} ({aluno['risco_score']} pontos)")
    if aluno['fatores']:
        print(f"  Fatores: {', '.join(aluno['fatores'])}")
    if aluno['intervencoes'] > 0:
        print(f"  ✅ Intervenção criada: 1")

print("\n" + "=" * 80)
print("✅ GERAÇÃO CONCLUÍDA COM SUCESSO!")
print("=" * 80)
print(f"\nPróximos passos:")
print("1. Acesse http://localhost:3000/alunos para ver a lista")
print("2. Acesse http://localhost:3000/ para ver o Dashboard")
print("3. Acesse http://localhost:3000/faltas/lancar para testar faltas")
print("4. Acesse http://localhost:3000/relatorios-gerenciais para gerar relatórios")
print("=" * 80)

# Fechar conexão
cursor.close()
connection.close()
