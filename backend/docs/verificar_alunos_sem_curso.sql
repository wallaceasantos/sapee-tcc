-- ============================================
-- CORREÇÃO: Alunos sem curso após migração
-- SAPEE DEWAS Backend
-- ============================================
-- Verifica e corrige alunos com curso_id NULL
-- ============================================

USE sapee_dewas;

-- ============================================
-- PASSO 1: VERIFICAR ALUNOS SEM CURSO
-- ============================================

SELECT '=== ALUNOS SEM CURSO (curso_id = NULL) ===' AS '';

SELECT 
    matricula,
    nome,
    curso_id
FROM alunos
WHERE curso_id IS NULL
ORDER BY matricula;

SELECT 'Total de alunos sem curso:' AS '', COUNT(*) AS total 
FROM alunos 
WHERE curso_id IS NULL;

-- ============================================
-- PASSO 2: VERIFICAR CURSOS EXISTENTES
-- ============================================

SELECT '=== CURSOS DISPONÍVEIS ===' AS '';

SELECT id, nome, modalidade 
FROM cursos 
ORDER BY modalidade, nome;

-- ============================================
-- PASSO 3: CORRIGIR ALUNOS SEM CURSO
-- ============================================

-- Se tiver alunos sem curso, atribui um curso padrão
-- Curso padrão: Técnico em Informática (Integrado) - ID 12

UPDATE alunos 
SET curso_id = 12 
WHERE curso_id IS NULL;

SELECT '✅ Alunos sem curso corrigidos!' AS '';

-- ============================================
-- PASSO 4: VERIFICAR CORREÇÃO
-- ============================================

SELECT '=== VERIFICAÇÃO PÓS-CORREÇÃO ===' AS '';

SELECT 
    'Alunos com curso:' AS '',
    COUNT(*) AS com_curso
FROM alunos 
WHERE curso_id IS NOT NULL;

SELECT 
    'Alunos SEM curso:' AS '',
    COUNT(*) AS sem_curso
FROM alunos 
WHERE curso_id IS NULL;

-- ============================================
-- PASSO 5: DISTRIBUIÇÃO ATUAL
-- ============================================

SELECT '=== DISTRIBUIÇÃO ATUAL: Alunos por Curso ===' AS '';

SELECT 
    c.id,
    c.nome AS curso,
    c.modalidade,
    COUNT(a.matricula) AS alunos
FROM cursos c
LEFT JOIN alunos a ON c.id = a.curso_id
GROUP BY c.id, c.nome, c.modalidade
ORDER BY alunos DESC, c.nome;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT '✅ Verificação e correção concluídas!' AS mensagem;
SELECT '📊 Agora o Dashboard deve carregar corretamente!' AS aviso;
