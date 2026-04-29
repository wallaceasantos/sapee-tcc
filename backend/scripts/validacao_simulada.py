"""
🧪 Validação Simulada do Fallback V2
Testa a consistência interna do algoritmo usando os 20 alunos do cadastro manual.

Como funciona:
1. Cada aluno tem um "perfil esperado" baseado em seus dados
2. O Fallback classifica cada aluno
3. Comparamos classificação do Fallback vs perfil esperado
4. Calculamos métricas: acurácia, precisão, recall, F1

LIMITAÇÃO IMPORTANTE:
- Isso NÃO substitui validação com dados reais
- É apenas um teste de consistência interna
- Labels são simulados, não evasões reais
"""

import sys
import os
# Adicionar backend ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ml_logic_v2 import fallback_logic_v2, PESOS_FATORES

# ============================================
# PERFIS ESPERADOS DOS 20 ALUNOS
# ============================================
# "label_esperado": BAIXO, MEDIO, ALTO, MUITO_ALTO
# Baseado na análise dos dados de cada aluno

ALUNOS_TESTE = [
    # RISCO BAIXO - 6 alunos esperados
    {"nome": "Maria Silva Santos", "matricula": "2026102001", "label_esperado": "BAIXO",
     "media": 8.5, "freq": 92.5, "reprovas": 0, "renda": 4500, "trabalha": False,
     "desloc": 45, "diff_acesso": "FACIL", "computador": True, "internet": True,
     "bolsa": False, "primeira_ger": False},
    
    {"nome": "João Pereira Santos", "matricula": "2026102002", "label_esperado": "BAIXO",
     "media": 7.8, "freq": 88.0, "reprovas": 1, "renda": 5200, "trabalha": False,
     "desloc": 60, "diff_acesso": "MEDIA", "computador": True, "internet": True,
     "bolsa": False, "primeira_ger": True},
    
    {"nome": "Ana Costa Oliveira", "matricula": "2026102003", "label_esperado": "BAIXO",
     "media": 7.2, "freq": 85.5, "reprovas": 0, "renda": 3800, "trabalha": False,
     "desloc": 35, "diff_acesso": "FACIL", "computador": True, "internet": True,
     "bolsa": False, "primeira_ger": False},
    
    {"nome": "Pedro Rodrigues Costa", "matricula": "2026102004", "label_esperado": "BAIXO",
     "media": 6.8, "freq": 82.0, "reprovas": 1, "renda": 3200, "trabalha": True,
     "desloc": 50, "diff_acesso": "MEDIA", "computador": True, "internet": True,
     "bolsa": False, "primeira_ger": True},
    
    {"nome": "Francisca Oliveira Costa", "matricula": "2026102005", "label_esperado": "BAIXO",
     "media": 7.5, "freq": 87.5, "reprovas": 0, "renda": 4000, "trabalha": True,
     "desloc": 40, "diff_acesso": "FACIL", "computador": True, "internet": True,
     "bolsa": False, "primeira_ger": False},
    
    {"nome": "Luiz Araújo Nunes", "matricula": "2026102006", "label_esperado": "BAIXO",
     "media": 8.0, "freq": 90.0, "reprovas": 0, "renda": 6000, "trabalha": False,
     "desloc": 30, "diff_acesso": "FACIL", "computador": True, "internet": True,
     "bolsa": False, "primeira_ger": False},
    
    # RISCO MÉDIO - 8 alunos esperados (mas só temos 1 claro)
    {"nome": "Antônio Souza Oliveira", "matricula": "2026102007", "label_esperado": "MEDIO",
     "media": 5.8, "freq": 72.5, "reprovas": 2, "renda": 2800, "trabalha": True,
     "desloc": 75, "diff_acesso": "MEDIA", "computador": True, "internet": True,
     "bolsa": False, "primeira_ger": True},
    
    {"nome": "Joana Rodrigues Souza", "matricula": "2026102008", "label_esperado": "MEDIO",
     "media": 6.2, "freq": 75.0, "reprovas": 2, "renda": 3500, "trabalha": True,
     "desloc": 55, "diff_acesso": "MEDIA", "computador": True, "internet": True,
     "bolsa": False, "primeira_ger": False},
    
    # RISCO ALTO - 6 alunos esperados
    {"nome": "Carlos Mendes Duarte", "matricula": "2026102009", "label_esperado": "ALTO",
     "media": 5.5, "freq": 70.0, "reprovas": 3, "renda": 2200, "trabalha": True,
     "desloc": 80, "diff_acesso": "DIFICIL", "computador": True, "internet": False,
     "bolsa": False, "primeira_ger": True},
    
    {"nome": "Josefa Barbosa Nunes", "matricula": "2026102010", "label_esperado": "ALTO",
     "media": 5.0, "freq": 68.5, "reprovas": 3, "renda": 2500, "trabalha": True,
     "desloc": 95, "diff_acesso": "DIFICIL", "computador": False, "internet": False,
     "bolsa": True, "primeira_ger": True},
    
    {"nome": "Manuel Ferreira Lima", "matricula": "2026102011", "label_esperado": "ALTO",
     "media": 4.8, "freq": 66.0, "reprovas": 3, "renda": 1800, "trabalha": True,
     "desloc": 70, "diff_acesso": "MEDIA", "computador": False, "internet": True,
     "bolsa": True, "primeira_ger": True},
    
    {"nome": "Raimunda Mendes Duarte", "matricula": "2026102012", "label_esperado": "ALTO",
     "media": 5.2, "freq": 70.5, "reprovas": 2, "renda": 2000, "trabalha": True,
     "desloc": 65, "diff_acesso": "MEDIA", "computador": True, "internet": False,
     "bolsa": True, "primeira_ger": True},
    
    {"nome": "Sebastião Oliveira Santos", "matricula": "2026102013", "label_esperado": "ALTO",
     "media": 4.2, "freq": 65.0, "reprovas": 4, "renda": 1500, "trabalha": True,
     "desloc": 85, "diff_acesso": "DIFICIL", "computador": False, "internet": False,
     "bolsa": True, "primeira_ger": True},
    
    {"nome": "Teresa Lima Rodrigues", "matricula": "2026102014", "label_esperado": "ALTO",
     "media": 4.5, "freq": 68.0, "reprovas": 3, "renda": 1600, "trabalha": True,
     "desloc": 90, "diff_acesso": "DIFICIL", "computador": False, "internet": True,
     "bolsa": True, "primeira_ger": True},
    
    # MUITO ALTO - 6 alunos esperados
    {"nome": "Francisco Alves da Silva", "matricula": "2026102015", "label_esperado": "MUITO_ALTO",
     "media": 3.5, "freq": 58.0, "reprovas": 4, "renda": 900, "trabalha": True,
     "desloc": 100, "diff_acesso": "DIFICIL", "computador": False, "internet": False,
     "bolsa": True, "primeira_ger": True},
    
    {"nome": "Antônia Pereira Lima", "matricula": "2026102016", "label_esperado": "MUITO_ALTO",
     "media": 3.8, "freq": 55.0, "reprovas": 5, "renda": 800, "trabalha": True,
     "desloc": 110, "diff_acesso": "MUITO_DIFICIL", "computador": False, "internet": False,
     "bolsa": True, "primeira_ger": True},
    
    {"nome": "José Barbosa Rocha", "matricula": "2026102017", "label_esperado": "MUITO_ALTO",
     "media": 3.2, "freq": 52.0, "reprovas": 5, "renda": 700, "trabalha": True,
     "desloc": 120, "diff_acesso": "MUITO_DIFICIL", "computador": False, "internet": False,
     "bolsa": True, "primeira_ger": True},
    
    {"nome": "Pedro Ferreira Rocha", "matricula": "2026102018", "label_esperado": "MUITO_ALTO",
     "media": 2.8, "freq": 48.0, "reprovas": 6, "renda": 650, "trabalha": True,
     "desloc": 130, "diff_acesso": "MUITO_DIFICIL", "computador": False, "internet": False,
     "bolsa": True, "primeira_ger": True},
    
    {"nome": "Raimundo Nonato Silva", "matricula": "2026102019", "label_esperado": "MUITO_ALTO",
     "media": 2.5, "freq": 45.0, "reprovas": 7, "renda": 600, "trabalha": True,
     "desloc": 140, "diff_acesso": "MUITO_DIFICIL", "computador": False, "internet": False,
     "bolsa": True, "primeira_ger": True},
    
    {"nome": "Sebastiana Araújo Santos", "matricula": "2026102020", "label_esperado": "MUITO_ALTO",
     "media": 2.2, "freq": 42.0, "reprovas": 8, "renda": 550, "trabalha": True,
     "desloc": 150, "diff_acesso": "MUITO_DIFICIL", "computador": False, "internet": False,
     "bolsa": True, "primeira_ger": True},
]


class MockAluno:
    """Mock de aluno para passar ao fallback"""
    def __init__(self, dados):
        self.matricula = dados['matricula']
        self.nome = dados['nome']
        self.media_geral = dados['media']
        self.frequencia = dados['freq']
        self.historico_reprovas = dados['reprovas']
        self.renda_familiar = dados['renda']
        self.trabalha = dados['trabalha']
        self.carga_horaria_trabalho = 40 if dados['trabalha'] else 0
        self.tempo_deslocamento = dados['desloc']
        self.dificuldade_acesso = dados['diff_acesso']
        self.possui_computador = dados['computador']
        self.possui_internet = dados['internet']
        self.beneficiario_bolsa_familia = dados['bolsa']
        self.primeiro_geracao_universidade = dados['primeira_ger']
        self.possui_auxilio = dados['bolsa']


def validar_fallback():
    """Executa validação simulada do Fallback"""
    
    print("=" * 80)
    print("🧪 VALIDAÇÃO SIMULADA DO FALLBACK V2")
    print("=" * 80)
    print()
    print("⚠️  IMPORTANTE: Isso é um teste de consistência interna, NÃO uma validação real.")
    print("    Os labels são simulados baseados em perfis, não em evasões reais.")
    print()
    
    resultados = []
    
    for aluno_data in ALUNOS_TESTE:
        mock = MockAluno(aluno_data)
        
        # Rodar fallback
        resultado = fallback_logic_v2(mock, db=None)
        
        score_predito = resultado['risco_evasao']
        nivel_predito = resultado['nivel_risco'].value if hasattr(resultado['nivel_risco'], 'value') else str(resultado['nivel_risco'])
        label_esperado = aluno_data['label_esperado']
        
        # Determinar se acertou
        # Acerta se: predição está no mesmo grupo ou adjacente
        acerto = False
        tipo_acerto = ""
        
        hierarquia = ['BAIXO', 'MEDIO', 'ALTO', 'MUITO_ALTO']
        idx_predito = hierarquia.index(nivel_predito) if nivel_predito in hierarquia else -1
        idx_esperado = hierarquia.index(label_esperado) if label_esperado in hierarquia else -1
        
        if idx_predito == idx_esperado:
            acerto = True
            tipo_acerto = "EXATO"
        elif abs(idx_predito - idx_esperado) == 1:
            acerto = True
            tipo_acerto = "ADJACENTE"  # Ex: esperava MEDIO, predito ALTO - próximo
        else:
            acerto = False
            tipo_acerto = "DISTANTE"
        
        resultados.append({
            'nome': aluno_data['nome'],
            'matricula': aluno_data['matricula'],
            'label_esperado': label_esperado,
            'nivel_predito': nivel_predito,
            'score_predito': score_predito,
            'acerto': acerto,
            'tipo_acerto': tipo_acerto,
            'distancia': abs(idx_predito - idx_esperado)
        })
    
    # ============================================
    # EXIBIR RESULTADOS INDIVIDUAIS
    # ============================================
    print("📊 RESULTADOS INDIVIDUAIS:")
    print("-" * 80)
    print(f"{'#':<3} {'Nome':<30} {'Esperado':<12} {'Predito':<12} {'Score':>8} {'Status':<12}")
    print("-" * 80)
    
    for i, r in enumerate(resultados, 1):
        status_icon = "✅" if r['acerto'] else "❌"
        print(f"{i:<3} {r['nome']:<30} {r['label_esperado']:<12} {r['nivel_predito']:<12} {r['score_predito']:>6}% {status_icon} {r['tipo_acerto']}")
    
    print()
    
    # ============================================
    # CALCULAR MÉTRICAS
    # ============================================
    total = len(resultados)
    acertos_exatos = sum(1 for r in resultados if r['tipo_acerto'] == 'EXATO')
    acertos_adjacentes = sum(1 for r in resultados if r['tipo_acerto'] == 'ADJACENTE')
    erros = sum(1 for r in resultados if not r['acerto'])
    
    acuracia_exata = acertos_exatos / total if total > 0 else 0
    acuracia_ampla = (acertos_exatos + acertos_adjacentes) / total if total > 0 else 0
    
    # Para precisão/recall, consideramos ALTO/MUITO_ALTO como "positivo"
    tp = sum(1 for r in resultados if r['label_esperado'] in ['ALTO', 'MUITO_ALTO'] and r['nivel_predito'] in ['ALTO', 'MUITO_ALTO'])
    fp = sum(1 for r in resultados if r['label_esperado'] not in ['ALTO', 'MUITO_ALTO'] and r['nivel_predito'] in ['ALTO', 'MUITO_ALTO'])
    fn = sum(1 for r in resultados if r['label_esperado'] in ['ALTO', 'MUITO_ALTO'] and r['nivel_predito'] not in ['ALTO', 'MUITO_ALTO'])
    tn = sum(1 for r in resultados if r['label_esperado'] not in ['ALTO', 'MUITO_ALTO'] and r['nivel_predito'] not in ['ALTO', 'MUITO_ALTO'])
    
    precisao = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precisao * recall) / (precisao + recall) if (precisao + recall) > 0 else 0
    
    # ============================================
    # EXIBIR MÉTRICAS
    # ============================================
    print("=" * 80)
    print("📈 MÉTRICAS DE CONSISTÊNCIA:")
    print("=" * 80)
    print()
    print(f"Total de alunos testados: {total}")
    print(f"Acertos exatos:           {acertos_exatos}/{total} ({acuracia_exata*100:.1f}%)")
    print(f"Acertos amplos (±1):      {acertos_exatos + acertos_adjacentes}/{total} ({acuracia_ampla*100:.1f}%)")
    print(f"Erros distantes:          {erros}/{total} ({erros/total*100:.1f}%)")
    print()
    print("Matriz de Confusão (ALTO/MUITO_ALTO vs resto):")
    print(f"  Verdadeiros Positivos:  {tp}")
    print(f"  Verdadeiros Negativos:  {tn}")
    print(f"  Falsos Positivos:       {fp}")
    print(f"  Falsos Negativos:       {fn}")
    print()
    print(f"Precisão:                 {precisao*100:.1f}%")
    print(f"Recall:                   {recall*100:.1f}%")
    print(f"F1-Score:                 {f1:.3f}")
    print()
    
    # ============================================
    # AVALIAÇÃO FINAL
    # ============================================
    print("=" * 80)
    print("🎯 AVALIAÇÃO FINAL:")
    print("=" * 80)
    
    if acuracia_ampla >= 0.8:
        print("✅ CONSISTENTE: Fallback classifica de forma coerente na maioria dos casos.")
    elif acuracia_ampla >= 0.6:
        print("⚠️  PARCIALMENTE CONSISTENTE: Fallback tem acertos mas com margem de erro significativa.")
    else:
        print("❌ INCONSISTENTE: Fallback precisa de revisão nos pesos/limiares.")
    
    if erros > 0:
        print()
        print("Alunos com classificação distante:")
        for r in resultados:
            if not r['acerto']:
                print(f"  ❌ {r['nome']}: Esperava {r['label_esperado']}, predito {r['nivel_predito']}")
    
    print()
    print("=" * 80)
    print("⚠️  LEMBRE: Isso é consistência INTERNA, NÃO acurácia REAL.")
    print("    Para validar de verdade, precisa de dados históricos de evasão.")
    print("=" * 80)


if __name__ == "__main__":
    validar_fallback()
