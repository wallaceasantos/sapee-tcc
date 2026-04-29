"""
🧠 TREINAMENTO DO MODELO ML COM DADOS REAIS
SAPEE DEWAS - Sistema de Predição de Evasão Escolar

Este script treina o modelo de Machine Learning usando dados REAIS do banco:
- Alunos que PERMANECERAM (evadiu=0)
- Alunos que EVADIRAM (evadiu=1)

⚠️ REQUISITOS:
- Mínimo 10 alunos no banco
- Mínimo 2 casos de evasão registrados
- Dados atualizados na tabela 'alunos'

EXECUÇÃO:
    cd backend
    .\venv\Scripts\Activate.ps1
    python scripts\treinar_modelo_real.py

RESULTADO:
    - Gera arquivo: modelo_evasao.joblib
    - Backup do modelo anterior (se existir)
    - Relatório de acurácia e métricas
"""

import os
import sys
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from collections import Counter

# Adicionar pasta raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from sqlalchemy.orm import Session
import models

# Configurações
MINIMO_ALUNOS = 10
MINIMO_EVASOES = 2
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'modelo_evasao.joblib')

def verificar_dados_suficientes(db: Session):
    """Verifica se há dados suficientes para treinamento"""
    
    total_alunos = db.query(models.Aluno).count()
    total_egressos = db.query(models.Egresso).count()
    evasoes = db.query(models.Egresso).filter(
        models.Egresso.motivo_saida == 'ABANDONO'
    ).count()
    
    print("=" * 60)
    print("📊 VERIFICAÇÃO DE DADOS")
    print("=" * 60)
    print(f"Total de Alunos: {total_alunos}")
    print(f"Total de Egressos: {total_egressos}")
    print(f"Evasões (Abandono): {evasoes}")
    print("-" * 60)
    
    if total_alunos < MINIMO_ALUNOS:
        print(f"❌ ERRO: Mínimo de {MINIMO_ALUNOS} alunos necessário. Atual: {total_alunos}")
        return False
    
    if evasoes < MINIMO_EVASOES:
        print(f"❌ ERRO: Mínimo de {MINIMO_EVASOES} evasões necessárias. Atual: {evasoes}")
        print("💡 Dica: Cadastre alunos que evadiram na tabela 'egressos'")
        return False
    
    print(f"✅ Dados suficientes para treinamento!")
    print(f"   {total_alunos} alunos, {evasoes} evasões")
    return True

def coletar_dados_treinamento(db: Session):
    """Coleta dados de alunos para treinamento"""
    
    print("\n" + "=" * 60)
    print("📥 COLETANDO DADOS")
    print("=" * 60)
    
    # Buscar todas as matrículas de alunos que evadiram
    matriculas_evadidas = [
        e.aluno_matricula for e in db.query(models.Egresso).filter(
            models.Egresso.motivo_saida == 'ABANDONO'
        ).all()
    ]
    
    print(f"   Alunos que evadiram: {len(matriculas_evadidas)}")
    
    # Buscar todos os alunos com dados completos
    alunos = db.query(models.Aluno).all()
    
    dados_treino = []
    
    for aluno in alunos:
        # Verificar se tem dados mínimos necessários
        if not aluno.media_geral or not aluno.frequencia:
            continue
        
        # Determinar se evadiu (1) ou permaneceu (0)
        evadiu = 1 if aluno.matricula in matriculas_evadidas else 0
        
        # Calcular idade se tiver data de nascimento
        idade = 18  # padrão
        if aluno.data_nascimento:
            from datetime import date
            idade = date.today().year - aluno.data_nascimento.year
        
        dados_treino.append({
            'matricula': aluno.matricula,
            'nome': aluno.nome,
            'idade': idade,
            'periodo': aluno.periodo or 1,
            'media_geral': float(aluno.media_geral),
            'frequencia': float(aluno.frequencia),
            'renda_familiar': float(aluno.renda_familiar or 2000),
            'possui_auxilio': 1 if aluno.possui_auxilio else 0,
            'trabalha': 1 if aluno.trabalha else 0,
            'carga_horaria_trabalho': aluno.carga_horaria_trabalho or 0,
            'historico_reprovas': aluno.historico_reprovas or 0,
            'tempo_deslocamento': aluno.tempo_deslocamento or 30,
            'possui_computador': 1 if aluno.possui_computador else 0,
            'possui_internet': 1 if aluno.possui_internet else 0,
            'beneficiario_bolsa_familia': 1 if aluno.beneficiario_bolsa_familia else 0,
            'primeiro_geracao_universidade': 1 if aluno.primeiro_geracao_universidade else 0,
            'evadiu': evadiu
        })
    
    print(f"   Total de registros coletados: {len(dados_treino)}")
    return dados_treino

def analisar_dados(df):
    """Analisa distribuição dos dados"""
    
    print("\n" + "=" * 60)
    print("📈 ANÁLISE DOS DADOS")
    print("=" * 60)
    
    # Distribuição da variável alvo
    distribuicao = df['evadiu'].value_counts()
    print(f"\nDistribuição:")
    print(f"   0 - Permaneceu: {distribuicao.get(0, 0)} ({distribuicao.get(0, 0)/len(df)*100:.1f}%)")
    print(f"   1 - Evadiu: {distribuicao.get(1, 0)} ({distribuicao.get(1, 0)/len(df)*100:.1f}%)")
    
    # Verificar balanceamento
    if distribuicao.get(1, 0) < len(df) * 0.1:
        print("⚠️  AVISO: Poucos casos de evasão. Modelo pode ter viés.")
    
    # Estatísticas por grupo
    print(f"\nEstatísticas por grupo:")
    for grupo in [0, 1]:
        subset = df[df['evadiu'] == grupo]
        if len(subset) > 0:
            label = "Permaneceu" if grupo == 0 else "Evadiu"
            print(f"\n   {label}:")
            print(f"      Média Geral: {subset['media_geral'].mean():.2f}")
            print(f"      Frequência: {subset['frequencia'].mean():.1f}%")
            print(f"      Trabalha: {subset['trabalha'].sum()} ({subset['trabalha'].mean()*100:.0f}%)")
            print(f"      Reprovas: {subset['historico_reprovas'].mean():.1f}")

def treinar_modelo(df):
    """Treina o modelo de Machine Learning"""
    
    print("\n" + "=" * 60)
    print("🧠 TREINANDO MODELO")
    print("=" * 60)
    
    # Features (X) e Target (y)
    feature_cols = [
        'idade', 'periodo', 'media_geral', 'frequencia', 
        'renda_familiar', 'possui_auxilio', 'trabalha', 
        'carga_horaria_trabalho', 'historico_reprovas',
        'tempo_deslocamento', 'possui_computador', 
        'possui_internet', 'beneficiario_bolsa_familia',
        'primeiro_geracao_universidade'
    ]
    
    X = df[feature_cols]
    y = df['evadiu']
    
    # Dividir em treino e teste (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"   Dados de treino: {len(X_train)}")
    print(f"   Dados de teste: {len(X_test)}")
    
    # Treinar Random Forest
    print("\n   Configuração:")
    print("      Algoritmo: Random Forest")
    print("      Estimadores: 200")
    print("      Max Depth: 15")
    
    modelo = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight='balanced',  # Balancear classes
        random_state=42
    )
    
    modelo.fit(X_train, y_train)
    
    # Avaliar modelo
    y_pred = modelo.predict(X_test)
    acuracia = accuracy_score(y_test, y_pred)
    
    print(f"\n   Resultados:")
    print(f"      Acurácia: {acuracia:.2%}")
    
    # Feature importance
    importancias = pd.DataFrame({
        'feature': feature_cols,
        'importancia': modelo.feature_importances_
    }).sort_values('importancia', ascending=False)
    
    print(f"\n   Features mais importantes:")
    for _, row in importancias.head(5).iterrows():
        print(f"      {row['feature']}: {row['importancia']:.2%}")
    
    return modelo, acuracia

def salvar_modelo(modelo, acuracia):
    """Salva o modelo treinado"""
    
    print("\n" + "=" * 60)
    print("💾 SALVANDO MODELO")
    print("=" * 60)
    
    # Backup do modelo anterior
    if os.path.exists(MODEL_PATH):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = f"{MODEL_PATH}.{timestamp}.backup"
        joblib.dump(joblib.load(MODEL_PATH), backup_path)
        print(f"   Backup criado: {os.path.basename(backup_path)}")
    
    # Salvar novo modelo
    joblib.dump(modelo, MODEL_PATH)
    
    # Salvar metadados
    metadados = {
        'data_treinamento': datetime.now().isoformat(),
        'acuracia': acuracia,
        'algoritmo': 'RandomForestClassifier',
        'parametros': {
            'n_estimators': 200,
            'max_depth': 15,
            'class_weight': 'balanced'
        },
        'versao': '2.0.0-ml-real'
    }
    
    metadados_path = MODEL_PATH.replace('.joblib', '.metadados.json')
    import json
    with open(metadados_path, 'w') as f:
        json.dump(metadados, f, indent=2)
    
    print(f"   Modelo salvo: {MODEL_PATH}")
    print(f"   Metadados: {metadados_path}")
    
    return True

def testar_modelo():
    """Testa o modelo salvo"""
    
    print("\n" + "=" * 60)
    print("🧪 TESTANDO MODELO SALVO")
    print("=" * 60)
    
    if not os.path.exists(MODEL_PATH):
        print("❌ Erro: Modelo não foi salvo corretamente")
        return False
    
    try:
        modelo = joblib.load(MODEL_PATH)
        
        # Teste com dados fictícios
        teste = pd.DataFrame([{
            'idade': 18,
            'periodo': 2,
            'media_geral': 8.5,
            'frequencia': 92,
            'renda_familiar': 4500,
            'possui_auxilio': 0,
            'trabalha': 0,
            'carga_horaria_trabalho': 0,
            'historico_reprovas': 0,
            'tempo_deslocamento': 45,
            'possui_computador': 1,
            'possui_internet': 1,
            'beneficiario_bolsa_familia': 0,
            'primeiro_geracao_universidade': 0
        }])
        
        probabilidade = modelo.predict_proba(teste)[0][1]
        
        print(f"   Teste com aluno exemplo:")
        print(f"      Probabilidade de evasão: {probabilidade:.2%}")
        print(f"      Status: {'✅ Modelo funciona!' if probabilidade < 0.5 else '⚠️  Alto risco'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao testar modelo: {e}")
        return False

def main():
    """Função principal"""
    
    print("=" * 60)
    print("🚀 TREINAMENTO DO MODELO ML - SAPEE DEWAS")
    print("=" * 60)
    print("Usando dados REAIS do banco de dados")
    print("=" * 60)
    
    try:
        # Conectar ao banco
        print("\n📡 Conectando ao banco de dados...")
        db = next(database.get_db())
        print("   ✅ Conectado!")
        
        # Verificar dados suficientes
        if not verificar_dados_suficientes(db):
            print("\n❌ Treinamento cancelado. Dados insuficientes.")
            return False
        
        # Coletar dados
        dados = coletar_dados_treinamento(db)
        if not dados:
            print("❌ Nenhum dado válido para treinamento")
            return False
        
        # Criar DataFrame
        df = pd.DataFrame(dados)
        
        # Analisar dados
        analisar_dados(df)
        
        # Treinar modelo
        modelo, acuracia = treinar_modelo(df)
        
        # Avaliar se modelo é aceitável
        if acuracia < 0.6:
            print(f"\n⚠️  Acurácia baixa ({acuracia:.2%})")
            print("    Modelo pode não ser confiável.")
            resposta = input("Deseja salvar mesmo assim? (s/N): ")
            if resposta.lower() != 's':
                print("❌ Treinamento cancelado.")
                return False
        
        # Salvar modelo
        if salvar_modelo(modelo, acuracia):
            # Testar modelo
            if testar_modelo():
                print("\n" + "=" * 60)
                print("✅ TREINAMENTO CONCLUÍDO COM SUCESSO!")
                print("=" * 60)
                print(f"\nPróximos passos:")
                print(f"   1. Reinicie o backend:")
                print(f"      python -m uvicorn main:app --reload")
                print(f"   2. Novas predições usarão o modelo ML")
                print(f"   3. Verifique em /predicoes/resumo")
                print("=" * 60)
                return True
        
        return False
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    sucesso = main()
    sys.exit(0 if sucesso else 1)
