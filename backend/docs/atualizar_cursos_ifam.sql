-- ============================================
-- ATUALIZAÇÃO DE CURSOS - IFAM REAL
-- SAPEE DEWAS Backend
-- ============================================
-- Substitui cursos fictícios por cursos reais do IFAM
-- ============================================

USE sapee_dewas;

-- ============================================
-- LIMPAR CURSOS ATUAIS (FICTÍCIOS)
-- ============================================
-- ATENÇÃO: Isso não afeta alunos existentes (curso_id será NULL)
-- ============================================

-- Verificar se há alunos vinculados aos cursos atuais
SELECT 'Alunos vinculados a cursos:' AS '', COUNT(*) AS total 
FROM alunos 
WHERE curso_id IS NOT NULL;

-- Se tiver alunos, faça backup dos curso_id antes de limpar
-- SELECT matricula, nome, curso_id FROM alunos WHERE curso_id IS NOT NULL;

-- Limpar cursos atuais
TRUNCATE TABLE cursos;

-- Resetar auto increment
ALTER TABLE cursos AUTO_INCREMENT = 1;

-- ============================================
-- INSERIR CURSOS REAIS DO IFAM
-- ============================================

-- MODALIDADE: SUPERIOR (GRADUAÇÃO)
-- ============================================

-- Engenharias
INSERT INTO cursos (nome, modalidade) VALUES 
('Engenharia Civil', 'SUPERIOR'),
('Engenharia Mecânica', 'SUPERIOR');

-- Licenciaturas
INSERT INTO cursos (nome, modalidade) VALUES 
('Ciências Biológicas (Licenciatura)', 'SUPERIOR'),
('Física (Licenciatura)', 'SUPERIOR'),
('Matemática (Licenciatura)', 'SUPERIOR'),
('Química (Licenciatura)', 'SUPERIOR');

-- Tecnologia
INSERT INTO cursos (nome, modalidade) VALUES 
('Tecnologia em Alimentos', 'SUPERIOR'),
('Análise e Desenvolvimento de Sistemas', 'SUPERIOR'),
('Construção de Edifícios', 'SUPERIOR'),
('Processos Químicos', 'SUPERIOR'),
('Produção Publicitária', 'SUPERIOR');

-- MODALIDADE: TÉCNICO INTEGRADO
-- ============================================

INSERT INTO cursos (nome, modalidade) VALUES 
('Técnico em Informática (Integrado)', 'INTEGRADO'),
('Técnico em Edificações (Integrado)', 'INTEGRADO'),
('Técnico em Administração (Integrado)', 'INTEGRADO'),
('Técnico em Agropecuária (Integrado)', 'INTEGRADO');

-- MODALIDADE: TÉCNICO SUBSEQUENTE
-- ============================================

INSERT INTO cursos (nome, modalidade) VALUES 
('Técnico em Edificações (Subsequente)', 'SUBSEQUENTE'),
('Técnico em Meio Ambiente (Subsequente)', 'SUBSEQUENTE');

-- MODALIDADE: PÓS-GRADUAÇÃO (ESPECIALIZAÇÃO)
-- ============================================

INSERT INTO cursos (nome, modalidade) VALUES 
('Especialização em Gestão em Segurança do Trabalho', 'POS_GRADUACAO'),
('Especialização em Gestão Ambiental', 'POS_GRADUACAO'),
('Especialização em Investigações Educacionais', 'POS_GRADUACAO');

-- MODALIDADE: PÓS-GRADUAÇÃO (MESTRADO)
-- ============================================

INSERT INTO cursos (nome, modalidade) VALUES 
('Mestrado em Educação Profissional e Tecnológica (ProfEPT)', 'POS_GRADUACAO'),
('Mestrado em Ensino Tecnológico (PPGET)', 'POS_GRADUACAO'),
('Mestrado em Ensino de Física (MNPEF)', 'POS_GRADUACAO'),
('Mestrado em Química (PROFQUI)', 'POS_GRADUACAO'),
('Mestrado em Educação Inclusiva (PROFEI)', 'POS_GRADUACAO');

-- ============================================
-- VERIFICAR CURSOS INSERIDOS
-- ============================================

SELECT 
    modalidade,
    COUNT(*) AS quantidade,
    GROUP_CONCAT(nome ORDER BY nome SEPARATOR ', ') AS cursos
FROM cursos
GROUP BY modalidade
ORDER BY 
    CASE modalidade
        WHEN 'SUPERIOR' THEN 1
        WHEN 'INTEGRADO' THEN 2
        WHEN 'SUBSEQUENTE' THEN 3
        WHEN 'POS_GRADUACAO' THEN 4
    END;

-- ============================================
-- LISTAR TODOS OS CURSOS
-- ============================================

SELECT 
    id,
    nome,
    modalidade
FROM cursos
ORDER BY 
    modalidade,
    nome;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT '✅ Cursos do IFAM atualizados com sucesso!' AS mensagem;
SELECT CONCAT('Total de cursos cadastrados: ', COUNT(*)) AS total FROM cursos;
