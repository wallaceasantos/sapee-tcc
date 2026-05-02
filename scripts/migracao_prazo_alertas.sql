-- ============================================================
-- MIGRAÇÃO: Adicionar prazo de resolução aos alertas
-- MySQL - Executar no MySQL Workbench
-- ============================================================

-- 1. Adicionar coluna data_limite
ALTER TABLE alertas_faltas_consecutivas
ADD COLUMN data_limite DATE NULL COMMENT 'Prazo máximo para resolução do alerta';

-- 2. Desativar safe mode temporariamente
SET SQL_SAFE_UPDATES = 0;

-- 3. Preencher data_limite para alertas existentes baseado no tipo
UPDATE alertas_faltas_consecutivas
SET data_limite = DATE_ADD(criado_at, INTERVAL 
    CASE tipo_alerta
        WHEN '10_FALTAS' THEN 3
        WHEN '5_FALTAS' THEN 5
        ELSE 7
    END DAY)
WHERE data_limite IS NULL;

-- 4. Reativar safe mode
SET SQL_SAFE_UPDATES = 1;

-- 3. Verificar se coluna foi criada
DESCRIBE alertas_faltas_consecutivas;

-- 4. Verificar alertas com prazos
SELECT 
    id,
    aluno_matricula,
    tipo_alerta,
    status,
    data_limite,
    DATEDIFF(data_limite, CURDATE()) as dias_restantes,
    CASE 
        WHEN DATEDIFF(data_limite, CURDATE()) < 0 THEN 'VENCIDO'
        WHEN DATEDIFF(data_limite, CURDATE()) <= 3 THEN 'ATENÇÃO'
        ELSE 'NO PRAZO'
    END as situacao
FROM alertas_faltas_consecutivas
WHERE status IN ('PENDENTE', 'EM_ANALISE')
ORDER BY data_limite ASC;
