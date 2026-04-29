-- ============================================
-- VERIFICAR PREDIÇÕES - FRANCISCO ALVES DA SILVA
-- ============================================
-- Este script verifica TODAS as predições do aluno
-- para identificar qual está sendo mostrada

SELECT 
    '=== PREDIÇÕES DE FRANCISCO ALVES DA SILVA ===' AS info;

SELECT 
    id,
    aluno_id AS matricula,
    risco_evasao AS score,
    nivel_risco AS nivel,
    modelo_ml_versao AS modelo,
    DATE(data_predicao) AS data,
    TIME(data_predicao) AS hora
FROM predicoes
WHERE aluno_id = '2025102015'
ORDER BY data_predicao DESC;

SELECT 
    '=== ÚLTIMA PREDIÇÃO (DEVERIA SER ESTA) ===' AS info;

SELECT 
    id,
    aluno_id AS matricula,
    risco_evasao AS score,
    nivel_risco AS nivel,
    modelo_ml_versao AS modelo,
    DATE(data_predicao) AS data,
    TIME(data_predicao) AS hora
FROM predicoes
WHERE aluno_id = '2025102015'
ORDER BY data_predicao DESC
LIMIT 1;

SELECT 
    '=== QUANTIDADE DE PREDIÇÕES ===' AS info;

SELECT 
    COUNT(*) AS total_predicoes
FROM predicoes
WHERE aluno_id = '2025102015';
