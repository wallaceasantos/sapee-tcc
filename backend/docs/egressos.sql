-- ============================================
-- SCRIPT SQL - EGRESSOS (ALUNOS QUE SAÍRAM)
-- SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
-- ============================================
-- Este script cria a tabela para acompanhar alunos que saíram do curso
-- e permite medir a eficácia do sistema de predição.
-- 
-- Execução: mysql -u root -p sapee_dewas < egressos.sql
-- ============================================

-- ============================================
-- 1. CRIAR TABELA egressos
-- ============================================

CREATE TABLE IF NOT EXISTS egressos (
    -- Identificação
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID único do registro',
    aluno_matricula VARCHAR(20) NOT NULL COMMENT 'Matrícula do aluno (chave estrangeira)',
    
    -- ============================================
    -- DADOS DA SAÍDA
    -- ============================================
    data_saida DATE NOT NULL COMMENT 'Data de saída do curso',
    motivo_saida ENUM('TRANSFERENCIA', 'ABANDONO', 'CONCLUSAO', 'TRANCAMENTO', 'JUBILAMENTO', 'OUTROS') 
        NOT NULL COMMENT 'Motivo principal da saída',
    
    -- ============================================
    -- DETALHES DO MOTIVO
    -- ============================================
    motivo_detalhes TEXT COMMENT 'Detalhes adicionais sobre o motivo',
    
    -- Para transferência
    instituicao_destino VARCHAR(200) COMMENT 'Para onde o aluno transferiu',
    curso_destino VARCHAR(200) COMMENT 'Curso para onde transferiu',
    
    -- Para abandono
    motivo_abandono_principal ENUM(
        'FINANCEIRO', 
        'SAUDE', 
        'FAMILIA', 
        'TRABALHO', 
        'DIFICULDADE_ACADEMICA', 
        'FALTA_INTERESSE',
        'OUTROS'
    ) COMMENT 'Motivo principal do abandono',
    
    -- Para conclusão
    situacao_atual ENUM('EMPREGADO', 'DESEMPREGADO', 'ESTUDANDO', 'OUTROS') COMMENT 'Situação após conclusão',
    
    -- ============================================
    -- ACOMPANHAMENTO PÓS-SAÍDA (6 MESES DEPOIS)
    -- ============================================
    data_acompanhamento DATE COMMENT 'Data do acompanhamento (6 meses após saída)',
    
    -- Onde está o aluno
    esta_estudando BOOLEAN DEFAULT FALSE COMMENT 'Está estudando em outra instituição',
    instituicao_atual VARCHAR(200) COMMENT 'Instituição onde está estudando',
    curso_atual VARCHAR(200) COMMENT 'Curso atual',
    
    esta_trabalhando BOOLEAN DEFAULT FALSE COMMENT 'Está trabalhando',
    empresa_atual VARCHAR(200) COMMENT 'Empresa onde trabalha',
    cargo_atual VARCHAR(100) COMMENT 'Cargo atual',
    salario_atual DECIMAL(10,2) COMMENT 'Salário atual',
    
    -- Satisfação
    satisfeito_com_formacao BOOLEAN DEFAULT TRUE COMMENT 'Está satisfeito com a formação recebida',
    recomendaria_curso BOOLEAN DEFAULT TRUE COMMENT 'Recomendaria o curso',
    
    -- ============================================
    -- DADOS DO SAPEE (PARA MEDIR EFICÁCIA)
    -- ============================================
    tinha_predicao_risco BOOLEAN DEFAULT FALSE COMMENT 'Tinha predição de risco no SAPEE',
    nivel_risco_predito ENUM('BAIXO', 'MEDIO', 'ALTO') COMMENT 'Nível de risco predito pelo SAPEE',
    recebeu_intervencao BOOLEAN DEFAULT FALSE COMMENT 'Recebeu intervenção do SAPEE',
    tipo_intervencao TEXT COMMENT 'Tipos de intervenção recebidas',
    
    -- ============================================
    -- METADADOS
    -- ============================================
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de cadastro do egresso',
    cadastrado_por INT COMMENT 'ID do usuário que cadastrou',
    data_atualizacao DATETIME ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização',
    atualizado_por INT COMMENT 'ID do usuário que atualizou',
    
    observacoes TEXT COMMENT 'Observações adicionais',
    
    -- ============================================
    -- CHAVES ESTRANGEIRAS E ÍNDICES
    -- ============================================
    FOREIGN KEY (aluno_matricula) REFERENCES alunos(matricula) ON DELETE CASCADE,
    INDEX idx_aluno_matricula (aluno_matricula),
    INDEX idx_data_saida (data_saida),
    INDEX idx_motivo_saida (motivo_saida),
    INDEX idx_motivo_abandono (motivo_abandono_principal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Acompanhamento de egressos (alunos que saíram do curso)';


-- ============================================
-- 2. VIEW PARA EGRESSOS RECENTES
-- ============================================

CREATE OR REPLACE VIEW vw_egressos_recentes AS
SELECT 
    e.id,
    e.aluno_matricula,
    a.nome AS nome_aluno,
    a.curso_id,
    c.nome AS nome_curso,
    e.data_saida,
    e.motivo_saida,
    e.motivo_abandono_principal,
    e.tinha_predicao_risco,
    e.nivel_risco_predito,
    e.recebeu_intervencao,
    e.esta_estudando,
    e.esta_trabalhando,
    e.data_cadastro
FROM egressos e
LEFT JOIN alunos a ON e.aluno_matricula = a.matricula
LEFT JOIN cursos c ON a.curso_id = c.id
WHERE e.data_saida >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
ORDER BY e.data_saida DESC;


-- ============================================
-- 3. VIEW PARA EFICÁCIA DO SAPEE
-- ============================================

CREATE OR REPLACE VIEW vw_eficacia_sapee AS
SELECT 
    COUNT(*) AS total_egressos,
    SUM(CASE WHEN motivo_saida = 'ABANDONO' THEN 1 ELSE 0 END) AS total_abandonos,
    SUM(CASE WHEN tinha_predicao_risco = TRUE AND motivo_saida = 'ABANDONO' THEN 1 ELSE 0 END) AS abandonos_preditos,
    SUM(CASE WHEN tinha_predicao_risco = FALSE AND motivo_saida = 'ABANDONO' THEN 1 ELSE 0 END) AS abandonos_nao_preditos,
    SUM(CASE WHEN recebeu_intervencao = TRUE AND motivo_saida = 'ABANDONO' THEN 1 ELSE 0 END) AS abandonos_com_intervencao,
    ROUND(
        SUM(CASE WHEN tinha_predicao_risco = TRUE AND motivo_saida = 'ABANDONO' THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(SUM(CASE WHEN motivo_saida = 'ABANDONO' THEN 1 ELSE 0 END), 0),
        2
    ) AS percentual_predicao_correta,
    ROUND(
        SUM(CASE WHEN recebeu_intervencao = TRUE AND motivo_saida != 'ABANDONO' THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(SUM(CASE WHEN recebeu_intervencao = TRUE THEN 1 ELSE 0 END), 0),
        2
    ) AS percentual_sucesso_intervencao
FROM egressos
WHERE data_saida >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH);


-- ============================================
-- 4. PROCEDURE PARA CADASTRAR EGRESSO
-- ============================================

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_cadastrar_egresso(
    IN p_aluno_matricula VARCHAR(20),
    IN p_data_saida DATE,
    IN p_motivo_saida VARCHAR(50),
    IN p_motivo_detalhes TEXT,
    IN p_motivo_abandono_principal VARCHAR(50),
    IN p_cadastrado_por INT,
    OUT p_egresso_id INT
)
BEGIN
    DECLARE v_tinha_predicao BOOLEAN DEFAULT FALSE;
    DECLARE v_nivel_risco VARCHAR(20);
    DECLARE v_recebeu_intervencao BOOLEAN DEFAULT FALSE;
    DECLARE v_intervencoes TEXT;
    
    -- Verificar se tinha predição de risco
    SELECT 
        CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END,
        MAX(nivel_risco)
    INTO v_tinha_predicao, v_nivel_risco
    FROM predicoes
    WHERE aluno_id = p_aluno_matricula
    AND nivel_risco IN ('MEDIO', 'ALTO');
    
    -- Verificar se recebeu intervenção
    SELECT 
        CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END,
        GROUP_CONCAT(DISTINCT tipo SEPARATOR ', ')
    INTO v_recebeu_intervencao, v_intervencoes
    FROM intervencoes
    WHERE aluno_id = p_aluno_matricula;
    
    -- Inserir egresso
    INSERT INTO egressos (
        aluno_matricula,
        data_saida,
        motivo_saida,
        motivo_detalhes,
        motivo_abandono_principal,
        tinha_predicao_risco,
        nivel_risco_predito,
        recebeu_intervencao,
        tipo_intervencao,
        cadastrado_por
    ) VALUES (
        p_aluno_matricula,
        p_data_saida,
        p_motivo_saida,
        p_motivo_detalhes,
        p_motivo_abandono_principal,
        v_tinha_predicao,
        v_nivel_risco,
        v_recebeu_intervencao,
        v_intervencoes,
        p_cadastrado_por
    );
    
    SET p_egresso_id = LAST_INSERT_ID();
    
    -- Atualizar aluno como inativo
    UPDATE alunos
    SET questionario_respondido = FALSE  -- Marca como não ativo
    WHERE matricula = p_aluno_matricula;
    
END //

DELIMITER ;


-- ============================================
-- 5. DADOS DE EXEMPLO (OPCIONAL)
-- ============================================

-- Exemplo de cadastro de egresso
-- CALL sp_cadastrar_egresso('2024101001', '2026-03-01', 'ABANDONO', 'Dificuldades financeiras', 'FINANCEIRO', 1, @id);
-- SELECT @id AS egresso_id;


-- ============================================
-- 6. RELATÓRIOS
-- ============================================

-- Relatório de motivos de abandono
SELECT 
    motivo_abandono_principal,
    COUNT(*) AS quantidade,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM egressos WHERE motivo_saida = 'ABANDONO'), 2) AS percentual
FROM egressos
WHERE motivo_saida = 'ABANDONO'
GROUP BY motivo_abandono_principal
ORDER BY quantidade DESC;


-- ============================================
-- FIM DO SCRIPT
-- ============================================

SELECT '✅ Script SQL executado com sucesso!' AS status;
SELECT 'Tabela egressos criada!' AS mensagem;
SELECT 'Views vw_egressos_recentes e vw_eficacia_sapee criadas!' AS mensagem2;
SELECT 'Procedure sp_cadastrar_egresso criada!' AS mensagem3;
