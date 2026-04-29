-- ============================================
-- SAPEE DEWAS - Script SQL Simplificado para Faltas Consecutivas
-- ============================================
-- Versão simplificada e testada
-- Executar no MySQL Workbench

USE sapee_dewas;

-- ============================================
-- 1. TABELA: registro_faltas_diarias
-- ============================================

CREATE TABLE IF NOT EXISTS registro_faltas_diarias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_matricula VARCHAR(20) NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    data DATE NOT NULL,
    justificada BOOLEAN DEFAULT FALSE,
    motivo_justificativa TEXT,
    data_justificativa DATE,
    criado_por INT,
    criado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (aluno_matricula) REFERENCES alunos(matricula) ON DELETE CASCADE,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    INDEX idx_aluno (aluno_matricula),
    INDEX idx_data (data),
    INDEX idx_aluno_data (aluno_matricula, data)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. TABELA: alertas_faltas_consecutivas
-- ============================================

CREATE TABLE IF NOT EXISTS alertas_faltas_consecutivas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_matricula VARCHAR(20) NOT NULL,
    tipo_alerta ENUM('3_FALTAS', '5_FALTAS', '10_FALTAS') NOT NULL,
    quantidade_faltas INT NOT NULL,
    data_inicio_faltas DATE NOT NULL,
    data_fim_faltas DATE NOT NULL,
    disciplinas_afetadas TEXT,
    status ENUM('PENDENTE', 'EM_ANALISE', 'RESOLVIDO', 'IGNORADO') DEFAULT 'PENDENTE',
    acoes_tomadas TEXT,
    resolvido_por INT,
    data_resolucao DATE,
    criado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (aluno_matricula) REFERENCES alunos(matricula) ON DELETE CASCADE,
    FOREIGN KEY (resolvido_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    INDEX idx_aluno (aluno_matricula),
    INDEX idx_status (status),
    INDEX idx_tipo_alerta (tipo_alerta)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. VIEW: vw_faltas_consecutivas_atuais
-- ============================================

CREATE OR REPLACE VIEW vw_faltas_consecutivas_atuais AS
SELECT 
    a.matricula,
    a.nome AS aluno_nome,
    c.nome AS curso_nome,
    a.periodo,
    COUNT(rfd.id) AS total_faltas,
    MIN(rfd.data) AS data_primeira_falta,
    MAX(rfd.data) AS data_ultima_falta,
    GROUP_CONCAT(DISTINCT rfd.disciplina SEPARATOR ', ') AS disciplinas,
    SUM(CASE WHEN rfd.justificada = FALSE THEN 1 ELSE 0 END) AS faltas_nao_justificadas
FROM registro_faltas_diarias rfd
JOIN alunos a ON rfd.aluno_matricula = a.matricula
LEFT JOIN cursos c ON a.curso_id = c.id
WHERE rfd.data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY a.matricula, a.nome, c.nome, a.periodo
HAVING COUNT(rfd.id) >= 3
ORDER BY total_faltas DESC;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

SELECT 'Tabelas criadas com sucesso!' AS status;

SHOW TABLES LIKE '%faltas%';
SHOW TABLES LIKE '%alertas%';

DESCRIBE registro_faltas_diarias;
DESCRIBE alertas_faltas_consecutivas;
SELECT * FROM vw_faltas_consecutivas_atuais;
