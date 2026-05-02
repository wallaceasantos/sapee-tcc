-- ============================================================
-- MIGRAÇÃO: Consolidação de Frequência e Faltas
-- MySQL - Executar no MySQL Workbench
-- ============================================================
-- Este script:
-- 1. Marca dados legados de frequencia_mensal como 'importados'
-- 2. Não remove dados (preserva histórico)
-- 3. Documenta a consolidação
-- ============================================================

-- 1. Verificar quantos registros existem em cada tabela
SELECT 'frequencia_mensal' as tabela, COUNT(*) as total_registros
FROM frequencia_mensal
UNION ALL
SELECT 'registro_faltas_diarias', COUNT(*)
FROM registro_faltas_diarias
UNION ALL
SELECT 'alertas_faltas_consecutivas', COUNT(*)
FROM alertas_faltas_consecutivas;

-- 2. Adicionar coluna para indicar origem do dado (opcional)
-- Executar apenas se quiser manter controle de origem
ALTER TABLE frequencia_mensal
ADD COLUMN origem VARCHAR(50) DEFAULT 'manual' 
COMMENT 'manual=Lançar Frequência (legado), calculado=faltas diárias';

-- 3. Atualizar registros existentes como 'legado'
UPDATE frequencia_mensal
SET origem = 'legado_lancar_frequencia'
WHERE origem = 'manual' OR origem IS NULL;

-- 4. Verificar consistência (opcional - auditoria)
-- Comparar frequência mensal com cálculo baseado em faltas
SELECT 
    fm.aluno_id,
    fm.mes,
    fm.ano,
    fm.frequencia as freq_mensal,
    ROUND(
        (fm.total_aulas_mes - fm.faltas_nao_justificadas) * 100.0 / fm.total_aulas_mes, 2
    ) as freq_calculada,
    a.nome
FROM frequencia_mensal fm
INNER JOIN alunos a ON fm.aluno_id = a.matricula
WHERE fm.total_aulas_mes > 0
ORDER BY ABS(fm.frequencia - (fm.total_aulas_mes - fm.faltas_nao_justificadas) * 100.0 / fm.total_aulas_mes) DESC
LIMIT 20;

-- 5. Criar VIEW para frequência calculada (OPCIONAL - Futuro)
-- Descomente quando quiser usar a VIEW ao invés da tabela
/*
CREATE OR REPLACE VIEW frequencia_mensal_calculada AS
SELECT 
    aluno_matricula,
    EXTRACT(MONTH FROM data) as mes,
    EXTRACT(YEAR FROM data) as ano,
    COUNT(DISTINCT data) as total_dias_com_registro,
    COUNT(*) as total_faltas,
    COUNT(CASE WHEN justificada = true THEN 1 END) as faltas_justificadas,
    COUNT(CASE WHEN justificada = false THEN 1 END) as faltas_nao_justificadas,
    ROUND(
        (COUNT(DISTINCT data) - COUNT(CASE WHEN justificada = false THEN 1 END)) * 100.0 / 
        NULLIF(COUNT(DISTINCT data), 0), 2
    ) as frequencia,
    JSON_ARRAYAGG(DISTINCT disciplina) as disciplinas
FROM registro_faltas_diarias
GROUP BY aluno_matricula, mes, ano;
*/

-- 6. Resultado final
SELECT 
    'MIGRAÇÃO CONCLUÍDA' as status,
    'Dados de frequencia_mensal marcados como legado' as acao,
    'Use endpoint /alunos/{matricula}/frequencia-mensal para cálculo automático' as proximo_passo;
