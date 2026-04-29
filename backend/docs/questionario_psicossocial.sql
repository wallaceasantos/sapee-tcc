-- ============================================
-- SCRIPT SQL - QUESTIONÁRIO PSICOSSOCIAL
-- SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
-- ============================================
-- Este script cria a tabela para armazenar as respostas do questionário psicossocial
-- e adiciona colunas de controle na tabela de alunos.
-- 
-- Execução: mysql -u root -p sapee_dewas < questionario_psicossocial.sql
-- ============================================

-- ============================================
-- 1. CRIAR TABELA questionario_psicossocial
-- ============================================

CREATE TABLE IF NOT EXISTS questionario_psicossocial (
    -- Identificação
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID único do registro',
    aluno_matricula VARCHAR(20) NOT NULL COMMENT 'Matrícula do aluno (chave estrangeira)',
    
    -- ============================================
    -- DIMENSÃO 1: SAÚDE MENTAL (Questões 1-5)
    -- ============================================
    q1_ansiedade INT COMMENT 'Sinto ansiedade frequente relacionada aos estudos (1-5)',
    q2_depressao INT COMMENT 'Tenho me sentido desanimado(a) com frequência (1-5)',
    q3_estresse INT COMMENT 'O estresse está afetando meu desempenho (1-5)',
    q4_sono INT COMMENT 'Tenho tido dificuldades para dormir (1-5)',
    q5_bem_estar INT COMMENT 'Me sinto bem emocionalmente para estudar - INVERTIDA (1-5)',
    
    -- ============================================
    -- DIMENSÃO 2: INTEGRAÇÃO SOCIAL (Questões 6-10)
    -- ============================================
    q6_pertencimento INT COMMENT 'Me sinto parte da turma (1-5)',
    q7_amizades INT COMMENT 'Tenho amigos na escola (1-5)',
    q8_participacao INT COMMENT 'Participo de atividades extracurriculares (1-5)',
    q9_relacionamento_professores INT COMMENT 'Tenho bom relacionamento com professores (1-5)',
    q10_apoio_colegas INT COMMENT 'Posso contar com colegas para dificuldades (1-5)',
    
    -- ============================================
    -- DIMENSÃO 3: SATISFAÇÃO COM O CURSO (Questões 11-15)
    -- ============================================
    q11_expectativas INT COMMENT 'O curso atende minhas expectativas (1-5)',
    q12_qualidade_aulas INT COMMENT 'As aulas são de boa qualidade (1-5)',
    q13_infraestrutura INT COMMENT 'A infraestrutura me atende (1-5)',
    q14_conteudo_programatico INT COMMENT 'O conteúdo é relevante (1-5)',
    q15_motivacao_curso INT COMMENT 'Estou motivado(a) com o curso (1-5)',
    
    -- ============================================
    -- DIMENSÃO 4: CONFLITOS (Questões 16-20)
    -- ============================================
    q16_trabalho_estudo INT COMMENT 'O trabalho atrapalha meus estudos (1-5)',
    q17_familia_estudo INT COMMENT 'A família apoia meus estudos - INVERTIDA (1-5)',
    q18_tempo_lazer INT COMMENT 'Tenho tempo para lazer - INVERTIDA (1-5)',
    q19_cansaco INT COMMENT 'Sinto cansaço excessivo (1-5)',
    q20_sobrecarga INT COMMENT 'Me sinto sobrecarregado(a) (1-5)',
    
    -- ============================================
    -- DIMENSÃO 5: INTENÇÃO DE EVASÃO (Questões 21-25)
    -- ============================================
    q21_pensou_abandonar INT COMMENT 'Já pensei em abandonar o curso (1-5)',
    q22_frequencia_pensamento INT COMMENT 'Com que frequência pensa em abandonar (1-5)',
    q23_motivacao_permanencia INT COMMENT 'Estou motivado a permanecer - INVERTIDA (1-5)',
    q24_plano_abandonar INT COMMENT 'Tenho plano de abandonar (1-5)',
    q25_previsao_abandono INT COMMENT 'Devo abandonar em breve (1-5)',
    
    -- ============================================
    -- CAMPOS CALCULADOS
    -- ============================================
    score_saude_mental DECIMAL(5,2) COMMENT 'Score dimensão Saúde Mental (0-25 pontos)',
    score_integracao_social DECIMAL(5,2) COMMENT 'Score dimensão Integração Social (0-20 pontos)',
    score_satisfacao_curso DECIMAL(5,2) COMMENT 'Score dimensão Satisfação Curso (0-20 pontos)',
    score_conflitos DECIMAL(5,2) COMMENT 'Score dimensão Conflitos (0-20 pontos)',
    score_intencao_evasao DECIMAL(5,2) COMMENT 'Score dimensão Intenção Evasão (0-15 pontos)',
    score_psicossocial_total DECIMAL(5,2) COMMENT 'Score total psicossocial (0-100 pontos)',
    
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


-- ============================================
-- 2. ADICIONAR COLUNAS NA TABELA ALUNOS
-- ============================================

-- Coluna para controlar se aluno já respondeu
ALTER TABLE alunos 
ADD COLUMN IF NOT EXISTS questionario_respondido BOOLEAN DEFAULT FALSE 
COMMENT 'Indica se aluno já respondeu questionário psicossocial';

-- Coluna para data da última resposta
ALTER TABLE alunos 
ADD COLUMN IF NOT EXISTS data_ultimo_questionario DATETIME 
COMMENT 'Data da última resposta do questionário psicossocial';

-- Índice para filtrar alunos que não responderam
CREATE INDEX IF NOT EXISTS idx_questionario_respondido 
ON alunos(questionario_respondido);


-- ============================================
-- 3. VERIFICAÇÃO DA ESTRUTURA
-- ============================================

-- Exibir estrutura da tabela
DESCRIBE questionario_psicossocial;

-- Contar colunas
SELECT 
    COUNT(*) AS total_colunas
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'questionario_psicossocial';

-- Exibir estrutura da tabela alunos (colunas adicionadas)
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_COMMENT,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'alunos'
AND COLUMN_NAME IN ('questionario_respondido', 'data_ultimo_questionario');


-- ============================================
-- 4. DADOS DE EXEMPLO (OPCIONAL)
-- ============================================

-- Exemplo de inserção de um registro de teste
-- DESCOMENTE ABAIXO SE DESEJAR INSERIR DADOS DE TESTE

/*
INSERT INTO questionario_psicossocial (
    aluno_matricula,
    q1_ansiedade, q2_depressao, q3_estresse, q4_sono, q5_bem_estar,
    q6_pertencimento, q7_amizades, q8_participacao, q9_relacionamento_professores, q10_apoio_colegas,
    q11_expectativas, q12_qualidade_aulas, q13_infraestrutura, q14_conteudo_programatico, q15_motivacao_curso,
    q16_trabalho_estudo, q17_familia_estudo, q18_tempo_lazer, q19_cansaco, q20_sobrecarga,
    q21_pensou_abandonar, q22_frequencia_pensamento, q23_motivacao_permanencia, q24_plano_abandonar, q25_previsao_abandono,
    score_saude_mental, score_integracao_social, score_satisfacao_curso, score_conflitos, score_intencao_evasao,
    score_psicossocial_total, nivel_risco_psicossocial, fatores_criticos, termo_consentimento
) VALUES (
    '2024101001',
    2, 2, 2, 2, 4,
    4, 4, 3, 4, 4,
    4, 4, 3, 4, 4,
    2, 4, 4, 2, 2,
    1, 1, 5, 1, 1,
    12.50, 9.00, 9.00, 8.00, 3.75,
    42.25, 'BAIXO', '[]', TRUE
);
*/


-- ============================================
-- 5. VIEW PARA RESUMO (OPCIONAL)
-- ============================================

-- View para visualização resumida dos dados
CREATE OR REPLACE VIEW vw_resumo_questionario AS
SELECT 
    q.aluno_matricula,
    a.nome AS nome_aluno,
    q.nivel_risco_psicossocial,
    q.score_psicossocial_total,
    q.score_saude_mental,
    q.score_integracao_social,
    q.score_satisfacao_curso,
    q.score_conflitos,
    q.score_intencao_evasao,
    q.data_resposta,
    q.termo_consentimento
FROM questionario_psicossocial q
LEFT JOIN alunos a ON q.aluno_matricula = a.matricula
ORDER BY q.data_resposta DESC;


-- ============================================
-- FIM DO SCRIPT
-- ============================================

SELECT '✅ Script SQL executado com sucesso!' AS status;
SELECT 'Tabela questionario_psicossocial criada!' AS mensagem;
SELECT 'Colunas adicionadas na tabela alunos!' AS mensagem2;
