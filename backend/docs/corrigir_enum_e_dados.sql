-- ============================================
-- ADICIONAR POS_GRADUACAO AO ENUM
-- SAPEE DEWAS Backend
-- ============================================

USE sapee_dewas;

-- ============================================
-- PASSO 1: ALTERAR ENUM DA TABELA CURSOS
-- ============================================

SELECT '=== ADICIONANDO POS_GRADUACAO AO ENUM ===' AS '';

-- Modificar coluna para incluir POS_GRADUACAO
ALTER TABLE cursos 
MODIFY COLUMN modalidade ENUM('Integrado', 'Subsequente', 'Superior', 'Pós-Graduação');

SELECT '✅ Enum atualizado!' AS '';

-- ============================================
-- PASSO 2: CORRIGIR PERÍODOS INVÁLIDOS
-- ============================================

SELECT '=== CORRIGINDO PERÍODOS ===' AS '';

-- Corrigir períodos (máximo 8)
UPDATE alunos SET periodo = 8 WHERE periodo > 8;

-- Corrigir períodos nulos (padrão: 1)
UPDATE alunos SET periodo = 1 WHERE periodo IS NULL;

SELECT '✅ Períodos corrigidos!' AS '';

-- ============================================
-- PASSO 3: CORRIGIR MODALIDADES VAZIAS
-- ============================================

SELECT '=== CORRIGINDO MODALIDADES ===' AS '';

-- Ver quais cursos precisam de correção
SELECT id, nome, modalidade FROM cursos WHERE modalidade = '' OR modalidade IS NULL;

-- Corrigir cursos específicos por ID
-- Engenharias e Licenciaturas (IDs 1-6)
UPDATE cursos SET modalidade = 'Superior' WHERE id IN (1, 2, 3, 4, 5, 6) AND (modalidade = '' OR modalidade IS NULL);

-- Tecnologias (IDs 7-11)
UPDATE cursos SET modalidade = 'Superior' WHERE id IN (7, 8, 9, 10, 11) AND (modalidade = '' OR modalidade IS NULL);

-- Mestrados (IDs 21-25)
UPDATE cursos SET modalidade = 'Pós-Graduação' WHERE id IN (21, 22, 23, 24, 25) AND (modalidade = '' OR modalidade IS NULL);

-- Especializações (IDs 18-20)
UPDATE cursos SET modalidade = 'Pós-Graduação' WHERE id IN (18, 19, 20) AND (modalidade = '' OR modalidade IS NULL);

-- Qualquer curso restante sem modalidade, definir como Integrado (usa ID para evitar safe mode)
UPDATE cursos SET modalidade = 'Integrado' WHERE id > 0 AND (modalidade = '' OR modalidade IS NULL);

SELECT '✅ Modalidades corrigidas!' AS '';

-- ============================================
-- PASSO 4: VERIFICAÇÃO FINAL
-- ============================================

SELECT '=== VERIFICAÇÃO FINAL ===' AS '';

-- Verificar cursos
SELECT id, nome, modalidade FROM cursos ORDER BY id;

-- Verificar períodos
SELECT periodo, COUNT(*) AS alunos FROM alunos GROUP BY periodo ORDER BY periodo;

-- Verificar modalidades
SELECT modalidade, COUNT(*) AS cursos FROM cursos GROUP BY modalidade ORDER BY modalidade;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT '✅ DADOS CORRIGIDOS COM SUCESSO!' AS '';
SELECT '🔄 Recarregue o Dashboard (F5)' AS proximo_passo;
