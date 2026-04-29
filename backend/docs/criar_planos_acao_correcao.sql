-- ============================================
-- SAPEE DEWAS - Correção para permitir planos genéricos
-- ============================================
-- Executar APENAS se já tiver executado o script anterior e dado erro
-- ============================================

USE sapee_dewas;

-- Dropar tabelas se existirem (para recriar corretamente)
DROP TABLE IF EXISTS aluno_metas;
DROP TABLE IF EXISTS metas_semestrais;
DROP TABLE IF EXISTS planos_acao;

-- ============================================
-- 1. TABELA: planos_acao (CORRIGIDA)
-- ============================================

CREATE TABLE planos_acao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT NULL COMMENT 'FK para tabela cursos (NULL = plano genérico)',
    nivel_risco ENUM('BAIXO', 'MEDIO', 'ALTO') NOT NULL,
    meta_frequencia_minima DECIMAL(5,2) DEFAULT 75.00,
    meta_media_minima DECIMAL(4,2) DEFAULT 6.00,
    prazo_dias INT DEFAULT 30,
    acoes_recomendadas TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE SET NULL,
    
    INDEX idx_curso (curso_id),
    INDEX idx_nivel_risco (nivel_risco),
    INDEX idx_ativo (ativo),
    INDEX idx_curso_nivel (curso_id, nivel_risco)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. TABELA: metas_semestrais
-- ============================================

CREATE TABLE metas_semestrais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT NOT NULL,
    semestre VARCHAR(10) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    meta_frequencia_geral DECIMAL(5,2) DEFAULT 80.00,
    meta_media_geral DECIMAL(4,2) DEFAULT 7.00,
    meta_reducao_evasao DECIMAL(5,2) DEFAULT 10.00,
    meta_recuperacao DECIMAL(5,2) DEFAULT 50.00,
    status ENUM('ATIVA', 'CONCLUIDA', 'CANCELADA') DEFAULT 'ATIVA',
    observacoes TEXT,
    criado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    
    INDEX idx_curso (curso_id),
    INDEX idx_semestre (semestre),
    INDEX idx_status (status),
    UNIQUE KEY unique_curso_semestre (curso_id, semestre)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. TABELA: aluno_metas
-- ============================================

CREATE TABLE aluno_metas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_matricula VARCHAR(20) NOT NULL,
    plano_acao_id INT,
    meta_frequencia DECIMAL(5,2) DEFAULT 75.00,
    meta_media DECIMAL(4,2) DEFAULT 6.00,
    data_limite DATE NOT NULL,
    status ENUM('PENDENTE', 'EM_ANDAMENTO', 'ATINGIDA', 'NAO_ATINGIDA') DEFAULT 'PENDENTE',
    data_atingimento DATE,
    observacoes TEXT,
    criado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (aluno_matricula) REFERENCES alunos(matricula) ON DELETE CASCADE,
    FOREIGN KEY (plano_acao_id) REFERENCES planos_acao(id) ON DELETE SET NULL,
    
    INDEX idx_aluno (aluno_matricula),
    INDEX idx_plano (plano_acao_id),
    INDEX idx_status (status),
    INDEX idx_data_limite (data_limite)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. DADOS INICIAIS - PLANOS GENÉRICOS
-- ============================================

INSERT INTO planos_acao (curso_id, nivel_risco, meta_frequencia_minima, meta_media_minima, prazo_dias, acoes_recomendadas, observacoes)
VALUES
(NULL, 'BAIXO', 80.00, 7.00, 60, 
 '["Acompanhar frequência mensalmente", "Manter comunicação com aluno", "Oferecer apoio se necessário"]',
 'Plano genérico para risco BAIXO'),

(NULL, 'MEDIO', 75.00, 6.00, 45,
 '["Convocar aluno para reunião", "Acompanhar frequência quinzenalmente", "Verificar necessidade de monitoria", "Oferecer apoio psicossocial se necessário"]',
 'Plano genérico para risco MÉDIO'),

(NULL, 'ALTO', 75.00, 6.00, 30,
 '["Convocar aluno para reunião com coordenador", "Contatar família/responsável", "Encaminhar para serviço psicossocial", "Oferecer monitoria nas disciplinas críticas", "Avaliar concessão de auxílio emergencial", "Incluir em programa de apoio acadêmico", "Agendar acompanhamento quinzenal"]',
 'Plano genérico para risco ALTO');

-- ============================================
-- VERIFICAR CRIAÇÃO
-- ============================================

SELECT 'Tabelas criadas com sucesso!' AS status;

SHOW TABLES LIKE '%plano%';
SHOW TABLES LIKE '%meta%';

SELECT id, nivel_risco, meta_frequencia_minima, prazo_dias, ativo
FROM planos_acao;
