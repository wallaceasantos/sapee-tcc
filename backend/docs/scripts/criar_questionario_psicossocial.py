"""
🧠 SCRIPT DE CRIAÇÃO DA TABELA - QUESTIONÁRIO PSICOSSOCIAL
SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar

Este script cria a tabela para armazenar as respostas do questionário psicossocial.

Execução:
    python backend/criar_questionario_psicossocial.py
"""

import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:S%40nx5497@localhost:3306/sapee_dewas")

def criar_tabela_questionario():
    """Cria a tabela questionario_psicossocial no banco de dados"""
    
    print("=" * 80)
    print("🧠 CRIAÇÃO DA TABELA - QUESTIONÁRIO PSICOSSOCIAL")
    print("=" * 80)
    print()
    
    try:
        # Conectar ao banco
        print(f"📡 Conectando ao banco de dados...")
        engine = create_engine(DATABASE_URL)
        conn = engine.connect()
        print("✅ Conexão estabelecida com sucesso!")
        print()
        
        # SQL de criação da tabela
        sql_criar_tabela = """
        CREATE TABLE IF NOT EXISTS questionario_psicossocial (
            -- Identificação
            id INT PRIMARY KEY AUTO_INCREMENT,
            aluno_matricula VARCHAR(20) NOT NULL,
            
            -- ============================================
            -- DIMENSÃO 1: SAÚDE MENTAL (Questões 1-5)
            -- ============================================
            q1_ansiedade INT COMMENT 'Sinto ansiedade frequente relacionada aos estudos',
            q2_depressao INT COMMENT 'Tenho me sentido desanimado(a) com frequência',
            q3_estresse INT COMMENT 'O estresse está afetando meu desempenho',
            q4_sono INT COMMENT 'Tenho tido dificuldades para dormir',
            q5_bem_estar INT COMMENT 'Me sinto bem emocionalmente para estudar (invertida)',
            
            -- ============================================
            -- DIMENSÃO 2: INTEGRAÇÃO SOCIAL (Questões 6-10)
            -- ============================================
            q6_pertencimento INT COMMENT 'Me sinto parte da turma',
            q7_amizades INT COMMENT 'Tenho amigos na escola',
            q8_participacao INT COMMENT 'Participo de atividades extracurriculares',
            q9_relacionamento_professores INT COMMENT 'Tenho bom relacionamento com professores',
            q10_apoio_colegas INT COMMENT 'Posso contar com colegas para dificuldades',
            
            -- ============================================
            -- DIMENSÃO 3: SATISFAÇÃO COM O CURSO (Questões 11-15)
            -- ============================================
            q11_expectativas INT COMMENT 'O curso atende minhas expectativas',
            q12_qualidade_aulas INT COMMENT 'As aulas são de boa qualidade',
            q13_infraestrutura INT COMMENT 'A infraestrutura me atende',
            q14_conteudo_programatico INT COMMENT 'O conteúdo é relevante',
            q15_motivacao_curso INT COMMENT 'Estou motivado(a) com o curso',
            
            -- ============================================
            -- DIMENSÃO 4: CONFLITOS (Questões 16-20)
            -- ============================================
            q16_trabalho_estudo INT COMMENT 'O trabalho atrapalha meus estudos',
            q17_familia_estudo INT COMMENT 'A família apoia meus estudos (invertida)',
            q18_tempo_lazer INT COMMENT 'Tenho tempo para lazer (invertida)',
            q19_cansaco INT COMMENT 'Sinto cansaço excessivo',
            q20_sobrecarga INT COMMENT 'Me sinto sobrecarregado(a)',
            
            -- ============================================
            -- DIMENSÃO 5: INTENÇÃO DE EVASÃO (Questões 21-25)
            -- ============================================
            q21_pensou_abandonar INT COMMENT 'Já pensei em abandonar o curso',
            q22_frequencia_pensamento INT COMMENT 'Com que frequência pensa em abandonar',
            q23_motivacao_permanencia INT COMMENT 'Estou motivado a permanecer (invertida)',
            q24_plano_abandonar INT COMMENT 'Tenho plano de abandonar',
            q25_previsao_abandono INT COMMENT 'Devo abandonar em breve',
            
            -- ============================================
            -- CAMPOS CALCULADOS
            -- ============================================
            score_saude_mental DECIMAL(5,2) COMMENT '0-25 pontos',
            score_integracao_social DECIMAL(5,2) COMMENT '0-20 pontos',
            score_satisfacao_curso DECIMAL(5,2) COMMENT '0-20 pontos',
            score_conflitos DECIMAL(5,2) COMMENT '0-20 pontos',
            score_intencao_evasao DECIMAL(5,2) COMMENT '0-15 pontos',
            score_psicossocial_total DECIMAL(5,2) COMMENT '0-100 pontos',
            
            -- ============================================
            -- NÍVEL DE RISCO PSICOSSOCIAL
            -- ============================================
            nivel_risco_psicossocial ENUM('BAIXO', 'MEDIO', 'ALTO', 'MUITO_ALTO') 
                COMMENT 'Nível de risco baseado no score total',
            
            -- ============================================
            -- FATORES CRÍTICOS IDENTIFICADOS
            -- ============================================
            fatores_criticos TEXT COMMENT 'JSON array com fatores críticos identificados',
            
            -- ============================================
            -- METADADOS
            -- ============================================
            data_resposta DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Data/hora da resposta',
            ip_address VARCHAR(45) COMMENT 'IP do dispositivo',
            dispositivo VARCHAR(100) COMMENT 'User agent do dispositivo',
            tempo_resposta_segundos INT COMMENT 'Tempo gasto para responder (segundos)',
            termo_consentimento BOOLEAN DEFAULT FALSE COMMENT 'Aceitou termo de consentimento',
            
            -- ============================================
            -- CHAVES ESTRANGEIRAS E ÍNDICES
            -- ============================================
            FOREIGN KEY (aluno_matricula) REFERENCES alunos(matricula) ON DELETE CASCADE,
            INDEX idx_aluno_matricula (aluno_matricula),
            INDEX idx_data_resposta (data_resposta),
            INDEX idx_nivel_risco (nivel_risco_psicossocial),
            INDEX idx_score_total (score_psicossocial_total)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Questionário psicossocial para avaliação de risco de evasão escolar';
        """
        
        # Executar criação
        print("📝 Executando SQL de criação da tabela...")
        conn.execute(text(sql_criar_tabela))
        conn.commit()
        print("✅ Tabela criada com sucesso!")
        print()
        
        # Verificar se foi criada
        print("🔍 Verificando tabela criada...")
        result = conn.execute(text("""
            SELECT COUNT(*) as total 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
            AND table_name = 'questionario_psicossocial'
        """))
        
        total = result.fetchone()[0]
        
        if total > 0:
            print("✅ Tabela questionario_psicossocial confirmada no banco!")
            
            # Mostrar estrutura
            print()
            print("📋 ESTRUTURA DA TABELA:")
            print("-" * 80)
            
            result = conn.execute(text("""
                SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, 
                       COLUMN_COMMENT, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'questionario_psicossocial'
                ORDER BY ORDINAL_POSITION
            """))
            
            print(f"{'Coluna':<35} {'Tipo':<20} {'Nullable':<10}")
            print("-" * 80)
            
            for row in result:
                coluna = row[0]
                tipo = row[1]
                if row[2]:
                    tipo += f"({row[2]})"
                nullable = "NULL" if row[4] == "YES" else "NOT NULL"
                print(f"{coluna:<35} {tipo:<20} {nullable:<10}")
            
            print("-" * 80)
            print()
            
            # Contar total de colunas
            result = conn.execute(text("""
                SELECT COUNT(*) as total
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'questionario_psicossocial'
            """))
            
            total_colunas = result.fetchone()[0]
            print(f"📊 Total de colunas: {total_colunas}")
            
        else:
            print("❌ ERRO: Tabela não foi encontrada após criação!")
            return False
        
        conn.close()
        print()
        print("=" * 80)
        print("✅ PROCESSO CONCLUÍDO COM SUCESSO!")
        print("=" * 80)
        print()
        print("📝 PRÓXIMOS PASSOS:")
        print("   1. Adicionar models.py a nova classe QuestionarioPsicossocial")
        print("   2. Criar endpoints da API para CRUD")
        print("   3. Implementar frontend do questionário")
        print("   4. Integrar com modelo de predição de risco")
        print()
        
        return True
        
    except Exception as e:
        print()
        print("=" * 80)
        print("❌ ERRO NA CRIAÇÃO DA TABELA")
        print("=" * 80)
        print(f"Erro: {str(e)}")
        print()
        return False


def adicionar_colunas_questionario_aluno():
    """Adiciona colunas na tabela de alunos para controle do questionário"""
    
    print()
    print("=" * 80)
    print("📝 ADICIONANDO COLUNAS DE CONTROLE NA TABELA ALUNOS")
    print("=" * 80)
    print()
    
    try:
        engine = create_engine(DATABASE_URL)
        conn = engine.connect()
        
        # Coluna para controlar se aluno já respondeu
        print("📡 Adicionando coluna questionario_respondido...")
        
        try:
            conn.execute(text("""
                ALTER TABLE alunos 
                ADD COLUMN questionario_respondido BOOLEAN DEFAULT FALSE 
                COMMENT 'Indica se aluno já respondeu questionário psicossocial'
            """))
            conn.commit()
            print("✅ Coluna questionario_respondido adicionada!")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("⚠️ Coluna questionario_respondido já existe!")
            else:
                raise e
        
        # Coluna para data da última resposta
        print("📡 Adicionando coluna data_ultimo_questionario...")
        
        try:
            conn.execute(text("""
                ALTER TABLE alunos 
                ADD COLUMN data_ultimo_questionario DATETIME 
                COMMENT 'Data da última resposta do questionário psicossocial'
            """))
            conn.commit()
            print("✅ Coluna data_ultimo_questionario adicionada!")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("⚠️ Coluna data_ultimo_questionario já existe!")
            else:
                raise e
        
        # Índice para filtrar alunos que não responderam
        print("📡 Criando índice para questionário...")
        
        try:
            conn.execute(text("""
                CREATE INDEX idx_questionario_respondido 
                ON alunos(questionario_respondido)
            """))
            conn.commit()
            print("✅ Índice criado!")
        except Exception as e:
            if "Duplicate key name" in str(e):
                print("⚠️ Índice já existe!")
            else:
                raise e
        
        conn.close()
        print()
        print("✅ COLUNAS ADICIONADAS COM SUCESSO!")
        print()
        
        return True
        
    except Exception as e:
        print()
        print(f"❌ ERRO: {str(e)}")
        print()
        return False


if __name__ == "__main__":
    print()
    
    # Criar tabela principal
    sucesso_tabela = criar_tabela_questionario()
    
    # Adicionar colunas de controle
    sucesso_colunas = adicionar_colunas_questionario_aluno()
    
    if sucesso_tabela and sucesso_colunas:
        print("🎉 TODOS OS SCRIPTS EXECUTADOS COM SUCESSO!")
        print()
        sys.exit(0)
    else:
        print("⚠️ ALGUNS ERROS OCORRERAM. VERIFIQUE A SAÍDA ACIMA.")
        print()
        sys.exit(1)
