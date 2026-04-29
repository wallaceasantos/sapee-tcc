-- ============================================
-- ATUALIZAR TABELA PREDICOES - MUITO_ALTO
-- SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
-- ============================================
-- Adiciona o valor 'MUITO_ALTO' ao ENUM nivel_risco da tabela predicoes
-- 
-- Execução: mysql -u root -p sapee_dewas < atualizar_predicoes_enum.sql
-- ============================================

-- Verificar estrutura atual
SELECT 'Estrutura atual da coluna nivel_risco:' AS info;
SHOW COLUMNS FROM predicoes LIKE 'nivel_risco';

-- Alterar ENUM para incluir MUITO_ALTO
ALTER TABLE predicoes 
MODIFY COLUMN nivel_risco ENUM('BAIXO', 'MEDIO', 'ALTO', 'MUITO_ALTO') 
NOT NULL 
COMMENT 'Nível de risco de evasão';

-- Verificar alteração
SELECT 'Nova estrutura da coluna nivel_risco:' AS info;
SHOW COLUMNS FROM predicoes LIKE 'nivel_risco';

-- Mensagem de sucesso
SELECT '✅ Tabela predicoes atualizada com sucesso!' AS status;
SELECT 'O valor MUITO_ALTO agora está disponível.' AS mensagem;
