"""
Script para criar tabela de frequência mensal
SAPEE DEWAS Backend
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import sys
sys.path.append(os.path.dirname(__file__))

# Carregar .env
load_dotenv()

# Criar engine
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def criar_tabela_frequencia_mensal():
    """Cria tabela para registrar frequência mensal dos alunos"""
    
    with engine.connect() as conn:
        try:
            # Verificar se tabela já existe
            result = conn.execute(text(
                "SHOW TABLES LIKE 'frequencia_mensal'"
            )).fetchone()
            
            if result:
                print("⚠️  Tabela frequencia_mensal já existe!")
                return
            
            # Criar tabela
            print("📊 Criando tabela frequencia_mensal...")
            
            conn.execute(text("""
                CREATE TABLE frequencia_mensal (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    aluno_id VARCHAR(20) NOT NULL,
                    mes INT NOT NULL COMMENT '1-12',
                    ano INT NOT NULL,
                    frequencia DECIMAL(5,2) NOT NULL COMMENT '0-100%',
                    faltas_justificadas INT DEFAULT 0,
                    faltas_nao_justificadas INT DEFAULT 0,
                    total_aulas_mes INT NOT NULL,
                    observacoes TEXT,
                    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (aluno_id) REFERENCES alunos(matricula) ON DELETE CASCADE,
                    UNIQUE KEY unique_aluno_mes_ano (aluno_id, mes, ano),
                    INDEX idx_aluno (aluno_id),
                    INDEX idx_mes_ano (mes, ano),
                    INDEX idx_data_registro (data_registro)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                COMMENT='Registro mensal de frequência dos alunos'
            """))
            
            conn.commit()
            
            print("✅ Tabela frequencia_mensal criada com sucesso!")
            
            # Inserir dados de exemplo para alunos existentes
            print("\n📝 Inserindo dados históricos de exemplo...")
            
            # Buscar alunos existentes
            alunos = conn.execute(text(
                "SELECT matricula, frequencia FROM alunos LIMIT 10"
            )).fetchall()
            
            from datetime import datetime
            mes_atual = datetime.now().month
            ano_atual = datetime.now().year
            
            for aluno in alunos:
                matricula = aluno[0]
                freq_atual = float(aluno[1]) if aluno[1] else 90
                
                # Gerar 6 meses de histórico simulado
                for i in range(6, 0, -1):
                    mes = (mes_atual - i) % 12
                    ano = ano_atual if mes > 0 else ano_atual - 1
                    if mes <= 0: mes += 12
                    
                    # Simular variação de frequência
                    import random
                    variacao = random.uniform(-5, 5)
                    freq_mes = max(60, min(100, freq_atual + variacao))
                    
                    total_aulas = random.randint(18, 22)
                    faltas = int((100 - freq_mes) / 100 * total_aulas)
                    
                    try:
                        conn.execute(text("""
                            INSERT INTO frequencia_mensal 
                            (aluno_id, mes, ano, frequencia, faltas_justificadas, 
                             faltas_nao_justificadas, total_aulas_mes, observacoes)
                            VALUES (:aluno_id, :mes, :ano, :freq, :fj, :fnj, :total, :obs)
                        """), {
                            'aluno_id': matricula,
                            'mes': mes,
                            'ano': ano,
                            'freq': round(freq_mes, 2),
                            'fj': random.randint(0, 2),
                            'fnj': faltas,
                            'total': total_aulas,
                            'obs': f'Dados simulados para teste'
                        })
                    except Exception as e:
                        # Ignora se já existir (unique constraint)
                        pass
            
            conn.commit()
            print("✅ Dados históricos inseridos!")
            
        except Exception as e:
            print(f"❌ ERRO: {e}")
            conn.rollback()
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    criar_tabela_frequencia_mensal()
