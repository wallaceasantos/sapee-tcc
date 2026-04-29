-- ============================================
-- CORREÇÃO URGENTE: Alunos sem curso
-- SAPEE DEWAS Backend
-- ============================================
-- Corrige os 53 alunos que ficaram sem curso
-- ============================================

USE sapee_dewas;

-- ============================================
-- VERIFICAÇÃO INICIAL
-- ============================================

SELECT '=== VERIFICAÇÃO INICIAL ===' AS '';

SELECT 
    'Total de alunos:' AS '',
    COUNT(*) AS total
FROM alunos;

SELECT 
    'Alunos SEM curso (PROBLEMA!):' AS '',
    COUNT(*) AS sem_curso
FROM alunos 
WHERE curso_id IS NULL;

SELECT 
    'Alunos COM curso:' AS '',
    COUNT(*) AS com_curso
FROM alunos 
WHERE curso_id IS NOT NULL;

-- ============================================
-- CORRIGIR TODOS OS ALUNOS SEM CURSO
-- ============================================

-- Curso padrão: Técnico em Informática (Integrado) - ID 12
-- Você pode mudar para outro curso se preferir

SELECT '=== CORRIGINDO ALUNOS ===' AS '';

UPDATE alunos 
SET curso_id = 12  -- Técnico em Informática (Integrado)
WHERE curso_id IS NULL;

SELECT '✅ Alunos corrigidos!' AS '';
SELECT CONCAT('Quantidade: ', ROW_COUNT()) AS 'alunos_atualizados';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

SELECT '=== VERIFICAÇÃO FINAL ===' AS '';

SELECT 
    'Alunos COM curso:' AS '',
    COUNT(*) AS com_curso
FROM alunos 
WHERE curso_id IS NOT NULL;

SELECT 
    'Alunos SEM curso:' AS '',
    COUNT(*) AS sem_curso
FROM alunos 
WHERE curso_id IS NULL;

-- ============================================
-- DISTRIBUIÇÃO POR CURSO
-- ============================================

SELECT '=== DISTRIBUIÇÃO POR CURSO ===' AS '';

SELECT 
    c.id,
    c.nome AS curso,
    c.modalidade,
    COUNT(a.matricula) AS alunos
FROM cursos c
LEFT JOIN alunos a ON c.id = a.curso_id
WHERE a.matricula IS NOT NULL
GROUP BY c.id, c.nome, c.modalidade
ORDER BY alunos DESC;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT '✅ CORREÇÃO CONCLUÍDA!' AS '';
SELECT '📊 Agora o Dashboard vai carregar "Risco por Curso"!' AS aviso;
SELECT '🔄 Recarregue a página do Dashboard (F5)' AS proximo_passo;
