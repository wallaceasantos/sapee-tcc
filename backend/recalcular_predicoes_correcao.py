"""
🔄 RECALCULAR PREDIÇÕES - CORREÇÃO BUG
SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar

Este script recalcula TODAS as predições dos alunos cadastrados
usando a lógica de classificação CORREGIDA (v2.0).

O que ele faz:
1. Busca TODOS os alunos cadastrados
2. Recalcula risco com a lógica v2.0 corrigida
3. Atualiza predições no banco de dados
4. Gera relatório de mudanças

Execução:
    python backend/recalcular_predicoes_correcao.py
"""

import sys
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import json

# Imports do projeto
import database
import models

def calcular_risco_v2(aluno):
    """
    Calcula risco de evasão usando lógica v2.0 CORRIGIDA
    """
    score = 0
    
    # Fatores Acadêmicos (Peso ALTO)
    if aluno.frequencia and float(aluno.frequencia) < 60:
        score += 35
    elif aluno.frequencia and float(aluno.frequencia) < 75:
        score += 25
    elif aluno.frequencia and float(aluno.frequencia) < 85:
        score += 10
    
    if aluno.media_geral and float(aluno.media_geral) < 4.0:
        score += 30
    elif aluno.media_geral and float(aluno.media_geral) < 5.0:
        score += 20
    elif aluno.media_geral and float(aluno.media_geral) < 6.0:
        score += 10
    
    if aluno.historico_reprovas and aluno.historico_reprovas > 3:
        score += 20
    elif aluno.historico_reprovas and aluno.historico_reprovas > 1:
        score += 10
    
    # Fatores Socioeconômicos (Peso MÉDIO)
    if aluno.renda_familiar and float(aluno.renda_familiar) < 1000:
        score += 15
    elif aluno.renda_familiar and float(aluno.renda_familiar) < 1500:
        score += 8
    
    if aluno.trabalha:
        if aluno.carga_horaria_trabalho and int(aluno.carga_horaria_trabalho) > 40:
            score += 15
        elif aluno.carga_horaria_trabalho and int(aluno.carga_horaria_trabalho) > 20:
            score += 10
        else:
            score += 5
    
    # Fatores de Deslocamento
    if aluno.tempo_deslocamento and int(aluno.tempo_deslocamento) > 120:
        score += 15
    elif aluno.tempo_deslocamento and int(aluno.tempo_deslocamento) > 60:
        score += 8
    
    if aluno.dificuldade_acesso == 'MUITO_DIFICIL':
        score += 10
    elif aluno.dificuldade_acesso == 'DIFICIL':
        score += 5
    
    # Infraestrutura
    if not aluno.possui_computador:
        score += 6
    
    if not aluno.possui_internet:
        score += 4
    
    # Vulnerabilidade
    if aluno.beneficiario_bolsa_familia:
        score += 5
    
    if aluno.primeiro_geracao_universidade:
        score += 5
    
    if aluno.possui_auxilio:
        score += 5
    
    # Limitar score a 100
    score = min(score, 100)
    
    # Determinar nível de risco (v2.0 CORRIGIDO)
    if score >= 85:
        nivel = models.NivelRisco.MUITO_ALTO
    elif score >= 70:
        nivel = models.NivelRisco.ALTO
    elif score >= 40:
        nivel = models.NivelRisco.MEDIO
    else:
        nivel = models.NivelRisco.BAIXO
    
    return {
        'score': score,
        'nivel': nivel,
        'nivel_str': nivel.value if hasattr(nivel, 'value') else str(nivel)
    }


def recalcular_predicoes():
    """Recalcula todas as predições com a correção v2.0"""
    print("=" * 80)
    print("🔄 RECALCULANDO PREDIÇÕES - CORREÇÃO BUG v2.0")
    print("=" * 80)
    print()
    
    try:
        # Conectar ao banco
        db = Session(bind=database.engine)
        
        # Buscar todos os alunos
        print("📊 Buscando alunos cadastrados...")
        alunos = db.query(models.Aluno).all()
        total_alunos = len(alunos)
        print(f"✅ {total_alunos} alunos encontrados")
        print()
        
        # Estatísticas
        estatisticas = {
            'total': total_alunos,
            'baixo': 0,
            'medio': 0,
            'alto': 0,
            'muito_alto': 0,
            'corrigidos': 0
        }
        
        # Processar cada aluno
        for i, aluno in enumerate(alunos, 1):
            print(f"📊 Processando aluno {i}/{total_alunos}: {aluno.nome} ({aluno.matricula})")
            
            # Calcular risco com NOVA lógica (corrigida)
            resultado = calcular_risco_v2(aluno)
            score_novo = resultado['score']
            nivel_novo = resultado['nivel']
            nivel_novo_str = resultado['nivel_str']
            
            # Buscar predição atual (antiga)
            predicao_atual = db.query(models.Predicao).filter(
                models.Predicao.aluno_id == aluno.matricula
            ).order_by(models.Predicao.data_predicao.desc()).first()
            
            if predicao_atual:
                nivel_antigo_str = predicao_atual.nivel_risco
                
                # Verificar se mudou
                if nivel_antigo_str != nivel_novo_str:
                    estatisticas['corrigidos'] += 1
                    print(f"  🔴 CORREÇÃO: {nivel_antigo_str} → {nivel_novo_str}")
                    print(f"     Score: {score_novo}%")
                
                # Criar nova predição
                nova_predicao = models.Predicao(
                    aluno_id=aluno.matricula,
                    risco_evasao=score_novo,
                    nivel_risco=nivel_novo,
                    fatores_principais=predicao_atual.fatores_principais,
                    modelo_ml_versao='2.0.0-corrigido'
                )
                
                db.add(nova_predicao)
            else:
                # Criar primeira predição
                print(f"  📊 Nova predição: {nivel_novo_str} ({score_novo}%)")
                
                nova_predicao = models.Predicao(
                    aluno_id=aluno.matricula,
                    risco_evasao=score_novo,
                    nivel_risco=nivel_novo,
                    fatores_principais='Sem histórico',
                    modelo_ml_versao='2.0.0-corrigido'
                )
                
                db.add(nova_predicao)
            
            # Contar por nível
            if nivel_novo == models.NivelRisco.BAIXO:
                estatisticas['baixo'] += 1
            elif nivel_novo == models.NivelRisco.MEDIO:
                estatisticas['medio'] += 1
            elif nivel_novo == models.NivelRisco.ALTO:
                estatisticas['alto'] += 1
            else:  # MUITO_ALTO
                estatisticas['muito_alto'] += 1
            
            # Commit a cada 10 alunos
            if i % 10 == 0:
                db.commit()
                print(f"  ✅ {i} alunos processados e salvos")
        
        # Commit final
        db.commit()
        
        # Imprimir estatísticas
        print()
        print("=" * 80)
        print("📊 ESTATÍSTICAS GERAIS APÓS CORREÇÃO")
        print("=" * 80)
        print(f"Total de alunos processados: {estatisticas['total']}")
        print(f"Predições corrigidas: {estatisticas['corrigidos']}")
        print()
        print("Distribuição por Nível:")
        print(f"  🟢 BAIXO:       {estatisticas['baixo']:3d} alunos ({estatisticas['baixo']/estatisticas['total']*100:5.1f}%)")
        print(f"  🟡 MÉDIO:       {estatisticas['medio']:3d} alunos ({estatisticas['medio']/estatisticas['total']*100:5.1f}%)")
        print(f"  🔴 ALTO:        {estatisticas['alto']:3d} alunos ({estatisticas['alto']/estatisticas['total']*100:5.1f}%)")
        print(f"  🟣 MUITO ALTO:  {estatisticas['muito_alto']:3d} alunos ({estatisticas['muito_alto']/estatisticas['total']*100:5.1f}%)")
        print("=" * 80)
        
        db.close()
        
        print()
        print("✅ Predições recalculadas e corrigidas com sucesso!")
        print()
        
        return estatisticas
        
    except Exception as e:
        print()
        print("=" * 80)
        print(f"❌ ERRO: {str(e)}")
        print("=" * 80)
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    estatisticas = recalcular_predicoes()
    
    if estatisticas:
        print("🎉 Processo concluído com sucesso!")
        print()
        print("📝 PRÓXIMOS PASSOS:")
        print("   1. Acesse o sistema: http://localhost:3000")
        print("   2. Vá em Alunos → Francisco Alves da Silva")
        print("   3. Verifique se mostra: ALTO ou MUITO_ALTO (não BAIXO)")
        print("   4. Limpe cache do navegador se necessário (Ctrl+F5)")
        sys.exit(0)
    else:
        print("❌ Erro durante o processo")
        sys.exit(1)
