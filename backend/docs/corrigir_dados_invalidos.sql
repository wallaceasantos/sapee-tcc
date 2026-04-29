-- ============================================
-- CORREÇÃO DE DADOS INVÁLIDOS
-- VERSÃO SEM SAFE UPDATE MODE
-- SAPEE DEWAS Backend
-- ============================================

USE sapee_dewas;

-- ============================================
-- PASSO 1: CORRIGIR PERÍODOS INVÁLIDOS
-- ============================================

SELECT '=== CORRIGINDO PERÍODOS ===' AS '';

-- Corrigir períodos (máximo 8)
UPDATE alunos SET periodo = 8 WHERE periodo > 8;

-- Corrigir períodos nulos (padrão: 1)
UPDATE alunos SET periodo = 1 WHERE periodo IS NULL;

SELECT '✅ Períodos corrigidos!' AS '';

-- ============================================
-- PASSO 2: CORRIGIR MODALIDADES VAZIAS
-- ============================================

SELECT '=== CORRIGINDO MODALIDADES ===' AS '';

-- Ver quais cursos precisam de correção
SELECT id, nome, modalidade FROM cursos WHERE modalidade = '' OR modalidade IS NULL;

-- Corrigir cursos específicos por ID
-- Engenharia Civil (ID 1)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 1 AND (modalidade = '' OR modalidade IS NULL);

-- Engenharia Mecânica (ID 2)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 2 AND (modalidade = '' OR modalidade IS NULL);

-- Ciências Biológicas Licenciatura (ID 3)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 3 AND (modalidade = '' OR modalidade IS NULL);

-- Física Licenciatura (ID 4)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 4 AND (modalidade = '' OR modalidade IS NULL);

-- Matemática Licenciatura (ID 5)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 5 AND (modalidade = '' OR modalidade IS NULL);

-- Química Licenciatura (ID 6)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 6 AND (modalidade = '' OR modalidade IS NULL);

-- Tecnologia em Alimentos (ID 7)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 7 AND (modalidade = '' OR modalidade IS NULL);

-- ADS (ID 8)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 8 AND (modalidade = '' OR modalidade IS NULL);

-- Construção de Edifícios (ID 9)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 9 AND (modalidade = '' OR modalidade IS NULL);

-- Processos Químicos (ID 10)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 10 AND (modalidade = '' OR modalidade IS NULL);

-- Produção Publicitária (ID 11)
UPDATE cursos SET modalidade = 'SUPERIOR' WHERE id = 11 AND (modalidade = '' OR modalidade IS NULL);

-- ProfEPT (ID 21)
UPDATE cursos SET modalidade = 'POS_GRADUACAO' WHERE id = 21 AND (modalidade = '' OR modalidade IS NULL);

-- PPGET (ID 22)
UPDATE cursos SET modalidade = 'POS_GRADUACAO' WHERE id = 22 AND (modalidade = '' OR modalidade IS NULL);

-- MNPEF (ID 23)
UPDATE cursos SET modalidade = 'POS_GRADUACAO' WHERE id = 23 AND (modalidade = '' OR modalidade IS NULL);

-- PROFQUI (ID 24)
UPDATE cursos SET modalidade = 'POS_GRADUACAO' WHERE id = 24 AND (modalidade = '' OR modalidade IS NULL);

-- PROFEI (ID 25)
UPDATE cursos SET modalidade = 'POS_GRADUACAO' WHERE id = 25 AND (modalidade = '' OR modalidade IS NULL);

-- Especializações (IDs 18-20)
UPDATE cursos SET modalidade = 'POS_GRADUACAO' WHERE id IN (18, 19, 20) AND (modalidade = '' OR modalidade IS NULL);

-- Qualquer curso restante sem modalidade, definir como INTEGRADO
UPDATE cursos SET modalidade = 'INTEGRADO' WHERE modalidade = '' OR modalidade IS NULL;

SELECT '✅ Modalidades corrigidas!' AS '';

-- ============================================
-- PASSO 3: VERIFICAÇÃO FINAL
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
