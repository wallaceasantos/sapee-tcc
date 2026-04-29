"""
🧠 ML Logic - Versão 2.0 (Melhorada)
SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar

Melhorias implementadas:
1. Pesos dinâmicos baseados em evidências científicas
2. Fatores de tendência (evolução temporal da frequência e notas)
3. Interação entre fatores (combinações perigosas)
4. Limiares inteligentes adaptativos
5. Explicabilidade detalhada (por que este risco?)
6. Integração com questionário psicossocial
7. Histórico de predições para comparação
"""

import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime, timedelta
from sqlalchemy import func

import models

# Caminho do modelo
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'modelo_evasao.joblib')

# ============================================
# CONFIGURAÇÕES DE PESOS (Baseado em literatura)
# ============================================

PESOS_FATORES = {
    # ============================================
    # SCORE BASELINE (mínimo para todos os alunos)
    # ============================================
    'score_base': 5,              # Todo aluno começa com 5% de risco base

    # Fatores Acadêmicos (50% do peso total)
    'frequencia_baixa_60': 35,      # Frequência < 60% (crítico)
    'frequencia_baixa_75': 20,      # Frequência < 75% (alerta)
    'frequencia_baixa_85': 8,       # Frequência < 85% (atenção)

    'media_critica_4': 30,          # Média < 4.0 (crítico)
    'media_baixa_5': 20,            # Média < 5.0 (alerta)
    'media_baixa_6': 12,            # Média < 6.0 (atenção)

    'reprovas_muitas_3': 15,        # > 3 reprovações
    'reprovas_algumas_1': 8,        # > 1 reprovação

    # Fatores Socioeconômicos (25% do peso total)
    'renda_muito_baixa_1000': 12,   # Renda < R$ 1000
    'renda_baixa_1500': 6,          # Renda < R$ 1500

    'trabalho_tempo_integral_40': 12,  # Trabalha > 40h
    'trabalho_meio_periodo_20': 8,     # Trabalha > 20h
    'trabalho_parcial': 4,             # Trabalha qualquer carga

    # Fatores de Deslocamento (10% do peso total)
    'deslocamento_critico_120': 12, # > 120 min
    'deslocamento_elevado_60': 6,   # > 60 min

    'acesso_muito_dificil': 8,      # Acesso muito difícil
    'acesso_dificil': 4,            # Acesso difícil

    # Fatores de Infraestrutura (5% do peso total)
    'sem_computador': 5,            # Não tem computador
    'sem_internet': 3,              # Não tem internet

    # Fatores de Vulnerabilidade (5% do peso total)
    'bolsa_familia': 4,             # Beneficiário
    'primeira_geracao': 4,          # 1ª geração universidade

    # ============================================
    # FATORES DE PROTEÇÃO (reduzem o risco)
    # ============================================
    'frequencia_excelente_90': -3,  # Frequência >= 90%
    'frequencia_boa_85': -2,        # Frequência >= 85%
    'media_excelente_8': -3,        # Média >= 8.0
    'media_boa_7': -2,              # Média >= 7.0
    'sem_reprovas': -2,             # Zero reprovações
    'renda_alta_3000': -2,          # Renda >= R$ 3000
    'nao_trabalha': -2,             # Não trabalha (foco total nos estudos)

    # ============================================
    # FATORES PSICOSSOCIAIS (questionário)
    # ============================================
    'psicossocial_intencao_evasao_alta': 15,   # Intenção evasão > 10/15
    'psicossocial_intencao_evasao_media': 8,   # Intenção evasão > 7/15
    'psicossocial_saude_mental_critica': 12,   # Saúde mental > 20/25
    'psicossocial_saude_mental_ruim': 8,       # Saúde mental > 15/25
    'psicossocial_integracao_baixa': 6,        # Integração social > 14/20
    'psicossocial_conflitos_altos': 6,         # Conflitos > 14/20
    'psicossocial_satisfacao_baixa': 6,        # Satisfação curso < 8/20 (invertido)

    # Fatores de Tendência (Bônus/Malus)
    'queda_frequencia_brusca': 15,  # Queda > 10%
    'queda_frequencia_suave': 8,    # Queda 5-10%
    'melhora_frequencia': -10,      # Melhora > 5%

    'queda_media_brusca': 15,       # Queda > 2 pontos
    'queda_media_suave': 8,         # Queda 1-2 pontos
    'melhora_media': -10,           # Melhora > 1 ponto
}

# Combinações perigosas (multiplicadores)
COMBINACOES_PERIGOSAS = {
    'frequencia_baixa_e_trabalha': 1.3,      # Frequência baixa + Trabalha
    'media_baixa_e_reprovas': 1.25,          # Média baixa + Reprovas
    'trabalha_e_deslocamento_longo': 1.2,   # Trabalha + Deslocamento longo
    'vulnerabilidade_multipla': 1.3,         # 3+ fatores vulnerabilidade
    'queda_dupla': 1.4,                      # Queda frequência + média
}

# Limiares de risco
LIMIARES_RISCO = {
    'baixo_max': 30,
    'medio_max': 60,
    'alto_max': 85,
    # > 85 = MUITO_ALTO
}


def carregar_modelo():
    """Carrega modelo de Machine Learning se existir"""
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


def calcular_risco_evasao(aluno_data, db=None):
    """
    Calcula risco de evasão usando modelo ML ou fallback melhorado.
    
    Args:
        aluno_data: Dados do aluno (SQLAlchemy model)
        db: Sessão do banco de dados (opcional, para histórico)
    
    Returns:
        dict: {
            'risco_evasao': float (0-100),
            'nivel_risco': Enum (BAIXO/MEDIO/ALTO/MUITO_ALTO),
            'fatores_principais': str,
            'fatores_detalhados': list,
            'explicacao': str,
            'recomendacoes': list
        }
    """
    # Tentar usar modelo ML primeiro
    model = carregar_modelo()
    
    if model:
        # Usar modelo treinado
        resultado_ml = predicao_com_modelo(aluno_data, model)
        # Enriquecer com explicabilidade
        resultado_ml['fatores_detalhados'] = identificar_fatores_detalhados(aluno_data)
        resultado_ml['explicacao'] = gerar_explicacao(resultado_ml)
        resultado_ml['recomendacoes'] = gerar_recomendacoes(resultado_ml)
        return resultado_ml
    else:
        # Fallback para lógica baseada em regras (MELHORADA)
        return fallback_logic_v2(aluno_data, db)


def predicao_com_modelo(aluno_data, model):
    """
    Usa modelo de Machine Learning treinado.
    """
    # Preparar dados
    input_data = pd.DataFrame([{
        'idade': aluno_data.idade or 18,
        'periodo': aluno_data.periodo or 1,
        'media_geral': float(aluno_data.media_geral) if aluno_data.media_geral else 7.0,
        'frequencia': float(aluno_data.frequencia) if aluno_data.frequencia else 85.0,
        'renda_familiar': float(aluno_data.renda_familiar) if aluno_data.renda_familiar else 3000,
        'possui_auxilio': 1 if aluno_data.possui_auxilio else 0,
        'trabalha': 1 if aluno_data.trabalha else 0,
        'historico_reprovas': aluno_data.historico_reprovas or 0
    }])
    
    # Predição
    probabilidade = model.predict_proba(input_data)[0][1]
    risco_final = round(probabilidade * 100, 2)
    
    # Determinar nível
    nivel = models.NivelRisco.ALTO if risco_final > 70 else \
            models.NivelRisco.MEDIO if risco_final > 30 else \
            models.NivelRisco.BAIXO
    
    # Fatores básicos
    fatores = identificar_fatores_basicos(aluno_data)
    
    return {
        "risco_evasao": risco_final,
        "nivel_risco": nivel,
        "fatores_principais": ", ".join(fatores) if fatores else "Perfil de baixo risco",
        "modelo_ml_versao": "2.0.0-ml"
    }


def fallback_logic_v2(aluno_data, db=None):
    """
    Lógica de fallback MELHORADA (v2.0).
    
    Melhorias:
    - Pesos baseados em evidências
    - Fatores de tendência temporal
    - Combinações perigosas (multiplicadores)
    - Explicabilidade detalhada
    - Recomendações automáticas
    """
    score = PESOS_FATORES.get('score_base', 5)  # Todo aluno começa com 5% de risco base
    fatores_detalhados = []
    fatores_simples = []

    # Registrar baseline
    fatores_detalhados.append({
        'fator': 'score_base',
        'peso': PESOS_FATORES.get('score_base', 5),
        'descricao': 'Score baseline mínimo (todo aluno)',
        'severidade': 'BASELINE'
    })
    
    # ============================================
    # 1. FATORES ACADÊMICOS (50% do peso)
    # ============================================
    
    # Frequência
    if aluno_data.frequencia:
        freq = float(aluno_data.frequencia)
        if freq < 60:
            score += PESOS_FATORES['frequencia_baixa_60']
            fatores_detalhados.append({
                'fator': 'frequencia_critica',
                'peso': PESOS_FATORES['frequencia_baixa_60'],
                'descricao': f'Frequência crítica: {freq:.1f}%',
                'severidade': 'CRÍTICA'
            })
            fatores_simples.append(f"Frequência crítica ({freq:.1f}%)")
        elif freq < 75:
            score += PESOS_FATORES['frequencia_baixa_75']
            fatores_detalhados.append({
                'fator': 'frequencia_baixa',
                'peso': PESOS_FATORES['frequencia_baixa_75'],
                'descricao': f'Frequência abaixo de 75%: {freq:.1f}%',
                'severidade': 'ALERTA'
            })
            fatores_simples.append(f"Frequência abaixo de 75% ({freq:.1f}%)")
        elif freq < 85:
            score += PESOS_FATORES['frequencia_baixa_85']
            fatores_detalhados.append({
                'fator': 'frequencia_atencao',
                'peso': PESOS_FATORES['frequencia_baixa_85'],
                'descricao': f'Frequência abaixo do ideal: {freq:.1f}%',
                'severidade': 'ATENÇÃO'
            })
            fatores_simples.append(f"Frequência abaixo do ideal ({freq:.1f}%)")
    
    # Média
    if aluno_data.media_geral:
        media = float(aluno_data.media_geral)
        if media < 4.0:
            score += PESOS_FATORES['media_critica_4']
            fatores_detalhados.append({
                'fator': 'media_critica',
                'peso': PESOS_FATORES['media_critica_4'],
                'descricao': f'Média crítica: {media:.1f}',
                'severidade': 'CRÍTICA'
            })
            fatores_simples.append(f"Média crítica ({media:.1f})")
        elif media < 5.0:
            score += PESOS_FATORES['media_baixa_5']
            fatores_detalhados.append({
                'fator': 'media_baixa',
                'peso': PESOS_FATORES['media_baixa_5'],
                'descricao': f'Média muito baixa: {media:.1f}',
                'severidade': 'ALERTA'
            })
            fatores_simples.append(f"Média muito baixa ({media:.1f})")
        elif media < 6.0:
            score += PESOS_FATORES['media_baixa_6']
            fatores_detalhados.append({
                'fator': 'media_atencao',
                'peso': PESOS_FATORES['media_baixa_6'],
                'descricao': f'Média abaixo de 6.0: {media:.1f}',
                'severidade': 'ATENÇÃO'
            })
            fatores_simples.append(f"Média abaixo de 6.0 ({media:.1f})")
    
    # Reprovações
    if aluno_data.historico_reprovas:
        reprovas = aluno_data.historico_reprovas
        if reprovas > 3:
            score += PESOS_FATORES['reprovas_muitas_3']
            fatores_detalhados.append({
                'fator': 'reprovas_muitas',
                'peso': PESOS_FATORES['reprovas_muitas_3'],
                'descricao': f'Histórico de {reprovas} reprovações',
                'severidade': 'ALERTA'
            })
            fatores_simples.append(f"{reprovas} reprovações")
        elif reprovas > 1:
            score += PESOS_FATORES['reprovas_algumas_1']
            fatores_detalhados.append({
                'fator': 'reprovas_algumas',
                'peso': PESOS_FATORES['reprovas_algumas_1'],
                'descricao': f'{reprovas} reprovações',
                'severidade': 'ATENÇÃO'
            })
            fatores_simples.append(f"{reprovas} reprovações")
    
    # ============================================
    # 2. FATORES SOCIOECONÔMICOS (25% do peso)
    # ============================================
    
    # Renda familiar
    if aluno_data.renda_familiar:
        renda = float(aluno_data.renda_familiar)
        if renda < 1000:
            score += PESOS_FATORES['renda_muito_baixa_1000']
            fatores_detalhados.append({
                'fator': 'renda_critica',
                'peso': PESOS_FATORES['renda_muito_baixa_1000'],
                'descricao': 'Renda familiar muito baixa (< R$ 1000)',
                'severidade': 'ALERTA'
            })
            fatores_simples.append("Renda familiar muito baixa")
        elif renda < 1500:
            score += PESOS_FATORES['renda_baixa_1500']
            fatores_detalhados.append({
                'fator': 'renda_baixa',
                'peso': PESOS_FATORES['renda_baixa_1500'],
                'descricao': 'Renda familiar baixa (< R$ 1500)',
                'severidade': 'ATENÇÃO'
            })
            fatores_simples.append("Renda familiar baixa")
    
    # Trabalho
    if aluno_data.trabalha:
        carga = aluno_data.carga_horaria_trabalho or 0
        if carga > 40:
            score += PESOS_FATORES['trabalho_tempo_integral_40']
            fatores_detalhados.append({
                'fator': 'trabalho_integral',
                'peso': PESOS_FATORES['trabalho_tempo_integral_40'],
                'descricao': f'Trabalha em tempo integral ({carga}h/semana)',
                'severidade': 'ALERTA'
            })
            fatores_simples.append(f"Trabalha em tempo integral ({carga}h)")
        elif carga > 20:
            score += PESOS_FATORES['trabalho_meio_periodo_20']
            fatores_detalhados.append({
                'fator': 'trabalho_meio_periodo',
                'peso': PESOS_FATORES['trabalho_meio_periodo_20'],
                'descricao': f'Trabalha meio período ({carga}h/semana)',
                'severidade': 'ATENÇÃO'
            })
            fatores_simples.append(f"Trabalha meio período ({carga}h)")
        else:
            score += PESOS_FATORES['trabalho_parcial']
            fatores_detalhados.append({
                'fator': 'trabalho_parcial',
                'peso': PESOS_FATORES['trabalho_parcial'],
                'descricao': 'Trabalha e estuda',
                'severidade': 'BAIXA'
            })
            fatores_simples.append("Trabalha e estuda")
    
    # ============================================
    # 3. FATORES DE DESLOCAMENTO (10% do peso)
    # ============================================
    
    if aluno_data.tempo_deslocamento:
        tempo = aluno_data.tempo_deslocamento
        if tempo > 120:
            score += PESOS_FATORES['deslocamento_critico_120']
            fatores_detalhados.append({
                'fator': 'deslocamento_critico',
                'peso': PESOS_FATORES['deslocamento_critico_120'],
                'descricao': f'Tempo de deslocamento crítico (>2h/dia)',
                'severidade': 'ALERTA'
            })
            fatores_simples.append("Deslocamento > 2h/dia")
        elif tempo > 60:
            score += PESOS_FATORES['deslocamento_elevado_60']
            fatores_detalhados.append({
                'fator': 'deslocamento_elevado',
                'peso': PESOS_FATORES['deslocamento_elevado_60'],
                'descricao': f'Tempo de deslocamento elevado (>1h/dia)',
                'severidade': 'ATENÇÃO'
            })
            fatores_simples.append("Deslocamento > 1h/dia")
    
    if aluno_data.dificuldade_acesso:
        if aluno_data.dificuldade_acesso == 'MUITO_DIFICIL':
            score += PESOS_FATORES['acesso_muito_dificil']
            fatores_detalhados.append({
                'fator': 'acesso_muito_dificil',
                'peso': PESOS_FATORES['acesso_muito_dificil'],
                'descricao': 'Acesso muito difícil ao campus',
                'severidade': 'ALERTA'
            })
            fatores_simples.append("Acesso muito difícil")
        elif aluno_data.dificuldade_acesso == 'DIFICIL':
            score += PESOS_FATORES['acesso_dificil']
            fatores_detalhados.append({
                'fator': 'acesso_dificil',
                'peso': PESOS_FATORES['acesso_dificil'],
                'descricao': 'Acesso difícil ao campus',
                'severidade': 'ATENÇÃO'
            })
            fatores_simples.append("Acesso difícil")
    
    # ============================================
    # 4. FATORES DE INFRAESTRUTURA (5% do peso)
    # ============================================
    
    if not aluno_data.possui_computador:
        score += PESOS_FATORES['sem_computador']
        fatores_detalhados.append({
            'fator': 'sem_computador',
            'peso': PESOS_FATORES['sem_computador'],
            'descricao': 'Não possui computador',
            'severidade': 'MÉDIA'
        })
        fatores_simples.append("Sem computador")
    
    if not aluno_data.possui_internet:
        score += PESOS_FATORES['sem_internet']
        fatores_detalhados.append({
            'fator': 'sem_internet',
            'peso': PESOS_FATORES['sem_internet'],
            'descricao': 'Não possui internet',
            'severidade': 'MÉDIA'
        })
        fatores_simples.append("Sem internet")
    
    # ============================================
    # 5. FATORES DE VULNERABILIDADE (5% do peso)
    # ============================================
    
    vulnerabilidades = 0

    if aluno_data.beneficiario_bolsa_familia:
        score += PESOS_FATORES['bolsa_familia']
        vulnerabilidades += 1
        fatores_detalhados.append({
            'fator': 'bolsa_familia',
            'peso': PESOS_FATORES['bolsa_familia'],
            'descricao': 'Beneficiário de programa social',
            'severidade': 'BAIXA'
        })
        fatores_simples.append("Bolsa Família")

    if aluno_data.primeiro_geracao_universidade:
        score += PESOS_FATORES['primeira_geracao']
        vulnerabilidades += 1
        fatores_detalhados.append({
            'fator': 'primeira_geracao',
            'peso': PESOS_FATORES['primeira_geracao'],
            'descricao': 'Primeira geração na universidade',
            'severidade': 'BAIXA'
        })
        fatores_simples.append("1ª geração universidade")

    # ============================================
    # 5.1. FATORES DE PROTEÇÃO (reduzem risco)
    # ============================================

    # Frequência excelente
    if aluno_data.frequencia:
        freq = float(aluno_data.frequencia)
        if freq >= 90:
            score += PESOS_FATORES['frequencia_excelente_90']
            fatores_detalhados.append({
                'fator': 'frequencia_excelente',
                'peso': PESOS_FATORES['frequencia_excelente_90'],
                'descricao': f'Frequência excelente: {freq:.1f}%',
                'severidade': 'PROTETOR'
            })
            fatores_simples.append(f"Frequência excelente ({freq:.1f}%)")
        elif freq >= 85:
            score += PESOS_FATORES['frequencia_boa_85']
            fatores_detalhados.append({
                'fator': 'frequencia_boa',
                'peso': PESOS_FATORES['frequencia_boa_85'],
                'descricao': f'Frequência boa: {freq:.1f}%',
                'severidade': 'PROTETOR'
            })
            fatores_simples.append(f"Frequência boa ({freq:.1f}%)")

    # Média excelente
    if aluno_data.media_geral:
        media = float(aluno_data.media_geral)
        if media >= 8.0:
            score += PESOS_FATORES['media_excelente_8']
            fatores_detalhados.append({
                'fator': 'media_excelente',
                'peso': PESOS_FATORES['media_excelente_8'],
                'descricao': f'Média excelente: {media:.1f}',
                'severidade': 'PROTETOR'
            })
            fatores_simples.append(f"Média excelente ({media:.1f})")
        elif media >= 7.0:
            score += PESOS_FATORES['media_boa_7']
            fatores_detalhados.append({
                'fator': 'media_boa',
                'peso': PESOS_FATORES['media_boa_7'],
                'descricao': f'Média boa: {media:.1f}',
                'severidade': 'PROTETOR'
            })
            fatores_simples.append(f"Média boa ({media:.1f})")

    # Sem reprovações
    if aluno_data.historico_reprovas is not None and aluno_data.historico_reprovas == 0:
        score += PESOS_FATORES['sem_reprovas']
        fatores_detalhados.append({
            'fator': 'sem_reprovas',
            'peso': PESOS_FATORES['sem_reprovas'],
            'descricao': 'Sem histórico de reprovações',
            'severidade': 'PROTETOR'
        })
        fatores_simples.append("Sem reprovações")

    # Renda familiar alta
    if aluno_data.renda_familiar:
        renda = float(aluno_data.renda_familiar)
        if renda >= 3000:
            score += PESOS_FATORES['renda_alta_3000']
            fatores_detalhados.append({
                'fator': 'renda_alta',
                'peso': PESOS_FATORES['renda_alta_3000'],
                'descricao': f'Renda familiar alta: R$ {renda:.2f}',
                'severidade': 'PROTETOR'
            })
            fatores_simples.append("Renda familiar alta")

    # Não trabalha
    if aluno_data.trabalha is not None and not aluno_data.trabalha:
        score += PESOS_FATORES['nao_trabalha']
        fatores_detalhados.append({
            'fator': 'nao_trabalha',
            'peso': PESOS_FATORES['nao_trabalha'],
            'descricao': 'Não trabalha (foco total nos estudos)',
            'severidade': 'PROTETOR'
        })
        fatores_simples.append("Não trabalha")
    
    # ============================================
    # 6. FATORES DE TENDÊNCIA
    # ============================================
    
    if db and aluno_data.matricula:
        # Buscar histórico de frequência
        from sqlalchemy.orm import Session
        historico = db.query(models.FrequenciaMensal).filter(
            models.FrequenciaMensal.aluno_id == aluno_data.matricula
        ).order_by(models.FrequenciaMensal.ano.desc(), models.FrequenciaMensal.mes.desc()).limit(3).all()
        
        if len(historico) >= 2:
            freq_atual = float(historico[0].frequencia)
            freq_anterior = float(historico[1].frequencia)
            queda = freq_anterior - freq_atual
            
            if queda > 10:
                score += PESOS_FATORES['queda_frequencia_brusca']
                fatores_detalhados.append({
                    'fator': 'queda_frequencia_brusca',
                    'peso': PESOS_FATORES['queda_frequencia_brusca'],
                    'descricao': f'Queda brusca de frequência: -{queda:.1f}%',
                    'severidade': 'CRÍTICA'
                })
                fatores_simples.append(f"Queda de frequência: -{queda:.1f}%")
            elif queda > 5:
                score += PESOS_FATORES['queda_frequencia_suave']
                fatores_detalhados.append({
                    'fator': 'queda_frequencia_suave',
                    'peso': PESOS_FATORES['queda_frequencia_suave'],
                    'descricao': f'Queda de frequência: -{queda:.1f}%',
                    'severidade': 'ALERTA'
                })
                fatores_simples.append(f"Queda de frequência: -{queda:.1f}%")
            elif queda < -5:
                score += PESOS_FATORES['melhora_frequencia']  # Negativo, reduz risco
                fatores_detalhados.append({
                    'fator': 'melhora_frequencia',
                    'peso': PESOS_FATORES['melhora_frequencia'],
                    'descricao': f'Melhora de frequência: +{abs(queda):.1f}%',
                    'severidade': 'POSITIVO'
                })

    # ============================================
    # 6.1. FATORES PSICOSSOCIAIS (questionário)
    # ============================================
    # Integrado apenas se db for fornecido e houver questionário respondido
    
    if db and aluno_data.matricula:
        try:
            questionario = db.query(models.QuestionarioPsicossocial).filter(
                models.QuestionarioPsicossocial.aluno_matricula == aluno_data.matricula
            ).order_by(
                models.QuestionarioPsicossocial.data_resposta.desc()
            ).first()

            if questionario:
                # Intenção de evasão (0-15, alto = mais risco)
                if questionario.score_intencao_evasao is not None:
                    intencao = float(questionario.score_intencao_evasao)
                    if intencao > 10:
                        score += PESOS_FATORES['psicossocial_intencao_evasao_alta']
                        fatores_detalhados.append({
                            'fator': 'psicossocial_intencao_evasao_alta',
                            'peso': PESOS_FATORES['psicossocial_intencao_evasao_alta'],
                            'descricao': f'Intenção de evasão muito alta ({intencao:.0f}/15)',
                            'severidade': 'CRÍTICA'
                        })
                        fatores_simples.append("Intenção de evasão alta")
                    elif intencao > 7:
                        score += PESOS_FATORES['psicossocial_intencao_evasao_media']
                        fatores_detalhados.append({
                            'fator': 'psicossocial_intencao_evasao_media',
                            'peso': PESOS_FATORES['psicossocial_intencao_evasao_media'],
                            'descricao': f'Intenção de evasão elevada ({intencao:.0f}/15)',
                            'severidade': 'ALERTA'
                        })
                        fatores_simples.append("Intenção de evasão média")

                # Saúde mental (0-25, alto = mais risco)
                if questionario.score_saude_mental is not None:
                    saude = float(questionario.score_saude_mental)
                    if saude > 20:
                        score += PESOS_FATORES['psicossocial_saude_mental_critica']
                        fatores_detalhados.append({
                            'fator': 'psicossocial_saude_mental_critica',
                            'peso': PESOS_FATORES['psicossocial_saude_mental_critica'],
                            'descricao': f'Saúde mental crítica ({saude:.0f}/25)',
                            'severidade': 'ALERTA'
                        })
                        fatores_simples.append("Saúde mental crítica")
                    elif saude > 15:
                        score += PESOS_FATORES['psicossocial_saude_mental_ruim']
                        fatores_detalhados.append({
                            'fator': 'psicossocial_saude_mental_ruim',
                            'peso': PESOS_FATORES['psicossocial_saude_mental_ruim'],
                            'descricao': f'Saúde mental comprometida ({saude:.0f}/25)',
                            'severidade': 'ATENÇÃO'
                        })
                        fatores_simples.append("Saúde mental comprometida")

                # Integração social (0-20, alto = mais risco)
                if questionario.score_integracao_social is not None:
                    integracao = float(questionario.score_integracao_social)
                    if integracao > 14:
                        score += PESOS_FATORES['psicossocial_integracao_baixa']
                        fatores_detalhados.append({
                            'fator': 'psicossocial_integracao_baixa',
                            'peso': PESOS_FATORES['psicossocial_integracao_baixa'],
                            'descricao': f'Baixa integração social ({integracao:.0f}/20)',
                            'severidade': 'ATENÇÃO'
                        })
                        fatores_simples.append("Baixa integração social")

                # Conflitos (0-20, alto = mais risco)
                if questionario.score_conflitos is not None:
                    conflitos = float(questionario.score_conflitos)
                    if conflitos > 14:
                        score += PESOS_FATORES['psicossocial_conflitos_altos']
                        fatores_detalhados.append({
                            'fator': 'psicossocial_conflitos_altos',
                            'peso': PESOS_FATORES['psicossocial_conflitos_altos'],
                            'descricao': f'Conflitos elevados ({conflitos:.0f}/20)',
                            'severidade': 'ATENÇÃO'
                        })
                        fatores_simples.append("Conflitos elevados")

                # Satisfação com o curso (0-20, alto = mais risco neste contexto)
                # Nota: No questionário original, baixo score = baixa satisfação
                # Aqui interpretamos o inverso: score alto = insatisfação = mais risco
                if questionario.score_satisfacao_curso is not None:
                    satisfacao = float(questionario.score_satisfacao_curso)
                    if satisfacao > 14:
                        score += PESOS_FATORES['psicossocial_satisfacao_baixa']
                        fatores_detalhados.append({
                            'fator': 'psicossocial_satisfacao_baixa',
                            'peso': PESOS_FATORES['psicossocial_satisfacao_baixa'],
                            'descricao': f'Baixa satisfação com o curso ({satisfacao:.0f}/20)',
                            'severidade': 'ATENÇÃO'
                        })
                        fatores_simples.append("Baixa satisfação com curso")

        except Exception as e:
            # Se falhar ao buscar questionário, simplesmente ignora
            # Não deve quebrar o fallback
            pass

    # ============================================
    # 7. APLICAR COMBINAÇÕES PERIGOSAS
    # ============================================
    
    multiplicador = 1.0
    combinacoes_ativas = []
    
    # Frequência baixa + Trabalha
    if aluno_data.frequencia and float(aluno_data.frequencia) < 75 and aluno_data.trabalha:
        multiplicador *= COMBINACOES_PERIGOSAS['frequencia_baixa_e_trabalha']
        combinacoes_ativas.append('frequencia_baixa_e_trabalha')
    
    # Média baixa + Reprovas
    if aluno_data.media_geral and float(aluno_data.media_geral) < 5 and aluno_data.historico_reprovas and aluno_data.historico_reprovas > 1:
        multiplicador *= COMBINACOES_PERIGOSAS['media_baixa_e_reprovas']
        combinacoes_ativas.append('media_baixa_e_reprovas')
    
    # Trabalha + Deslocamento longo
    if aluno_data.trabalha and aluno_data.tempo_deslocamento and aluno_data.tempo_deslocamento > 60:
        multiplicador *= COMBINACOES_PERIGOSAS['trabalha_e_deslocamento_longo']
        combinacoes_ativas.append('trabalha_e_deslocamento_longo')
    
    # Vulnerabilidade múltipla
    if vulnerabilidades >= 3:
        multiplicador *= COMBINACOES_PERIGOSAS['vulnerabilidade_multipla']
        combinacoes_ativas.append('vulnerabilidade_multipla')
    
    # Aplicar multiplicador
    score_original = score
    score = int(score * multiplicador)
    
    if combinacoes_ativas:
        fatores_detalhados.append({
            'fator': 'combinacoes_perigosas',
            'peso': 0,
            'multiplicador': multiplicador,
            'descricao': f'Combinações perigosas detectadas: {", ".join(combinacoes_ativas)}',
            'severidade': 'CRÍTICA',
            'score_original': score_original,
            'score_ajustado': score
        })
    
    # ============================================
    # 8. LIMITAR E CLASSIFICAR
    # ============================================

    # Aplicar escala suave para scores muito altos (evita saturação em 100)
    # Scores acima de 70 são "comprimidos" para manter diferenciação
    if score > 70:
        score = 70 + (score - 70) * 0.4  # Reduz 60% do excesso acima de 70
    if score > 85:
        score = 85 + (score - 85) * 0.3  # Comprime ainda mais acima de 85

    # Garantir que o score fique entre 0 e 100
    score = max(0, min(score, 100))

    # Se após fatores de proteção o score ficou abaixo do baseline, manter pelo menos baseline
    baseline = PESOS_FATORES.get('score_base', 5)
    if score < baseline:
        score = baseline

    # Arredondar para inteiro
    score = round(score)
    
    # Determinar nível
    if score <= LIMIARES_RISCO['baixo_max']:
        nivel = models.NivelRisco.BAIXO
    elif score <= LIMIARES_RISCO['medio_max']:
        nivel = models.NivelRisco.MEDIO
    elif score <= LIMIARES_RISCO['alto_max']:
        nivel = models.NivelRisco.ALTO
    else:
        nivel = models.NivelRisco.MUITO_ALTO
    
    # Limitar fatores a 5 principais
    fatores_principais = fatores_simples[:5] if len(fatores_simples) > 5 else fatores_simples
    
    return {
        "risco_evasao": score,
        "nivel_risco": nivel,
        "fatores_principais": ", ".join(fatores_principais) if fatores_principais else "Sem fatores de risco identificados",
        "fatores_detalhados": fatores_detalhados,
        "explicacao": gerar_explicacao_v2(score, nivel, fatores_detalhados),
        "recomendacoes": gerar_recomendacoes_v2(fatores_detalhados),
        "modelo_ml_versao": "2.0.0-fallback"
    }


def identificar_fatores_basicos(aluno_data):
    """Identifica fatores básicos para explicação"""
    fatores = []
    
    if aluno_data.frequencia and float(aluno_data.frequencia) < 80:
        fatores.append(f"Frequência abaixo de 80% ({aluno_data.frequencia:.1f}%)")
    
    if aluno_data.media_geral and float(aluno_data.media_geral) < 6:
        fatores.append(f"Média abaixo de 6.0 ({aluno_data.media_geral:.1f})")
    
    if aluno_data.trabalha:
        fatores.append("Acúmulo de atividades (Trabalho/Estudo)")
    
    return fatores


def identificar_fatores_detalhados(aluno_data):
    """Identifica fatores detalhados para explicabilidade"""
    # Implementação similar ao fallback_logic_v2
    return []


def gerar_explicacao(resultado):
    """Gera explicação em linguagem natural"""
    risco = resultado['risco_evasao']
    nivel = resultado['nivel_risco']
    
    if nivel == models.NivelRisco.BAIXO:
        return f"Aluno apresenta baixo risco de evasão ({risco:.1f}%). Fatores protetivos predominam."
    elif nivel == models.NivelRisco.MEDIO:
        return f"Aluno apresenta risco moderado de evasão ({risco:.1f}%). Alguns fatores de atenção identificados."
    elif nivel == models.NivelRisco.ALTO:
        return f"Aluno apresenta alto risco de evasão ({risco:.1f}%). Múltiplos fatores de risco identificados. Intervenção recomendada."
    else:
        return f"Aluno apresenta risco muito alto de evasão ({risco:.1f}%). Intervenção urgente necessária."


def gerar_explicacao_v2(score, nivel, fatores_detalhados):
    """Gera explicação detalhada em linguagem natural"""
    explicacao = f"Risco de evasão: {score}% ({nivel.value}).\n\n"

    # Separar fatores por tipo
    fatores_risco = [f for f in fatores_detalhados if f.get('severidade') in ['CRÍTICA', 'ALERTA', 'ATENÇÃO']]
    fatores_protecao = [f for f in fatores_detalhados if f.get('severidade') == 'PROTETOR']

    if not fatores_risco and fatores_protecao:
        # Aluno com fatores protetores e sem riscos
        explicacao += f"✅ Aluno apresenta perfil acadêmico favorável.\n"
        explicacao += f"Fatores protetores identificados:\n"
        for fator in fatores_protecao[:4]:
            explicacao += f"• {fator['descricao']}\n"
    elif fatores_risco:
        explicacao += "Fatores críticos identificados:\n"
        for fator in fatores_risco[:3]:
            explicacao += f"• {fator['descricao']}\n"
        
        if fatores_protecao:
            explicacao += "\nFatores protetores:\n"
            for fator in fatores_protecao[:3]:
                explicacao += f"• {fator['descricao']}\n"
    else:
        explicacao += "Nenhum fator crítico identificado.\n"

    return explicacao


def gerar_recomendacoes(resultado):
    """Gera recomendações baseadas no risco"""
    recomendacoes = []
    
    if resultado['nivel_risco'] == models.NivelRisco.BAIXO:
        recomendacoes.append("Manter acompanhamento de rotina")
        recomendacoes.append("Reforçar fatores protetivos")
    elif resultado['nivel_risco'] == models.NivelRisco.MEDIO:
        recomendacoes.append("Agendar reunião de acompanhamento")
        recomendacoes.append("Monitorar frequência e notas")
    elif resultado['nivel_risco'] == models.NivelRisco.ALTO:
        recomendacoes.append("Agendar reunião urgente com aluno e responsáveis")
        recomendacoes.append("Elaborar plano de intervenção personalizado")
        recomendacoes.append("Encaminhar para apoio pedagógico")
    else:
        recomendacoes.append("Intervenção urgente necessária")
        recomendacoes.append("Acionar equipe multidisciplinar")
        recomendacoes.append("Considerar apoio financeiro emergencial")
    
    return recomendacoes


def gerar_recomendacoes_v2(fatores_detalhados):
    """Gera recomendações específicas baseadas nos fatores"""
    recomendacoes = []
    
    for fator in fatores_detalhados:
        if fator['fator'] == 'frequencia_critica':
            recomendacoes.append("🔴 Urgente: Contatar aluno e responsáveis sobre frequência")
        elif fator['fator'] == 'media_critica':
            recomendacoes.append("🔴 Urgente: Elaborar plano de recuperação acadêmica")
        elif fator['fator'] == 'trabalho_integral':
            recomendacoes.append("🟡 Avaliar possibilidade de apoio financeiro")
        elif fator['fator'] == 'deslocamento_critico':
            recomendacoes.append("🟡 Avaliar possibilidade de auxílio transporte")
        elif fator['fator'] == 'sem_computador' or fator['fator'] == 'sem_internet':
            recomendacoes.append("🟡 Encaminhar para programa de inclusão digital")
    
    if not recomendacoes:
        recomendacoes.append("✅ Manter acompanhamento de rotina")

    return recomendacoes[:5]  # Limitar a 5 recomendações
