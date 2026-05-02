-- ============================================================
-- MIGRAÇÃO: Adicionar campos de contato com responsáveis
-- MySQL - Executar no MySQL Workbench
-- ============================================================

-- 1. Adicionar colunas de contato
ALTER TABLE alertas_faltas_consecutivas
ADD COLUMN contato_responsavel_data DATE NULL COMMENT 'Data do contato com os responsáveis',
ADD COLUMN contato_responsavel_meio VARCHAR(50) NULL COMMENT 'Meio de contato: Telefone, WhatsApp, Email, Presencial',
ADD COLUMN contato_responsavel_obs TEXT NULL COMMENT 'Observações sobre o contato com responsáveis';

-- 2. Verificar se colunas foram criadas
DESCRIBE alertas_faltas_consecutivas;

-- 3. Verificar alertas com contatos registrados
SELECT 
    id,
    aluno_matricula,
    contato_responsavel_data,
    contato_responsavel_meio,
    LEFT(contato_responsavel_obs, 50) as observacao
FROM alertas_faltas_consecutivas
WHERE contato_responsavel_data IS NOT NULL
ORDER BY contato_responsavel_data DESC;

-- 4. Estatísticas de contato por meio
SELECT 
    contato_responsavel_meio as meio,
    COUNT(*) as total_contatos
FROM alertas_faltas_consecutivas
WHERE contato_responsavel_data IS NOT NULL
GROUP BY contato_responsavel_meio;
