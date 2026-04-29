-- ============================================
-- MIGRAÇÃO: Adicionar campos de questionário ao model Aluno
-- SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar
-- Data: 2026-04-24
-- ============================================

-- Adicionar coluna questionario_respondido
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS questionario_respondido BOOLEAN DEFAULT FALSE 
AFTER primeiro_geracao_universidade;

-- Adicionar coluna data_ultimo_questionario
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS data_ultimo_questionario DATETIME 
AFTER questionario_respondido;

-- Criar índice para performance de queries
CREATE INDEX IF NOT EXISTS idx_questionario_respondido 
ON alunos(questionario_respondido);

-- Criar índice para busca por data
CREATE INDEX IF NOT EXISTS idx_data_ultimo_questionario 
ON alunos(data_ultimo_questionario);

-- ============================================
-- Verificação
-- ============================================
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'alunos'
    AND COLUMN_NAME IN ('questionario_respondido', 'data_ultimo_questionario');

-- ============================================
-- Mensagem de sucesso
-- ============================================
SELECT '✅ Migração aplicada com sucesso!' AS status;
