-- ============================================
-- SCRIPT SQL - TOKENS DE ACESSO PARA QUESTIONÁRIO
-- SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
-- ============================================
-- Este script cria a tabela para gerar tokens de acesso temporário
-- para alunos responderem o questionário sem precisar de login.
-- 
-- Execução: mysql -u root -p sapee_dewas < tokens_questionario.sql
-- ============================================

-- ============================================
-- 1. CRIAR TABELA tokens_questionario
-- ============================================

CREATE TABLE IF NOT EXISTS tokens_questionario (
    -- Identificação
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID único do token',
    aluno_matricula VARCHAR(20) NOT NULL COMMENT 'Matrícula do aluno (chave estrangeira)',
    
    -- Token de acesso
    token VARCHAR(100) UNIQUE NOT NULL COMMENT 'Token único de acesso (UUID)',
    
    -- Validação
    valido_ate DATETIME NOT NULL COMMENT 'Data/hora de expiração do token',
    usado BOOLEAN DEFAULT FALSE COMMENT 'Indica se o token já foi utilizado',
    data_uso DATETIME DEFAULT NULL COMMENT 'Data/hora do primeiro uso',
    
    -- Metadados
    criado_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do token',
    ip_criacao VARCHAR(45) COMMENT 'IP de quem criou o token',
    ip_uso VARCHAR(45) COMMENT 'IP de quem usou o token',
    
    -- Status
    ativo BOOLEAN DEFAULT TRUE COMMENT 'Token está ativo',
    
    -- ============================================
    -- CHAVES ESTRANGEIRAS E ÍNDICES
    -- ============================================
    FOREIGN KEY (aluno_matricula) REFERENCES alunos(matricula) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_aluno_matricula (aluno_matricula),
    INDEX idx_valido_ate (valido_ate),
    INDEX idx_usado (usado),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tokens de acesso temporário para questionário psicossocial sem login';


-- ============================================
-- 2. VIEW PARA TOKENS VÁLIDOS
-- ============================================

CREATE OR REPLACE VIEW vw_tokens_validos AS
SELECT 
    t.id,
    t.token,
    t.aluno_matricula,
    a.nome AS nome_aluno,
    a.email AS email_aluno,
    t.valido_ate,
    t.usado,
    t.data_uso,
    t.criado_at,
    t.ativo,
    TIMESTAMPDIFF(HOUR, NOW(), t.valido_ate) AS horas_restantes
FROM tokens_questionario t
LEFT JOIN alunos a ON t.aluno_matricula = a.matricula
WHERE t.ativo = TRUE 
  AND t.valido_ate > NOW()
ORDER BY t.valido_ate ASC;


-- ============================================
-- 3. PROCEDURE PARA GERAR TOKEN
-- ============================================

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_gerar_token_questionario(
    IN p_aluno_matricula VARCHAR(20),
    IN p_horas_validade INT,
    IN p_ip_criacao VARCHAR(45),
    OUT p_token VARCHAR(100),
    OUT p_valido_ate DATETIME
)
BEGIN
    -- Gerar token único (UUID)
    SET p_token = UUID();
    
    -- Calcular validade
    SET p_valido_ate = DATE_ADD(NOW(), INTERVAL p_horas_validade HOUR);
    
    -- Inserir token na tabela
    INSERT INTO tokens_questionario (
        aluno_matricula,
        token,
        valido_ate,
        ip_criacao,
        usado,
        ativo
    ) VALUES (
        p_aluno_matricula,
        p_token,
        p_valido_ate,
        p_ip_criacao,
        FALSE,
        TRUE
    );
    
    -- Retornar token e validade
    SELECT p_token, p_valido_ate;
END //

DELIMITER ;


-- ============================================
-- 4. PROCEDURE PARA VALIDAR TOKEN
-- ============================================

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_validar_token_questionario(
    IN p_token VARCHAR(100),
    IN p_ip_uso VARCHAR(45),
    OUT p_aluno_matricula VARCHAR(20),
    OUT p_valido BOOLEAN,
    OUT p_mensagem VARCHAR(255)
)
BEGIN
    DECLARE v_valido_ate DATETIME;
    DECLARE v_usado BOOLEAN;
    DECLARE v_ativo BOOLEAN;
    
    -- Buscar token
    SELECT 
        aluno_matricula,
        valido_ate,
        usado,
        ativo
    INTO 
        p_aluno_matricula,
        v_valido_ate,
        v_usado,
        v_ativo
    FROM tokens_questionario
    WHERE token = p_token;
    
    -- Validar
    IF p_aluno_matricula IS NULL THEN
        SET p_valido = FALSE;
        SET p_mensagem = 'Token não encontrado';
    ELSEIF v_ativo = FALSE THEN
        SET p_valido = FALSE;
        SET p_mensagem = 'Token está inativo';
    ELSEIF v_valido_ate < NOW() THEN
        SET p_valido = FALSE;
        SET p_mensagem = 'Token expirado';
    ELSEIF v_usado = TRUE THEN
        SET p_valido = FALSE;
        SET p_mensagem = 'Token já foi utilizado';
    ELSE
        SET p_valido = TRUE;
        SET p_mensagem = 'Token válido';
        
        -- Marcar como usado
        UPDATE tokens_questionario
        SET usado = TRUE,
            data_uso = NOW(),
            ip_uso = p_ip_uso
        WHERE token = p_token;
    END IF;
END //

DELIMITER ;


-- ============================================
-- 5. DADOS DE EXEMPLO (OPCIONAL)
-- ============================================

-- Exemplo de geração de token
-- EXECUTE sp_gerar_token_questionario('2024101001', 24, '127.0.0.1', @token, @validade);
-- SELECT @token AS token_gerado, @validade AS valido_ate;


-- ============================================
-- 6. RELATÓRIO DE TOKENS
-- ============================================

-- Tokens criados nas últimas 24 horas
SELECT 
    COUNT(*) AS total_tokens,
    SUM(CASE WHEN usado = TRUE THEN 1 ELSE 0 END) AS tokens_usados,
    SUM(CASE WHEN usado = FALSE AND valido_ate > NOW() THEN 1 ELSE 0 END) AS tokens_disponiveis,
    SUM(CASE WHEN valido_ate < NOW() THEN 1 ELSE 0 END) AS tokens_expirados
FROM tokens_questionario
WHERE criado_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);


-- ============================================
-- FIM DO SCRIPT
-- ============================================

SELECT '✅ Script SQL executado com sucesso!' AS status;
SELECT 'Tabela tokens_questionario criada!' AS mensagem;
SELECT 'Procedures sp_gerar_token_questionario e sp_validar_token_questionario criadas!' AS mensagem2;
