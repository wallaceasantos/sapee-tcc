import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

def gerar_dados_sinteticos(n_amostras=1000):
    """Gera dados fakes para treinar o modelo inicial"""
    np.random.seed(42)
    
    data = {
        'idade': np.random.randint(15, 30, n_amostras),
        'periodo': np.random.randint(1, 9, n_amostras),
        'media_geral': np.random.uniform(0, 10, n_amostras),
        'frequencia': np.random.uniform(50, 100, n_amostras),
        'renda_familiar': np.random.uniform(800, 5000, n_amostras),
        'possui_auxilio': np.random.randint(0, 2, n_amostras),
        'trabalha': np.random.randint(0, 2, n_amostras),
        'historico_reprovas': np.random.randint(0, 5, n_amostras)
    }
    
    df = pd.DataFrame(data)
    
    # Lógica para criar o "alvo" (evadiu ou não) baseada em padrões reais
    # Risco aumenta se frequencia < 75 ou media < 5 ou muitas reprovas
    prob = (
        (df['frequencia'] < 75) * 0.4 + 
        (df['media_geral'] < 5) * 0.3 + 
        (df['historico_reprovas'] > 2) * 0.2 +
        (df['trabalha'] == 1) * 0.1
    )
    df['evadiu'] = (prob + np.random.normal(0, 0.1, n_amostras) > 0.5).astype(int)
    
    return df

def treinar():
    print("🚀 Iniciando treinamento do modelo SAPEE DEWAS...")
    
    df = gerar_dados_sinteticos()
    
    X = df.drop('evadiu', axis=1)
    y = df['evadiu']
    
    # Treinando um Random Forest
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Salvando o modelo
    model_path = os.path.join(os.path.dirname(__file__), 'modelo_evasao.joblib')
    joblib.dump(model, model_path)
    
    print(f"✅ Modelo treinado e salvo em: {model_path}")

if __name__ == "__main__":
    treinar()
