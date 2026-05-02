-- ============================================================
-- MIGRAÇÃO: Adicionar dados dos responsáveis na tabela Alunos
-- MySQL - Executar no MySQL Workbench
-- ============================================================

-- 1. Adicionar colunas de responsáveis
ALTER TABLE alunos
ADD COLUMN nome_responsavel_1 VARCHAR(100) NULL COMMENT 'Nome do 1º Responsável',
ADD COLUMN parentesco_responsavel_1 VARCHAR(50) NULL COMMENT 'Parentesco (Mãe, Pai, Avó, Tio, Outro)',
ADD COLUMN telefone_responsavel_1 VARCHAR(20) NULL COMMENT 'Telefone do 1º Responsável',
ADD COLUMN email_responsavel_1 VARCHAR(100) NULL COMMENT 'E-mail do 1º Responsável',
ADD COLUMN nome_responsavel_2 VARCHAR(100) NULL COMMENT 'Nome do 2º Responsável',
ADD COLUMN parentesco_responsavel_2 VARCHAR(50) NULL COMMENT 'Parentesco do 2º Responsável',
ADD COLUMN telefone_responsavel_2 VARCHAR(20) NULL COMMENT 'Telefone do 2º Responsável';

-- 2. Verificar se colunas foram criadas
DESCRIBE alunos;

-- 3. Exemplo de uso (opcional, para teste)
/*
UPDATE alunos SET 
    nome_responsavel_1 = 'Maria Alves da Silva',
    parentesco_responsavel_1 = 'Mãe',
    telefone_responsavel_1 = '(92) 99999-8888'
WHERE matricula = '2025102015';
*/
