"""
🧠 TESTE DO QUESTIONÁRIO PSICOSSOCIAL
SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar

Este script testa o cálculo de risco psicossocial com dados simulados.

Execução:
    python backend/testar_questionario_psicossocial.py
"""

import sys
from ml_logic import calcular_risco_psicossocial, get_perguntas_questionario
import json

def imprimir_cabecalho(texto):
    print("=" * 80)
    print(texto)
    print("=" * 80)
    print()

def testar_calculo_risco():
    """Testa o cálculo de risco psicossocial com diferentes perfis"""
    
    imprimir_cabecalho("🧠 TESTE DE CÁLCULO - QUESTIONÁRIO PSICOSSOCIAL")
    
    # ============================================
    # PERFIL 1: ALUNO BAIXO RISCO
    # ============================================
    print("📊 PERFIL 1: ALUNO COM BAIXO RISCO PSICOSSOCIAL")
    print("-" * 80)
    
    perfil_baixo_risco = {
        # Saúde Mental - Bom estado
        "q1_ansiedade": 1,
        "q2_depressao": 1,
        "q3_estresse": 2,
        "q4_sono": 1,
        "q5_bem_estar": 5,  # Invertida: bem-estar bom
        
        # Integração Social - Bem integrado
        "q6_pertencimento": 5,
        "q7_amizades": 5,
        "q8_participacao": 4,
        "q9_relacionamento_professores": 5,
        "q10_apoio_colegas": 5,
        
        # Satisfação Curso - Satisfeito
        "q11_expectativas": 5,
        "q12_qualidade_aulas": 5,
        "q13_infraestrutura": 4,
        "q14_conteudo_programatico": 5,
        "q15_motivacao_curso": 5,
        
        # Conflitos - Poucos conflitos
        "q16_trabalho_estudo": 1,
        "q17_familia_estudo": 5,  # Invertida: família apoia
        "q18_tempo_lazer": 5,      # Invertida: tem tempo
        "q19_cansaco": 1,
        "q20_sobrecarga": 1,
        
        # Intenção Evasão - Nenhuma intenção
        "q21_pensou_abandonar": 1,
        "q22_frequencia_pensamento": 1,
        "q23_motivacao_permanencia": 5,  # Invertida: motivado
        "q24_plano_abandonar": 1,
        "q25_previsao_abandono": 1
    }
    
    resultado_baixo = calcular_risco_psicossocial(perfil_baixo_risco)
    
    print(f"Score Saúde Mental:        {resultado_baixo['score_saude_mental']:.2f} / 25")
    print(f"Score Integração Social:   {resultado_baixo['score_integracao_social']:.2f} / 20")
    print(f"Score Satisfação Curso:    {resultado_baixo['score_satisfacao_curso']:.2f} / 20")
    print(f"Score Conflitos:           {resultado_baixo['score_conflitos']:.2f} / 20")
    print(f"Score Intenção Evasão:     {resultado_baixo['score_intencao_evasao']:.2f} / 15")
    print("-" * 80)
    print(f"SCORE TOTAL:               {resultado_baixo['score_psicossocial_total']:.2f} / 100")
    print(f"NÍVEL DE RISCO:            {resultado_baixo['nivel_risco_psicossocial']}")
    print(f"FATORES CRÍTICOS:          {resultado_baixo['fatores_criticos']}")
    print(f"BÔNUS RISCO MODELO:        +{resultado_baixo['bonus_risco_modelo']} pontos")
    print()
    
    # ============================================
    # PERFIL 2: ALUNO MÉDIO RISCO
    # ============================================
    print("📊 PERFIL 2: ALUNO COM MÉDIO RISCO PSICOSSOCIAL")
    print("-" * 80)
    
    perfil_medio_risco = {
        # Saúde Mental - Alguns sintomas
        "q1_ansiedade": 2,
        "q2_depressao": 2,
        "q3_estresse": 2,
        "q4_sono": 2,
        "q5_bem_estar": 4,
        
        # Integração Social - Regular
        "q6_pertencimento": 3,
        "q7_amizades": 4,
        "q8_participacao": 3,
        "q9_relacionamento_professores": 3,
        "q10_apoio_colegas": 4,
        
        # Satisfação Curso - Neutro
        "q11_expectativas": 3,
        "q12_qualidade_aulas": 4,
        "q13_infraestrutura": 3,
        "q14_conteudo_programatico": 3,
        "q15_motivacao_curso": 4,
        
        # Conflitos - Alguns conflitos
        "q16_trabalho_estudo": 2,
        "q17_familia_estudo": 4,
        "q18_tempo_lazer": 4,
        "q19_cansaco": 2,
        "q20_sobrecarga": 2,
        
        # Intenção Evasão - Pouca intenção
        "q21_pensou_abandonar": 2,
        "q22_frequencia_pensamento": 1,
        "q23_motivacao_permanencia": 4,
        "q24_plano_abandonar": 1,
        "q25_previsao_abandono": 1
    }
    
    resultado_medio = calcular_risco_psicossocial(perfil_medio_risco)
    
    print(f"Score Saúde Mental:        {resultado_medio['score_saude_mental']:.2f} / 25")
    print(f"Score Integração Social:   {resultado_medio['score_integracao_social']:.2f} / 20")
    print(f"Score Satisfação Curso:    {resultado_medio['score_satisfacao_curso']:.2f} / 20")
    print(f"Score Conflitos:           {resultado_medio['score_conflitos']:.2f} / 20")
    print(f"Score Intenção Evasão:     {resultado_medio['score_intencao_evasao']:.2f} / 15")
    print("-" * 80)
    print(f"SCORE TOTAL:               {resultado_medio['score_psicossocial_total']:.2f} / 100")
    print(f"NÍVEL DE RISCO:            {resultado_medio['nivel_risco_psicossocial']}")
    print(f"FATORES CRÍTICOS:          {resultado_medio['fatores_criticos']}")
    print(f"BÔNUS RISCO MODELO:        +{resultado_medio['bonus_risco_modelo']} pontos")
    print()
    
    # ============================================
    # PERFIL 3: ALUNO ALTO RISCO
    # ============================================
    print("📊 PERFIL 3: ALUNO COM ALTO RISCO PSICOSSOCIAL")
    print("-" * 80)
    
    perfil_alto_risco = {
        # Saúde Mental - Moderado a alto
        "q1_ansiedade": 3,
        "q2_depressao": 3,
        "q3_estresse": 3,
        "q4_sono": 3,
        "q5_bem_estar": 3,  # Invertida: neutro
        
        # Integração Social - Algum isolamento
        "q6_pertencimento": 2,
        "q7_amizades": 3,
        "q8_participacao": 2,
        "q9_relacionamento_professores": 3,
        "q10_apoio_colegas": 3,
        
        # Satisfação Curso - Alguma insatisfação
        "q11_expectativas": 2,
        "q12_qualidade_aulas": 3,
        "q13_infraestrutura": 3,
        "q14_conteudo_programatico": 2,
        "q15_motivacao_curso": 3,
        
        # Conflitos - Conflitos significativos
        "q16_trabalho_estudo": 4,
        "q17_familia_estudo": 3,
        "q18_tempo_lazer": 3,
        "q19_cansaco": 4,
        "q20_sobrecarga": 4,
        
        # Intenção Evasão - Considerando
        "q21_pensou_abandonar": 3,
        "q22_frequencia_pensamento": 3,
        "q23_motivacao_permanencia": 3,
        "q24_plano_abandonar": 2,
        "q25_previsao_abandono": 2
    }
    
    resultado_alto = calcular_risco_psicossocial(perfil_alto_risco)
    
    print(f"Score Saúde Mental:        {resultado_alto['score_saude_mental']:.2f} / 25")
    print(f"Score Integração Social:   {resultado_alto['score_integracao_social']:.2f} / 20")
    print(f"Score Satisfação Curso:    {resultado_alto['score_satisfacao_curso']:.2f} / 20")
    print(f"Score Conflitos:           {resultado_alto['score_conflitos']:.2f} / 20")
    print(f"Score Intenção Evasão:     {resultado_alto['score_intencao_evasao']:.2f} / 15")
    print("-" * 80)
    print(f"SCORE TOTAL:               {resultado_alto['score_psicossocial_total']:.2f} / 100")
    print(f"NÍVEL DE RISCO:            {resultado_alto['nivel_risco_psicossocial']}")
    print(f"FATORES CRÍTICOS:          {resultado_alto['fatores_criticos']}")
    print(f"BÔNUS RISCO MODELO:        +{resultado_alto['bonus_risco_modelo']} pontos")
    print()
    
    # ============================================
    # PERFIL 4: ALUNO MUITO ALTO RISCO (CRÍTICO)
    # ============================================
    print("📊 PERFIL 4: ALUNO COM MUITO ALTO RISCO PSICOSSOCIAL (CRÍTICO)")
    print("-" * 80)
    
    perfil_muito_alto_risco = {
        # Saúde Mental - Muito crítico
        "q1_ansiedade": 5,
        "q2_depressao": 5,
        "q3_estresse": 5,
        "q4_sono": 5,
        "q5_bem_estar": 1,
        
        # Integração Social - Muito isolado
        "q6_pertencimento": 1,
        "q7_amizades": 1,
        "q8_participacao": 1,
        "q9_relacionamento_professores": 1,
        "q10_apoio_colegas": 1,
        
        # Satisfação Curso - Muito insatisfeito
        "q11_expectativas": 1,
        "q12_qualidade_aulas": 1,
        "q13_infraestrutura": 1,
        "q14_conteudo_programatico": 1,
        "q15_motivacao_curso": 1,
        
        # Conflitos - Crítico
        "q16_trabalho_estudo": 5,
        "q17_familia_estudo": 1,
        "q18_tempo_lazer": 1,
        "q19_cansaco": 5,
        "q20_sobrecarga": 5,
        
        # Intenção Evasão - Iminente
        "q21_pensou_abandonar": 5,
        "q22_frequencia_pensamento": 5,
        "q23_motivacao_permanencia": 1,
        "q24_plano_abandonar": 5,
        "q25_previsao_abandono": 5
    }
    
    resultado_muito_alto = calcular_risco_psicossocial(perfil_muito_alto_risco)
    
    print(f"Score Saúde Mental:        {resultado_muito_alto['score_saude_mental']:.2f} / 25")
    print(f"Score Integração Social:   {resultado_muito_alto['score_integracao_social']:.2f} / 20")
    print(f"Score Satisfação Curso:    {resultado_muito_alto['score_satisfacao_curso']:.2f} / 20")
    print(f"Score Conflitos:           {resultado_muito_alto['score_conflitos']:.2f} / 20")
    print(f"Score Intenção Evasão:     {resultado_muito_alto['score_intencao_evasao']:.2f} / 15")
    print("-" * 80)
    print(f"SCORE TOTAL:               {resultado_muito_alto['score_psicossocial_total']:.2f} / 100")
    print(f"NÍVEL DE RISCO:            {resultado_muito_alto['nivel_risco_psicossocial']}")
    print(f"FATORES CRÍTICOS:          {len(resultado_muito_alto['fatores_criticos'])} fatores")
    print(f"  → {', '.join(resultado_muito_alto['fatores_criticos'])}")
    print(f"BÔNUS RISCO MODELO:        +{resultado_muito_alto['bonus_risco_modelo']} pontos")
    print()
    
    # ============================================
    # RESUMO DOS TESTES
    # ============================================
    imprimir_cabecalho("✅ RESUMO DOS TESTES")
    
    print(f"{'Perfil':<20} {'Score Total':<15} {'Nível Risco':<15} {'Bônus Modelo':<15}")
    print("-" * 80)
    print(f"{'Baixo Risco':<20} {resultado_baixo['score_psicossocial_total']:<15.2f} {resultado_baixo['nivel_risco_psicossocial']:<15} +{resultado_baixo['bonus_risco_modelo']:<14}")
    print(f"{'Médio Risco':<20} {resultado_medio['score_psicossocial_total']:<15.2f} {resultado_medio['nivel_risco_psicossocial']:<15} +{resultado_medio['bonus_risco_modelo']:<14}")
    print(f"{'Alto Risco':<20} {resultado_alto['score_psicossocial_total']:<15.2f} {resultado_alto['nivel_risco_psicossocial']:<15} +{resultado_alto['bonus_risco_modelo']:<14}")
    print(f"{'Muito Alto Risco':<20} {resultado_muito_alto['score_psicossocial_total']:<15.2f} {resultado_muito_alto['nivel_risco_psicossocial']:<15} +{resultado_muito_alto['bonus_risco_modelo']:<14}")
    print()
    
    # Validar resultados
    testes_passaram = True
    
    if resultado_baixo['nivel_risco_psicossocial'] != 'BAIXO':
        print("❌ ERRO: Perfil baixo risco não resultou em nível BAIXO")
        testes_passaram = False
    
    if resultado_medio['nivel_risco_psicossocial'] != 'MEDIO':
        print("❌ ERRO: Perfil médio risco não resultou em nível MEDIO")
        testes_passaram = False
    
    if resultado_alto['nivel_risco_psicossocial'] != 'ALTO':
        print("❌ ERRO: Perfil alto risco não resultou em nível ALTO")
        testes_passaram = False
    
    if resultado_muito_alto['nivel_risco_psicossocial'] != 'MUITO_ALTO':
        print("❌ ERRO: Perfil muito alto risco não resultou em nível MUITO_ALTO")
        testes_passaram = False
    
    if testes_passaram:
        print("✅ TODOS OS TESTES PASSARAM!")
        return True
    else:
        print("❌ ALGUNS TESTES FALHARAM")
        return False


def testar_perguntas():
    """Testa a função de obtenção de perguntas"""
    
    imprimir_cabecalho("📝 TESTE DE OBTENÇÃO DE PERGUNTAS")
    
    perguntas = get_perguntas_questionario()
    
    print(f"Total de blocos: {len(perguntas)}")
    print()
    
    for bloco in perguntas:
        print(f"📋 BLOCO: {bloco['bloco']}")
        print(f"   Número de perguntas: {len(bloco['perguntas'])}")
        
        for i, pergunta in enumerate(bloco['perguntas'], 1):
            invertida = " (invertida)" if pergunta.get('invertida') else ""
            print(f"   {i}. {pergunta['texto']}{invertida}")
        
        print()
    
    print("✅ FUNÇÃO get_perguntas_questionario() FUNCIONA CORRETAMENTE!")
    return True


if __name__ == "__main__":
    print()
    
    # Testar perguntas
    sucesso_perguntas = testar_perguntas()
    
    print()
    
    # Testar cálculo de risco
    sucesso_calculo = testar_calculo_risco()
    
    print()
    imprimir_cabecalho("🎉 TESTES CONCLUÍDOS")
    
    if sucesso_perguntas and sucesso_calculo:
        print("✅ TODOS OS TESTES FORAM EXECUTADOS COM SUCESSO!")
        print()
        print("📝 PRÓXIMOS PASSOS:")
        print("   1. Executar: python backend/criar_questionario_psicossocial.py")
        print("   2. Iniciar servidor: python -m uvicorn main:app --reload")
        print("   3. Testar endpoints no Swagger: http://localhost:8000/docs")
        print("   4. Implementar frontend do questionário")
        print()
        sys.exit(0)
    else:
        print("❌ ALGUNS TESTES FALHARAM. VERIFIQUE OS ERROS ACIMA.")
        print()
        sys.exit(1)
