-- ============================================
-- SAPEE DEWAS - Sistema de Faltas Consecutivas
-- ============================================
-- Script SQL para implementar o sistema de registro
-- e alerta de faltas consecutivas
-- 
-- Executar no MySQL Workbench ou via:
-- mysql -u root -p sapee_dewas < criar_faltas_consecutivas.sql
-- ============================================

USE sapee_dewas;

-- ============================================
-- 1. TABELA: registro_faltas_diarias
-- ============================================
-- Registro diário de faltas por aluno e disciplina
-- Permite contagem de faltas consecutivas

CREATE TABLE IF NOT EXISTS registro_faltas_diarias (
    -- Identificação
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_matricula VARCHAR(20) NOT NULL COMMENT 'FK para tabela alunos',
    disciplina VARCHAR(100) NOT NULL COMMENT 'Nome da disciplina',
    
    -- Dados da Falta
    data DATE NOT NULL COMMENT 'Data da falta',
    justificada BOOLEAN DEFAULT FALSE COMMENT 'Se a falta foi justificada',
    motivo_justificativa TEXT COMMENT 'Motivo da justificativa (se justificada)',
    data_justificativa DATE COMMENT 'Data da justificativa',
    
    -- Controle
    criado_por INT COMMENT 'ID do usuário que registrou (FK usuarios)',
    criado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chaves Estrangeiras
    FOREIGN KEY (aluno_matricula) REFERENCES alunos(matricula) ON DELETE CASCADE,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    -- Índices para performance
    INDEX idx_aluno (aluno_matricula),
    INDEX idx_data (data),
    INDEX idx_aluno_data (aluno_matricula, data),
    INDEX idx_justificada (justificada),
    INDEX idx_disciplina (disciplina)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro diário de faltas por aluno e disciplina';

-- ============================================
-- 2. TABELA: alertas_faltas_consecutivas
-- ============================================
-- Armazena alertas gerados automaticamente quando
-- aluno atinge limite de faltas consecutivas

CREATE TABLE IF NOT EXISTS alertas_faltas_consecutivas (
    -- Identificação
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_matricula VARCHAR(20) NOT NULL COMMENT 'FK para tabela alunos',

    -- Dados do Alerta
    tipo_alerta ENUM('3_FALTAS', '5_FALTAS', '10_FALTAS') NOT NULL COMMENT 'Tipo/Nível do alerta',
    quantidade_faltas INT NOT NULL COMMENT 'Quantidade de faltas consecutivas',
    data_inicio_faltas DATE NOT NULL COMMENT 'Data da primeira falta do período',
    data_fim_faltas DATE NOT NULL COMMENT 'Data da última falta do período',
    disciplinas_afetadas TEXT COMMENT 'Lista de disciplinas (JSON array)',

    -- Status e Ações
    status ENUM('PENDENTE', 'EM_ANALISE', 'RESOLVIDO', 'IGNORADO') DEFAULT 'PENDENTE',
    acoes_tomadas TEXT COMMENT 'Descrição das ações tomadas para resolver',
    resolvido_por INT COMMENT 'ID do usuário que resolveu (FK usuarios)',
    data_resolucao DATE COMMENT 'Data da resolução',

    -- Controle
    criado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Chaves Estrangeiras
    FOREIGN KEY (aluno_matricula) REFERENCES alunos(matricula) ON DELETE CASCADE,
    FOREIGN KEY (resolvido_por) REFERENCES usuarios(id) ON DELETE SET NULL,

    -- Índices
    INDEX idx_aluno (aluno_matricula),
    INDEX idx_tipo_alerta (tipo_alerta),
    INDEX idx_status (status),
    INDEX idx_data_criacao (criado_at)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Alertas automáticos de faltas consecutivas';

-- ============================================
-- 3. VIEW: vw_faltas_consecutivas_atuais
-- ============================================
-- View para consulta rápida de faltas consecutivas atuais

CREATE OR REPLACE VIEW vw_faltas_consecutivas_atuais AS
SELECT 
    a.matricula,
    a.nome AS aluno_nome,
    c.nome AS curso_nome,
    a.periodo,
    COUNT(rfd.id) AS total_faltas_consecutivas,
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
ORDER BY total_faltas_consecutivas DESC;

-- ============================================
-- 4. DADOS INICIAIS DE EXEMPLO (OPCIONAL)
-- ============================================
-- Descomente para inserir faltas de teste

/*
-- Inserir faltas de exemplo para aluno 2024101001
INSERT INTO registro_faltas_diarias (aluno_matricula, disciplina, data, justificada) VALUES
('2024101001', 'Matemática', DATE_SUB(CURDATE(), INTERVAL 5 DAY), FALSE),
('2024101001', 'Português', DATE_SUB(CURDATE(), INTERVAL 4 DAY), FALSE),
('2024101001', 'Física', DATE_SUB(CURDATE(), INTERVAL 3 DAY), FALSE),
('2024101001', 'Química', DATE_SUB(CURDATE(), INTERVAL 2 DAY), FALSE),
('2024101001', 'Biologia', DATE_SUB(CURDATE(), INTERVAL 1 DAY), FALSE);

-- Isso deve gerar um alerta de 5 faltas consecutivas via backend
*/

-- ============================================
-- 5. CONSULTAS ÚTEIS
-- ============================================

-- Listar todos os alertas pendentes
-- SELECT * FROM alertas_faltas_consecutivas WHERE status = 'PENDENTE' ORDER BY criado_at DESC;

-- Listar alunos com faltas consecutivas
-- SELECT * FROM vw_faltas_consecutivas_atuais;

-- Contar alertas por tipo
-- SELECT tipo_alerta, COUNT(*) AS total FROM alertas_faltas_consecutivas GROUP BY tipo_alerta;

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Verificar tabelas criadas
SELECT 'Tabelas criadas com sucesso!' AS status;

SHOW TABLES LIKE '%faltas%';
SHOW TABLES LIKE '%alertas%';

-- Verificar estrutura
DESCRIBE registro_faltas_diarias;
DESCRIBE alertas_faltas_consecutivas;
