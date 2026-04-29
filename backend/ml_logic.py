import pandas as pd
import numpy as np
import joblib
import os
import models

# Caminho do modelo
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'modelo_evasao.joblib')

def carregar_modelo():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None

def calcular_risco_evasao(aluno_data, db=None):
    """
    Usa o modelo de Machine Learning treinado para prever o risco.
    Agora considera a evolução da frequência!
    """
    model = carregar_modelo()

    # Se o modelo não existir, usa uma lógica de fallback (regras)
    if not model:
        return fallback_logic(aluno_data, db)

    # Preparar dados para o modelo (deve seguir a mesma ordem do treino)
    input_data = pd.DataFrame([{
        'idade': aluno_data.idade,
        'periodo': aluno_data.periodo,
        'media_geral': aluno_data.media_geral,
        'frequencia': aluno_data.frequencia,
        'renda_familiar': aluno_data.renda_familiar,
        'possui_auxilio': 1 if aluno_data.possui_auxilio else 0,
        'trabalha': 1 if aluno_data.trabalha else 0,
        'historico_reprovas': aluno_data.historico_reprovas
    }])

    # Predição de probabilidade (0 a 1)
    probabilidade = model.predict_proba(input_data)[0][1]
    risco_final = round(probabilidade * 100, 2)

    # Identificar fatores (baseado na importância das variáveis ou regras simples para o insight)
    fatores = []
    if aluno_data.frequencia < 80: fatores.append("Frequência crítica")
    if aluno_data.media_geral < 6: fatores.append("Desempenho acadêmico instável")
    if aluno_data.trabalha: fatores.append("Acúmulo de atividades (Trabalho/Estudo)")

    # Determinar Nível
    if risco_final > 70:
        nivel = models.NivelRisco.ALTO
    elif risco_final > 30:
        nivel = models.NivelRisco.MEDIO
    else:
        nivel = models.NivelRisco.BAIXO

    return {
        "risco_evasao": risco_final,
        "nivel_risco": nivel,
        "fatores_principais": ", ".join(fatores) if fatores else "Perfil de baixo risco"
    }

def fallback_logic(aluno_data, db=None):
    """
    Lógica de fallback caso o modelo .joblib não tenha sido gerado ainda.
    AGORA: Mostra fatores específicos e detalhados com pesos ajustados!
    """
    score = 0
    fatores = []

    # Fatores Acadêmicos (Peso ALTO - Máximo 50 pontos)
    if aluno_data.frequencia and aluno_data.frequencia < 60:
        score += 35
        fatores.append(f"Frequência crítica ({aluno_data.frequencia:.1f}%)")
    elif aluno_data.frequencia and aluno_data.frequencia < 75:
        score += 25
        fatores.append(f"Frequência abaixo de 75% ({aluno_data.frequencia:.1f}%)")
    elif aluno_data.frequencia and aluno_data.frequencia < 85:
        score += 10
        fatores.append(f"Frequência abaixo do ideal ({aluno_data.frequencia:.1f}%)")

    if aluno_data.media_geral and aluno_data.media_geral < 4:
        score += 30
        fatores.append(f"Média crítica ({aluno_data.media_geral:.1f})")
    elif aluno_data.media_geral and aluno_data.media_geral < 5:
        score += 20
        fatores.append(f"Média muito baixa ({aluno_data.media_geral:.1f})")
    elif aluno_data.media_geral and aluno_data.media_geral < 6:
        score += 10
        fatores.append(f"Média abaixo de 6.0 ({aluno_data.media_geral:.1f})")

    if aluno_data.historico_reprovas and aluno_data.historico_reprovas > 3:
        score += 20
        fatores.append(f"Histórico de {aluno_data.historico_reprovas} reprovações")
    elif aluno_data.historico_reprovas and aluno_data.historico_reprovas > 1:
        score += 10
        fatores.append(f"{aluno_data.historico_reprovas} reprovações")

    # Fatores Socioeconômicos (Peso MÉDIO - Máximo 25 pontos)
    if aluno_data.renda_familiar and aluno_data.renda_familiar < 1000:
        score += 15
        fatores.append("Renda familiar muito baixa")
    elif aluno_data.renda_familiar and aluno_data.renda_familiar < 1500:
        score += 8
        fatores.append("Renda familiar baixa")

    if aluno_data.trabalha:
        if aluno_data.carga_horaria_trabalho and aluno_data.carga_horaria_trabalho > 40:
            score += 15
            fatores.append(f"Trabalha em tempo integral ({aluno_data.carga_horaria_trabalho}h/semana)")
        elif aluno_data.carga_horaria_trabalho and aluno_data.carga_horaria_trabalho > 20:
            score += 10
            fatores.append(f"Trabalha meio período ({aluno_data.carga_horaria_trabalho}h/semana)")
        else:
            score += 5
            fatores.append("Trabalha e estuda")

    # Fatores de Deslocamento (Peso BAIXO - Máximo 15 pontos)
    if aluno_data.tempo_deslocamento and aluno_data.tempo_deslocamento > 120:
        score += 15
        fatores.append("Tempo de deslocamento crítico (>2h/dia)")
    elif aluno_data.tempo_deslocamento and aluno_data.tempo_deslocamento > 60:
        score += 8
        fatores.append("Tempo de deslocamento elevado (>1h/dia)")

    if aluno_data.dificuldade_acesso == 'MUITO_DIFICIL':
        score += 10
        fatores.append("Acesso muito difícil ao campus")
    elif aluno_data.dificuldade_acesso == 'DIFICIL':
        score += 5
        fatores.append("Acesso difícil ao campus")

    # Fatores de Infraestrutura (Peso BAIXO - Máximo 10 pontos)
    if not aluno_data.possui_computador:
        score += 6
        fatores.append("Não possui computador")

    if not aluno_data.possui_internet:
        score += 4
        fatores.append("Não possui internet")

    # Fatores de Vulnerabilidade (Peso BAIXO - Máximo 10 pontos)
    if aluno_data.beneficiario_bolsa_familia:
        score += 5
        fatores.append("Beneficiário de programa social")

    if aluno_data.primeiro_geracao_universidade:
        score += 5
        fatores.append("Primeira geração na universidade")

    # Limitar score máximo a 100
    score = min(score, 100)

    # Limitar a 5 fatores principais
    fatores_principais = fatores[:5] if len(fatores) > 5 else fatores

    return {
        "risco_evasao": score,
        "nivel_risco": models.NivelRisco.ALTO if score > 70 else models.NivelRisco.MEDIO if score > 30 else models.NivelRisco.BAIXO,
        "fatores_principais": ", ".join(fatores_principais) if fatores_principais else "Sem fatores de risco identificados"
    }


# ============================================
# QUESTIONÁRIO PSICOSSOCIAL - CÁLCULO DE RISCO
# ============================================

def calcular_risco_psicossocial(respostas: dict) -> dict:
    """
    Calcula o risco psicossocial baseado nas respostas do questionário.
    
    5 Dimensões:
    1. Saúde Mental (0-25 pontos)
    2. Integração Social (0-20 pontos)
    3. Satisfação com Curso (0-20 pontos)
    4. Conflitos (0-20 pontos)
    5. Intenção de Evasão (0-15 pontos)
    
    Total: 0-100 pontos
    
    Níveis:
    - BAIXO: 0-30
    - MÉDIO: 31-55
    - ALTO: 56-75
    - MUITO ALTO: 76-100
    """
    
    # ============================================
    # DIMENSÃO 1: SAÚDE MENTAL (0-25 pontos)
    # ============================================
    # Questões: q1, q2, q3, q4, q5 (invertida)
    q1 = respostas.get('q1_ansiedade', 3) or 3
    q2 = respostas.get('q2_depressao', 3) or 3
    q3 = respostas.get('q3_estresse', 3) or 3
    q4 = respostas.get('q4_sono', 3) or 3
    q5 = respostas.get('q5_bem_estar', 3) or 3
    
    # q5 é invertida: 1→5, 2→4, 3→3, 4→2, 5→1
    q5_invertida = 6 - q5
    
    score_saude_mental = (q1 + q2 + q3 + q4 + q5_invertida) * 1.25
    score_saude_mental = min(max(score_saude_mental, 0), 25)  # Clamp 0-25
    
    # ============================================
    # DIMENSÃO 2: INTEGRAÇÃO SOCIAL (0-20 pontos)
    # ============================================
    q6 = respostas.get('q6_pertencimento', 3) or 3
    q7 = respostas.get('q7_amizades', 3) or 3
    q8 = respostas.get('q8_participacao', 3) or 3
    q9 = respostas.get('q9_relacionamento_professores', 3) or 3
    q10 = respostas.get('q10_apoio_colegas', 3) or 3
    
    # Quanto menor a soma, menos integrado → mais risco
    # Inverter: 5→1, 4→2, 3→3, 2→4, 1→5
    score_integracao_social = (6 - q6) + (6 - q7) + (6 - q8) + (6 - q9) + (6 - q10)
    score_integracao_social = min(max(score_integracao_social, 0), 20)
    
    # ============================================
    # DIMENSÃO 3: SATISFAÇÃO COM CURSO (0-20 pontos)
    # ============================================
    q11 = respostas.get('q11_expectativas', 3) or 3
    q12 = respostas.get('q12_qualidade_aulas', 3) or 3
    q13 = respostas.get('q13_infraestrutura', 3) or 3
    q14 = respostas.get('q14_conteudo_programatico', 3) or 3
    q15 = respostas.get('q15_motivacao_curso', 3) or 3
    
    # Inverter: quanto menor satisfação, mais risco
    score_satisfacao_curso = (6 - q11) + (6 - q12) + (6 - q13) + (6 - q14) + (6 - q15)
    score_satisfacao_curso = min(max(score_satisfacao_curso, 0), 20)
    
    # ============================================
    # DIMENSÃO 4: CONFLITOS (0-20 pontos)
    # ============================================
    q16 = respostas.get('q16_trabalho_estudo', 3) or 3
    q17 = respostas.get('q17_familia_estudo', 3) or 3  # invertida
    q18 = respostas.get('q18_tempo_lazer', 3) or 3      # invertida
    q19 = respostas.get('q19_cansaco', 3) or 3
    q20 = respostas.get('q20_sobrecarga', 3) or 3
    
    # q17 e q18 são invertidas
    q17_invertida = 6 - q17
    q18_invertida = 6 - q18
    
    score_conflitos = q16 + q17_invertida + q18_invertida + q19 + q20
    score_conflitos = min(max(score_conflitos, 0), 20)
    
    # ============================================
    # DIMENSÃO 5: INTENÇÃO DE EVASÃO (0-15 pontos)
    # ============================================
    q21 = respostas.get('q21_pensou_abandonar', 3) or 3
    q22 = respostas.get('q22_frequencia_pensamento', 3) or 3
    q23 = respostas.get('q23_motivacao_permanencia', 3) or 3  # invertida
    q24 = respostas.get('q24_plano_abandonar', 3) or 3
    q25 = respostas.get('q25_previsao_abandono', 3) or 3
    
    # q23 é invertida
    q23_invertida = 6 - q23
    
    score_intencao_evasao = (q21 + q22 + q23_invertida + q24 + q25) * 0.75
    score_intencao_evasao = min(max(score_intencao_evasao, 0), 15)
    
    # ============================================
    # SCORE TOTAL (0-100 pontos)
    # ============================================
    score_total = (
        score_saude_mental +
        score_integracao_social +
        score_satisfacao_curso +
        score_conflitos +
        score_intencao_evasao
    )
    score_total = min(max(score_total, 0), 100)
    
    # ============================================
    # NÍVEL DE RISCO
    # ============================================
    # Ajuste de limiares baseado na distribuição esperada
    # Respostas neutras (3) geram score ~50, então:
    # - BAIXO: 0-40 (aluno com respostas 1-2 na maioria)
    # - MÉDIO: 41-60 (aluno com algumas preocupações)
    # - ALTO: 61-85 (aluno com múltiplos fatores de risco)
    # - MUITO ALTO: 86-100 (aluno com respostas 4-5 na maioria)
    if score_total <= 40:
        nivel_risco = "BAIXO"
    elif score_total <= 60:
        nivel_risco = "MEDIO"
    elif score_total <= 85:
        nivel_risco = "ALTO"
    else:
        nivel_risco = "MUITO_ALTO"
    
    # ============================================
    # IDENTIFICAR FATORES CRÍTICOS
    # ============================================
    fatores_criticos = []
    
    # Saúde Mental Crítica
    if score_saude_mental >= 18:  # 72% do máximo
        fatores_criticos.append("ansiedade_severa")
    if q2 >= 4 or q3 >= 4:
        fatores_criticos.append("sintomas_depressivos")
    if q4 >= 4:
        fatores_criticos.append("disturbios_sono")
    
    # Isolamento Social
    if score_integracao_social >= 15:
        fatores_criticos.append("isolamento_social")
    if q6 <= 2 or q7 <= 2:
        fatores_criticos.append("falta_pertencimento")
    
    # Insatisfação com Curso
    if score_satisfacao_curso >= 15:
        fatores_criticos.append("insatisfacao_curso")
    if q15 <= 2:
        fatores_criticos.append("desmotivacao_curso")
    
    # Conflito Trabalho-Estudo
    if score_conflitos >= 15:
        fatores_criticos.append("conflito_trabalho_estudo")
    if q16 >= 4:
        fatores_criticos.append("trabalho_atrapalha_estudos")
    if q20 >= 4:
        fatores_criticos.append("sobrecarga_responsabilidades")
    
    # Intenção de Evasão
    if score_intencao_evasao >= 10:
        fatores_criticos.append("intencao_evasao_alta")
    if q24 >= 4 or q25 >= 4:
        fatores_criticos.append("risco_evasao_iminente")
    
    # ============================================
    # BÔNUS DE RISCO PARA MODELO PRINCIPAL
    # ============================================
    if nivel_risco == "MUITO_ALTO":
        bonus_risco = 20
    elif nivel_risco == "ALTO":
        bonus_risco = 15
    elif nivel_risco == "MEDIO":
        bonus_risco = 8
    else:
        bonus_risco = 0
    
    return {
        "score_saude_mental": round(score_saude_mental, 2),
        "score_integracao_social": round(score_integracao_social, 2),
        "score_satisfacao_curso": round(score_satisfacao_curso, 2),
        "score_conflitos": round(score_conflitos, 2),
        "score_intencao_evasao": round(score_intencao_evasao, 2),
        "score_psicossocial_total": round(score_total, 2),
        "nivel_risco_psicossocial": nivel_risco,
        "fatores_criticos": fatores_criticos,
        "bonus_risco_modelo": bonus_risco
    }


def get_perguntas_questionario() -> list:
    """
    Retorna a lista completa de perguntas do questionário psicossocial.
    """
    return [
        {
            "bloco": "SAÚDE MENTAL",
            "perguntas": [
                {"id": "q1_ansiedade", "texto": "Sinto ansiedade frequente relacionada aos estudos"},
                {"id": "q2_depressao", "texto": "Tenho me sentido desanimado(a) com frequência"},
                {"id": "q3_estresse", "texto": "O estresse está afetando meu desempenho"},
                {"id": "q4_sono", "texto": "Tenho tido dificuldades para dormir por preocupações com a escola"},
                {"id": "q5_bem_estar", "texto": "Me sinto bem emocionalmente para estudar", "invertida": True}
            ]
        },
        {
            "bloco": "INTEGRAÇÃO SOCIAL",
            "perguntas": [
                {"id": "q6_pertencimento", "texto": "Me sinto parte da turma"},
                {"id": "q7_amizades", "texto": "Tenho amigos na escola com quem posso contar"},
                {"id": "q8_participacao", "texto": "Participo de atividades extracurriculares da escola"},
                {"id": "q9_relacionamento_professores", "texto": "Tenho bom relacionamento com os professores"},
                {"id": "q10_apoio_colegas", "texto": "Posso contar com colegas para dificuldades acadêmicas"}
            ]
        },
        {
            "bloco": "SATISFAÇÃO COM O CURSO",
            "perguntas": [
                {"id": "q11_expectativas", "texto": "O curso atende minhas expectativas"},
                {"id": "q12_qualidade_aulas", "texto": "As aulas são de boa qualidade"},
                {"id": "q13_infraestrutura", "texto": "A infraestrutura da escola me atende"},
                {"id": "q14_conteudo_programatico", "texto": "O conteúdo programático é relevante para mim"},
                {"id": "q15_motivacao_curso", "texto": "Estou motivado(a) com o curso"}
            ]
        },
        {
            "bloco": "CONFLITOS",
            "perguntas": [
                {"id": "q16_trabalho_estudo", "texto": "O trabalho atrapalha meus estudos"},
                {"id": "q17_familia_estudo", "texto": "Minha família apoia meus estudos", "invertida": True},
                {"id": "q18_tempo_lazer", "texto": "Tenho tempo para lazer e descanso", "invertida": True},
                {"id": "q19_cansaco", "texto": "Sinto cansaço excessivo no dia a dia"},
                {"id": "q20_sobrecarga", "texto": "Me sinto sobrecarregado(a) de responsabilidades"}
            ]
        },
        {
            "bloco": "INTENÇÃO DE EVASÃO",
            "perguntas": [
                {"id": "q21_pensou_abandonar", "texto": "Já pensei em abandonar o curso"},
                {"id": "q22_frequencia_pensamento", "texto": "Com que frequência penso em abandonar o curso"},
                {"id": "q23_motivacao_permanencia", "texto": "Estou motivado(a) a permanecer no curso", "invertida": True},
                {"id": "q24_plano_abandonar", "texto": "Tenho um plano de abandonar o curso"},
                {"id": "q25_previsao_abandono", "texto": "Devo abandonar o curso em breve"}
            ]
        }
    ]
